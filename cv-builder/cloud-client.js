// Frontend adapter for the Cloudflare CV API. Requires cloud-config.js to be configured.
(()=>{
 'use strict';
 let selectedId=null,selectedRevision=null,selectedTitle='';
 let token='';
 const storeKey='cv-builder-cloud-session';
 const $=id=>document.getElementById(id);
 const endpoint=()=>String(window.CV_CLOUD_API_URL||'').trim().replace(/\/+$/,'');
 const escHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function notify(msg,kind='info'){
  const el=$('cloud-message');if(!el)return;
  el.textContent=msg;
  el.className='cloud-message '+(kind==='error'?'error':kind==='success'?'success':'');
 }
 function configuration(){
  const ready=/^https:\/\/[a-z0-9][a-z0-9.-]+(?::\d+)?$/i.test(endpoint())&&!endpoint().includes('YOUR_SUBDOMAIN');
  $('cloud-not-ready').classList.toggle('hidden',ready);
  $('cloud-app').classList.toggle('hidden',!ready);
  return ready;
 }
 function saveSession(session){
  token=session.token;
  try{sessionStorage.setItem(storeKey,JSON.stringify({token,phone:session.phone,expiresAt:session.expiresAt}))}catch{}
  showLoggedIn(session.phone);
 }
 function clearSession(){
  token='';selectedId=null;selectedRevision=null;selectedTitle='';
  try{sessionStorage.removeItem(storeKey)}catch{}
  $('cloud-user').textContent='';
  $('cloud-auth').classList.remove('hidden');$('cloud-logged-in').classList.add('hidden');
  $('cloud-list').replaceChildren();
  updateActive();
 }
 function showLoggedIn(phone){
  $('cloud-auth').classList.add('hidden');$('cloud-logged-in').classList.remove('hidden');
  $('cloud-user').textContent=phone||'Signed in';
  updateActive();
 }
 function updateActive(){
  const el=$('cloud-current');
  el.textContent=selectedId?'Selected draft: '+selectedTitle+' (revision '+selectedRevision+')':'No cloud draft selected; Save as new to create one.';
  $('cloud-save-changes').disabled=!selectedId;
 }
 async function cloudApi(path,method='GET',body=null){
  if(!configuration())throw Error('Cloudflare API has not been configured');
  const headers={'Accept':'application/json'};
  if(body!==null)headers['Content-Type']='application/json';
  if(token)headers['Authorization']='Bearer '+token;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const res=await fetch(endpoint()+path,{method,headers,body:body===null?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
   const result=await res.json().catch(()=>({}));
   if(res.status===401&&token){clearSession()}
   if(!res.ok)throw Error(result.error||'Cloud request failed ('+res.status+')');
   return result;
  }catch(e){
   if(e.name==='AbortError')throw Error('Request timed out. Check your Cloudflare Worker');
   if(e instanceof TypeError)throw Error('Cannot connect to Cloudflare API. Check its URL, deployment and allowed origins.');
   throw e;
  }finally{clearTimeout(timer)}
 }
 async function perform(action){
  const buttons=Array.from($('cv-cloud-panel').querySelectorAll('button'));
  buttons.forEach(el=>el.disabled=true);
  try{await action()}catch(e){notify(e.message||String(e),'error')}
  finally{buttons.forEach(el=>el.disabled=false);updateActive()}
 }
 function titleFromEditor(){return String($('cloud-title').value||data.name||'Untitled CV').trim().slice(0,120)||'Untitled CV'}
 async function refresh(){
  const res=await cloudApi('/api/cvs');
  const parent=$('cloud-list');parent.replaceChildren();
  if(!res.cvs.length){parent.textContent='No cloud drafts yet. Choose Save as new to create your first one.';return}
  for(const item of res.cvs){
   const row=document.createElement('div');row.className='cloud-draft';
   const body=document.createElement('div');
   const name=document.createElement('strong');name.textContent=item.title;
   const meta=document.createElement('small');meta.textContent='Updated '+new Date(item.updated_at).toLocaleString()+' | revision '+item.revision;
   body.append(name,meta);const actions=document.createElement('div');actions.className='cloud-draft-actions';
   const load=document.createElement('button');load.type='button';load.className='secondary';load.textContent='Retrieve';
   load.addEventListener('click',()=>cloudRetrieve(item.id));
   const del=document.createElement('button');del.type='button';del.className='danger';del.textContent='Delete';
   del.addEventListener('click',()=>cloudDelete(item.id,item.title));
   actions.append(load,del);row.append(body,actions);parent.append(row);
  }
 }
 async function authenticate(register){
  const phone=$('cloud-phone').value.trim(),password=$('cloud-password').value;
  if(password.length<12){notify('Enter a password with at least 12 characters.','error');return}
  if(register&&password!==$('cloud-password-confirm').value){notify('The confirmation password does not match.','error');return}
  await perform(async()=>{
   const session=await cloudApi(register?'/api/register':'/api/login','POST',{phone,password});
   $('cloud-password').value='';$('cloud-password-confirm').value='';
   saveSession(session);notify('Signed in. Your cloud drafts are ready.','success');await refresh();
  });
 }
 function cloudSaveNew(){
  perform(async()=>{
   const title=titleFromEditor(),cv=cleanCVData(data,false);
   const result=await cloudApi('/api/cvs','POST',{title,cv});
   selectedId=result.id;selectedRevision=result.revision;selectedTitle=result.title;
   $('cloud-title').value=result.title;notify('New CV saved to your Cloudflare account.','success');await refresh();
  });
 }
 function cloudSaveChanges(){
  if(!selectedId){notify('Retrieve an existing CV or select Save as new.','error');return}
  perform(async()=>{
   const result=await cloudApi('/api/cvs/'+selectedId,'PUT',{title:titleFromEditor(),cv:cleanCVData(data,false),revision:selectedRevision});
   selectedRevision=result.revision;selectedTitle=result.title;
   notify('Changes saved to your cloud CV.','success');await refresh();
  });
 }
 function cloudRetrieve(id){
  perform(async()=>{
   const result=await cloudApi('/api/cvs/'+encodeURIComponent(id));
   const load=()=>{
    data={...cleanCVData(result.cv,false),template:['cowi','classic','modern'].includes(result.cv.template)?result.cv.template:'cowi'};
    selectedId=result.id;selectedRevision=result.revision;selectedTitle=result.title;
    $('cloud-title').value=result.title;
    showTab('profile');render();persistLocalDraft('CV retrieved from cloud and saved locally.');
    notify('Retrieved '+result.title+'. You can edit and choose Save changes.','success');
    updateActive();
   };
   showInlineConfirmation('Retrieve "'+result.title+'"? This replaces the current unsaved CV in the editor. Export a JSON backup first if needed.',load);
  });
 }
 function cloudDelete(id,title){
  showInlineConfirmation('Delete the cloud CV "'+title+'"? This cannot be undone.',()=>{
   perform(async()=>{
    await cloudApi('/api/cvs/'+encodeURIComponent(id),'DELETE');
    if(selectedId===id){selectedId=null;selectedRevision=null;selectedTitle=''}
    notify('Cloud draft deleted.','success');await refresh();
   });
  });
 }
 function signOut(){
  perform(async()=>{
   try{await cloudApi('/api/logout','POST')}catch{}
   clearSession();notify('Signed out. Local CV data remains on this device.','success');
  });
 }
 async function resume(){
  let s=null;try{s=JSON.parse(sessionStorage.getItem(storeKey)||'null')}catch{}
  if(!s?.token||!s?.expiresAt||new Date(s.expiresAt).getTime()<=Date.now()){clearSession();return}
  token=s.token;
  try{const who=await cloudApi('/api/me');showLoggedIn(who.phone);await refresh()}
  catch{clearSession()}
 }
 window.toggleCloudPanel=function(){
  const panel=$('cv-cloud-panel'),open=panel.classList.contains('hidden');
  panel.classList.toggle('hidden',!open);
  if(open){configuration();if(!token&&endpoint())resume();panel.scrollIntoView?.({block:'start',behavior:'smooth'})}
 };
 window.cloudRegister=()=>authenticate(true);
 window.cloudLogin=()=>authenticate(false);
 window.cloudSaveNew=cloudSaveNew;
 window.cloudSaveChanges=cloudSaveChanges;
 window.cloudRefresh=()=>perform(async()=>{await refresh();notify('Draft list refreshed.','success')});
 window.cloudSignOut=signOut;
 window.cloudToggleConfirm=function(){const show=$('cloud-register-confirm').classList.toggle('hidden');$('cloud-register-note').textContent=show?'Returning to sign-in.':'Confirm your password before registering.'};
 configuration();
})();
