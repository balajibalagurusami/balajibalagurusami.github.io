import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {IfcAPI, IFCRELCONTAINEDINSPATIALSTRUCTURE, IFCRELDEFINESBYTYPE, IFCPRESENTATIONLAYERASSIGNMENT} from './vendor/web-ifc-api.js';

const ui = Object.fromEntries(['scene','model','status','fit','measure','clear','share'].map(id => [id, document.getElementById(id)]));
const element = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#162739');
const camera = new THREE.PerspectiveCamera(48, 1, .05, 3000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
ui.scene.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8799ad, 2.6));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(80, 150, 40);
scene.add(light);
const group = new THREE.Group(), marks = new THREE.Group();
scene.add(group, marks);
const ambientToggle=element('ambient-shadows');
const ambientTarget=new THREE.WebGLRenderTarget(1,1,{depthTexture:new THREE.DepthTexture(1,1)});
const ambientScene=new THREE.Scene(), ambientCamera=new THREE.Camera();
const ambientMaterial=new THREE.ShaderMaterial({
  uniforms:{
    modelColor:{value:ambientTarget.texture},
    modelDepth:{value:ambientTarget.depthTexture},
    pixel:{value:new THREE.Vector2()},
    nearFar:{value:new THREE.Vector2(camera.near,camera.far)},
  },
  depthTest:false,
  depthWrite:false,
  vertexShader:`
    varying vec2 uvPosition;
    void main(){uvPosition=uv;gl_Position=vec4(position.xy,0.,1.);}
  `,
  fragmentShader:`
    varying vec2 uvPosition;
    uniform sampler2D modelColor, modelDepth;
    uniform vec2 pixel, nearFar;
    float distanceAt(vec2 at){
      float d=texture2D(modelDepth,clamp(at,vec2(0.),vec2(1.))).r;
      return nearFar.x*nearFar.y/(nearFar.y-d*(nearFar.y-nearFar.x));
    }
    void main(){
      vec4 color=texture2D(modelColor,uvPosition);
      float center=distanceAt(uvPosition);
      float shadow=0.;
      if(center<nearFar.y*.99){
        float radius=clamp(95./center,3.,18.);
        for(int i=0;i<12;i++){
          float angle=float(i)*2.399963;
          vec2 direction=vec2(cos(angle),sin(angle));
          float offset=radius*(.3+.7*float(i)/11.);
          float delta=center-distanceAt(uvPosition+direction*pixel*offset);
          shadow+=smoothstep(.025,.25,delta)*(1.-smoothstep(.4,2.,delta));
        }
      }
      gl_FragColor=vec4(color.rgb*(1.-.55*shadow/12.),color.a);
      #include <colorspace_fragment>
    }
  `,
});
const ambientQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),ambientMaterial);
ambientQuad.frustumCulled=false;
ambientScene.add(ambientQuad);
function renderModel(){
  if(!ambientToggle.checked){renderer.render(scene,camera);return;}
  renderer.setRenderTarget(ambientTarget);
  renderer.render(scene,camera);
  renderer.setRenderTarget(null);
  renderer.render(ambientScene,ambientCamera);
}
new ResizeObserver(() => {
  const {clientWidth:w, clientHeight:h} = ui.scene;
  if (!w || !h) return;
  renderer.setSize(w,h);
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());
  ambientTarget.setSize(size.x,size.y);
  ambientMaterial.uniforms.pixel.value.set(1/size.x,1/size.y);
  camera.aspect=w/h; camera.updateProjectionMatrix();
}).observe(ui.scene);
renderer.setAnimationLoop(() => {controls.update(); for(const face of sectionFaces)if(face.handle.visible){face.handle.scale.setScalar(Math.max(.05,camera.position.distanceTo(face.handle.position)*.012));face.handle.updateMatrixWorld();} renderModel();});

const api = new IfcAPI();
api.SetWasmPath(new URL('./vendor/',location.href).href,true);
const ready = api.Init(undefined,true);
const files = {steel:'steel.ifc.gz',full:'full.ifc.gz'};
const ray = new THREE.Raycaster(), cursor = new THREE.Vector2();
let modelId, selected, measuring=false, points=[], busy=false;
const byElement=new Map();
let items=[], selectionEdges=false, bounds;
const selectedIds=new Set();
const axes=['x','y','z'];
const sectionBounds=new THREE.Box3();
const sectionFaces=axes.flatMap(axis=>['min','max'].map(side=>{
  const normal=new THREE.Vector3();
  normal[axis]=side==='min'?1:-1;
  const handle=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0x7bf5dc,depthTest:false,depthWrite:false}));
  handle.renderOrder=10;
  scene.add(handle);
  return {axis,side,handle,plane:new THREE.Plane(normal)};
}));
const sectionOutline=new THREE.Box3Helper(sectionBounds,0x7bf5dc);
scene.add(sectionOutline);
sectionOutline.visible=false;
sectionFaces.forEach(face=>face.handle.visible=false);
let sectionDrag;
renderer.localClippingEnabled=true;
function release(container) {
  const geometries=new Set(), materials=new Set();
  container.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());container.clear();
}
function fit(){
  frame(new THREE.Box3().setFromObject(group));
}
function frame(b){
  if(b.isEmpty())return;
  const c=b.getCenter(new THREE.Vector3()), size=b.getSize(new THREE.Vector3()).length();
  controls.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(1,.65,1).normalize().multiplyScalar(size*1.25));controls.update();
}
function select(mesh, additive=false){
  for(const id of selectedIds)for(const part of byElement.get(id)||[]){
    part.material=part.userData.original;
    if(part.userData.edges){part.remove(part.userData.edges);part.userData.edges.geometry.dispose();part.userData.edges.material.dispose();delete part.userData.edges;}
  }
  const id=mesh?.userData.id;
  if(!additive)selectedIds.clear();
  if(id!==undefined){
    if(additive&&selectedIds.has(id))selectedIds.delete(id);
    else selectedIds.add(id);
  }
  selected=byElement.get([...selectedIds].at(-1))?.[0];
  for(const id of selectedIds)for(const part of byElement.get(id)||[]){
    part.material=highlight;
    if(selectionEdges){
      const edge=new THREE.LineSegments(new THREE.EdgesGeometry(part.geometry,20),new THREE.LineBasicMaterial({color:0xe0fff7,clippingPlanes:highlight.clippingPlanes}));
      part.add(edge);part.userData.edges=edge;
    }
  }
  element('section-selection').disabled=!selectedIds.size;
  element('comment-context').textContent=selected?'Attached to IFC #'+selected.userData.id:'Attached to the current view.';
  inspectElement(selected?.userData.id);
}
const highlight=new THREE.MeshStandardMaterial({color:0x62e5c0,side:THREE.DoubleSide});
function shareUrl(){
  const url=new URL(location.href);
  url.hash=new URLSearchParams({model:ui.model.value,camera:camera.position.toArray().map(x=>x.toFixed(4)).join(','),target:controls.target.toArray().map(x=>x.toFixed(4)).join(','),...(selected?{element:String(selected.userData.id)}:{})}).toString();
  return url.href;
}
const saved=new URLSearchParams(location.hash.slice(1));
if(Object.hasOwn(files,saved.get('model')))ui.model.value=saved.get('model');
function restore(view=saved){
  for(const [key,v] of [['camera',camera.position],['target',controls.target]]){
    const values=(view.get(key)||'').split(',').map(Number);
    if(values.length===3&&values.every(Number.isFinite))v.fromArray(values);
  }
  const mesh=group.children.find(o=>String(o.userData.id)===view.get('element'));
  select(mesh);
  controls.update();
}
async function load(initial=false){
  if(busy)return;
  busy=true;ui.model.disabled=true;ui.status.textContent='Loading modelâ€¦';
  select(null);release(group);release(marks);points=[];byElement.clear();items=[];bounds=null;element('section').checked=false;updateSection();drawTree();
  try{
    await ready;
    if(modelId!==undefined){api.CloseModel(modelId);modelId=undefined;}
    const response=await fetch('./models/'+files[ui.model.value]+'?v=cc-2026-11-13-belt-fix');
    if(!response.ok||!response.body)throw new Error('Could not download IFC ('+response.status+')');
    const data=new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    modelId=api.OpenModel(data,{COORDINATE_TO_ORIGIN:false});
    const geometries=new Map(),materials=new Map();
    api.StreamAllMeshes(modelId,flat=>{
      for(let i=0;i<flat.geometries.size();i++){
        const p=flat.geometries.get(i);
        let geometry=geometries.get(p.geometryExpressID);
        if(!geometry){
          const raw=api.GetGeometry(modelId,p.geometryExpressID);
          const v=api.GetVertexArray(raw.GetVertexData(),raw.GetVertexDataSize());
          const pos=new Float32Array(v.length/2),norm=new Float32Array(v.length/2);
          for(let j=0,k=0;j<v.length;j+=6,k+=3){pos.set(v.subarray(j,j+3),k);norm.set(v.subarray(j+3,j+6),k);}
          geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('normal',new THREE.BufferAttribute(norm,3));
          geometry.setIndex(new THREE.BufferAttribute(api.GetIndexArray(raw.GetIndexData(),raw.GetIndexDataSize()).slice(),1));raw.delete();
          geometries.set(p.geometryExpressID,geometry);
        }
        const {x,y,z,w}=p.color,key=[x,y,z,w].join(',');
        if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:new THREE.Color(x,y,z),side:THREE.DoubleSide,opacity:w,transparent:w<.99,depthWrite:w>=.99}));
        const mesh=new THREE.Mesh(geometry,materials.get(key));
        mesh.matrix.fromArray(p.flatTransformation);mesh.matrixAutoUpdate=false;
        mesh.userData={id:flat.expressID,original:mesh.material};group.add(mesh);
        if(!byElement.has(flat.expressID))byElement.set(flat.expressID,[]);
        byElement.get(flat.expressID).push(mesh);
      }
    });
    if(!group.children.length)throw new Error('No displayable geometry');
    group.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(group);sectionBounds.copy(bounds);indexElements();updateSection();fit();if(initial)restore();
    ui.status.textContent='Model ready'+(selected?' Â· IFC element #'+selected.userData.id:'');
  }catch(error){ui.status.textContent=error.message;console.error(error);}
  finally{busy=false;ui.model.disabled=false;}
}
let start;
renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{
  if(e.button!==0||!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
  const r=renderer.domElement.getBoundingClientRect();
  cursor.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
  ray.setFromCamera(cursor,camera);
  const hit=ray.intersectObjects(group.children,false).find(hit=>hit.object.visible&&(!element('section').checked||sectionBounds.containsPoint(hit.point)));if(!hit)return;
  if(!measuring){select(hit.object,e.shiftKey);const item=api.GetLine(modelId,hit.object.userData.id);ui.status.textContent=(item?.Name?.value||'IFC element')+' Â· #'+hit.object.userData.id;return;}
  points.push(hit.point.clone());
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshBasicMaterial({color:0xffcd69,depthTest:false}));dot.position.copy(hit.point);marks.add(dot);
  if(points.length===1){ui.status.textContent='Select the second measurement point.';return;}
  const [a,b]=points;marks.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffcd69,depthTest:false})));
  ui.status.textContent='Distance '+a.distanceTo(b).toFixed(3)+' m';points=[];
});
ui.model.onchange=()=>load();
ui.fit.onclick=fit;
ui.measure.onclick=()=>{measuring=!measuring;points=[];ui.measure.setAttribute('aria-pressed',String(measuring));ui.status.textContent=measuring?'Select two surface points.':'Click an IFC element to select it.';};
ui.clear.onclick=()=>{release(marks);points=[];ui.status.textContent='Measurements cleared.';};
ui.share.onclick=async()=>{try{await navigator.clipboard.writeText(shareUrl());ui.status.textContent='Review link copied.';}catch{window.prompt('Copy this review link',shareUrl());}};
const commentKey='wilp:steel-model:fitted-rev-b:comments';
const reviewEndpoint='/api/classmates/steel-review';
const schoolHost=element('school-signin');
let shared=false, sharedReady=false, sharedComments=[], replyTo=null, commentPending=false;
let comments=[];
try {const savedComments=JSON.parse(localStorage.getItem(commentKey)||'[]'); if(Array.isArray(savedComments))comments=savedComments.filter(validComment);}
catch {ui.status.textContent='Saved comments could not be read.';}
function validComment(item){
  if(!item||typeof item.id!=='string'||typeof item.text!=='string'||item.text.length>4000||
     typeof item.view!=='string'||item.view.length>1000||typeof item.date!=='string'||!Number.isFinite(Date.parse(item.date)))return false;
  const view=new URLSearchParams(item.view);
  return Object.hasOwn(files,view.get('model'))&&['camera','target'].every(key=>{
    const values=(view.get(key)||'').split(',');
    return values.length===3&&values.every(value=>value.trim()&&Number.isFinite(Number(value)));
  });
}
function saveComments(next){
  try{localStorage.setItem(commentKey,JSON.stringify(next));comments=next;showComments();return true;}
  catch{ui.status.textContent='Could not save comments in this browser.';return false;}
}
function showComments(){
  const list=element('comment-list');list.replaceChildren();
  const active=shared?sharedComments:comments;
  if(!active.length){list.textContent=shared&&!sharedReady?'':'No comments yet.';return;}
  const parents=new Set(active.filter(item=>!item.parent).map(item=>item.id));
  function makeCard(item){
    const card=document.createElement('article'), body=document.createElement('p'), meta=document.createElement('small'), button=document.createElement('button');
    const view=new URLSearchParams(item.view), id=view.get('element');
    if(shared){
      const pattern=/@[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*bits-pilani\.ac\.in(?![\w-]|\.[a-z0-9])/gi;
      let offset=0;
      for(const match of item.text.matchAll(pattern)){
        const tag=document.createElement('strong');
        tag.textContent=match[0];
        body.append(item.text.slice(offset,match.index),tag);
        offset=match.index+match[0].length;
      }
      body.append(item.text.slice(offset));
    }else body.textContent=item.text;
    meta.textContent=(shared?item.author+' Â· ':'')+new Date(item.date).toLocaleString()+' Â· '+(view.get('model')==='steel'?'Steel + slabs':'Full model')+(id?' Â· IFC #'+id:'');
    button.textContent='Go to view';
    button.onclick=async()=>{
      if(busy)return;
      if(ui.model.value!==view.get('model')){ui.model.value=view.get('model');await load();}
      if(group.children.length)restore(view);
    };
    card.append(meta,body,button);
    if(shared&&!item.parent){
      const reply=document.createElement('button');reply.textContent='Reply';
      reply.onclick=()=>{replyTo=item.id;element('comment-label').textContent='Reply to '+item.author;element('cancel-reply').hidden=false;element('comment-text').focus();};
      card.append(' ',reply);
    }
    return card;
  }
  for(const item of [...active].filter(item=>!shared||!parents.has(item.parent)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){
    const card=makeCard(item);
    if(shared){
      for(const reply of active.filter(r=>r.parent===item.id).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))){
        const nested=makeCard(reply);nested.style.marginInlineStart='12px';card.append(nested);
      }
    }
    list.append(card);
  }
}
function resetReply(){
  replyTo=null;element('comment-label').textContent='Comment on the current view';element('cancel-reply').hidden=true;
}
function updateCommentControls(){
  element('shared-comments').setAttribute('aria-pressed',String(shared));
  element('local-comments').setAttribute('aria-pressed',String(!shared));
  element('local-actions').hidden=shared;element('shared-actions').hidden=!shared;
  element('comment-mode-note').textContent=shared?'Visible to signed-in WILP reviewers. Type @ to find a classmate or enter a full BITS email.':'Saved in this browser. Export a review file to share comments.';
  element('submit-comment').textContent=shared?'Post shared comment':'Add comment';
  element('submit-comment').disabled=commentPending||(shared&&!sharedReady);
  showComments();
}
async function reviewRequest(options){
  const response=await fetch(reviewEndpoint,{credentials:'include',cache:'no-store',...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Object.assign(new Error(data.error||'Shared comments could not be reached.'),{status:response.status});
  return data;
}
let googleScript;
async function showSchoolSignIn(){
  if(location.origin!=='https://wilp.aecbim.work')return;
  googleScript??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';
    script.onload=resolve;
    script.onerror=()=>{script.remove();googleScript=null;reject(new Error('Could not load Google sign-in.'))};
    document.head.append(script);
  });
  await googleScript;
  if(!shared||sharedReady)return;
  window.google.accounts.id.initialize({
    client_id:'810186188567-7a1mrhng391pmdjjtuemjefekoi9cg48.apps.googleusercontent.com',
    hd:'wilp.bits-pilani.ac.in',
    callback:async ({credential})=>{
      element('comment-error').textContent='Signing inâ€¦';
      try{
        const response=await fetch('/api/classmates/auth/google',{
          method:'POST',credentials:'include',headers:{'Content-Type':'text/plain;charset=UTF-8'},
          body:JSON.stringify({credential})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.authenticated)throw new Error(data.error||'School sign-in was not accepted.');
        if(shared)await refreshShared();
      }catch(error){
        if(shared)element('comment-error').textContent=error.message;
      }
    }
  });
  schoolHost.replaceChildren();
  window.google.accounts.id.renderButton(schoolHost,{theme:'filled_black',size:'large',text:'signin_with',shape:'rectangular'});
}
async function refreshShared(){
  element('comment-error').textContent='Loading shared commentsâ€¦';
  try{
    const data=await reviewRequest();
    sharedComments=data.comments.filter(validComment);sharedReady=true;schoolHost.replaceChildren();
    if(shared)element('comment-error').textContent='';
  }catch(error){
    sharedReady=false;sharedComments=[];
    if(shared){
      element('comment-error').textContent=error.message;
      if(error.status===401)showSchoolSignIn().catch(signInError=>{
        if(shared&&!sharedReady)element('comment-error').textContent=signInError.message;
      });
    }
  }
  updateCommentControls();
}
function captureCommentView(){
  renderModel();
  const source=renderer.domElement, snapshot=document.createElement('canvas');
  const scale=Math.min(1,1000/Math.max(source.width,source.height));
  snapshot.width=Math.max(1,Math.round(source.width*scale));
  snapshot.height=Math.max(1,Math.round(source.height*scale));
  snapshot.getContext('2d').drawImage(source,0,0,snapshot.width,snapshot.height);
  return snapshot.toDataURL('image/jpeg',0.72).split(',')[1];
}
const mentionInput=element('comment-text');
const mentionOptions=element('mention-options');
let mentionTimer, mentionSearch;
function closeMentions(){
  clearTimeout(mentionTimer);
  mentionSearch?.abort();
  mentionOptions.hidden=true;
  mentionOptions.replaceChildren();
}
mentionInput.addEventListener('input',()=>{
  closeMentions();
  if(!shared||!sharedReady)return;
  const end=mentionInput.selectionStart;
  const match=/(?:^|\s)@([^\n@]{2,100}(?:@[^\s@]*)?)$/.exec(mentionInput.value.slice(0,end));
  if(!match)return;
  const start=end-match[1].length-1;
  if(!match[1].trim())return;
  mentionTimer=setTimeout(async()=>{
    const search=new AbortController();
    mentionSearch=search;
    try{
      const response=await fetch(reviewEndpoint+'?mention='+encodeURIComponent(match[1]),{
        credentials:'include',cache:'no-store',signal:search.signal,
      });
      if(!response.ok)return;
      const {people}=await response.json();
      if(search.signal.aborted)return;
      for(const {name,email} of people){
        if(!/^[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*bits-pilani\.ac\.in$/i.test(email))continue;
        const button=document.createElement('button');
        button.type='button';button.textContent=name?name+' Â· '+email:email;
        button.onclick=()=>{
          mentionInput.setRangeText('@'+email+' ',start,end,'end');
          closeMentions();mentionInput.focus();
        };
        mentionOptions.append(button);
      }
      mentionOptions.hidden=!mentionOptions.childElementCount;
    }catch{}
  },200);
});
mentionInput.addEventListener('keydown',event=>{
  if(event.key==='Escape')closeMentions();
});
function changeCommentMode(mode){
  if(commentPending)return;
  if(shared!==mode)element('comment-text').value='';
  closeMentions();shared=mode;resetReply();element('comment-error').textContent='';updateCommentControls();
  if(shared)refreshShared();
}
element('shared-comments').onclick=()=>changeCommentMode(true);
element('local-comments').onclick=()=>changeCommentMode(false);
element('refresh-comments').onclick=refreshShared;
element('cancel-reply').onclick=resetReply;
element('comment-form').onsubmit=async event=>{
  event.preventDefault();
  closeMentions();
  const input=element('comment-text'), text=input.value.trim();
  if(!text)return;
  if(busy||!group.children.length){ui.status.textContent='Load a model before adding a comment.';return;}
  const item={id:crypto.randomUUID(),text,date:new Date().toISOString(),view:new URL(shareUrl()).hash.slice(1)};
  if(shared){
    if(!sharedReady||commentPending)return;
    commentPending=true;updateCommentControls();
    try{
      const snapshot=/(?:^|\s)@[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*bits-pilani\.ac\.in(?![\w-]|\.[a-z0-9])/i.test(text)?captureCommentView():undefined;
      const {comment,notification}=await reviewRequest({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,view:item.view,parent:replyTo,snapshot})});
      if(!validComment(comment))throw new Error('The server returned an invalid comment.');
      sharedComments=[comment,...sharedComments];input.value='';resetReply();element('comment-error').textContent=notification||'';
    }catch(error){element('comment-error').textContent=error.message;}
    finally{commentPending=false;updateCommentControls();}
    return;
  }
  if(saveComments([...comments,item]))input.value='';
};
element('export-comments').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,comments},null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='wilp-steel-review.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
element('import-comments').onclick=()=>element('comment-file').click();
element('comment-file').onchange=async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  try{
    if(file.size>2_000_000)throw new Error('Review file is too large.');
    const data=JSON.parse(await file.text());
    if(data.version!==1||!Array.isArray(data.comments)||!data.comments.every(validComment))throw new Error('Invalid review file.');
    const merged=new Map(comments.map(item=>[item.id,item]));
    for(const item of data.comments)if(!merged.has(item.id))merged.set(item.id,item);
    if(saveComments([...merged.values()]))ui.status.textContent='Review comments imported.';
  }catch(error){ui.status.textContent=error.message;}
};
updateCommentControls();

function valueOf(raw){
  if(raw==null)return '';
  if(Array.isArray(raw))return raw.map(valueOf).filter(Boolean).join(', ');
  if(typeof raw==='object')return raw.value!==undefined?String(raw.value):'';
  return String(raw);
}
function indexElements(){
  const storeys=new Map();
  const relationships=api.GetLineIDsWithType(modelId,IFCRELCONTAINEDINSPATIALSTRUCTURE);
  for(let i=0;i<relationships.size();i++){
    const rel=api.GetLine(modelId,relationships.get(i));
    const structure=api.GetLine(modelId,rel.RelatingStructure.value);
    const name=valueOf(structure.Name)||'Spatial group #'+structure.expressID;
    for(const ref of rel.RelatedElements||[])storeys.set(ref.value,name);
  }
  const types=new Map(), layers=new Map();
  function eachLine(code, visit){
    const ids=api.GetLineIDsWithType(modelId,code);
    for(let i=0;i<ids.size();i++)visit(api.GetLine(modelId,ids.get(i)));
  }
  eachLine(IFCRELDEFINESBYTYPE,rel=>{
    const type=api.GetLine(modelId,rel.RelatingType.value);
    const name=valueOf(type.Name)||api.GetNameFromTypeCode(type.type);
    for(const ref of rel.RelatedObjects||[])types.set(ref.value,name);
  });
  eachLine(IFCPRESENTATIONLAYERASSIGNMENT,layer=>{
    const name=valueOf(layer.Name)||'Layer #'+layer.expressID;
    for(const ref of layer.AssignedItems||[]){
      if(!layers.has(ref.value))layers.set(ref.value,new Set());
      layers.get(ref.value).add(name);
    }
  });
  function elementLayers(line){
    if(!layers.size)return ['Unassigned'];
    const names=new Set(), visited=new Set();
    function visit(ref){
      const id=ref?.value;
      if(!id||visited.has(id))return;
      visited.add(id);
      for(const name of layers.get(id)||[])names.add(name);
      const entity=api.GetLine(modelId,id);
      for(const child of entity?.Representations||entity?.Items||[])visit(child);
      if(entity?.MappingSource)visit(api.GetLine(modelId,entity.MappingSource.value)?.MappedRepresentation);
    }
    visit(line.Representation);
    return names.size?[...names]:['Unassigned'];
  }
  items=[...byElement.keys()].map(id=>{
    const line=api.GetLine(modelId,id),category=api.GetNameFromTypeCode(line.type).toUpperCase();
    return {id,category,storey:storeys.get(id)||'Unassigned',name:valueOf(line.Name)||category,type:types.get(id)||valueOf(line.ObjectType)||'Unassigned',layer:elementLayers(line)};
  });
  drawTree();
}
let visibilityControls=[];
function updateVisibility(){
  for(const {check, entries} of visibilityControls){
    const visible=entries.filter(item=>byElement.get(item.id)?.some(part=>part.visible)).length;
    check.checked=visible===entries.length;
    check.indeterminate=visible>0&&visible<entries.length;
  }
}
function drawTree(){
  const root=element('tree'),query=element('element-search').value.trim().toLowerCase();
  root.replaceChildren();visibilityControls=[];
  const key=element('tree-group').value,groups=new Map();
  for(const item of items){
    if(![item.name,item.category,item.storey,item.type,...item.layer,String(item.id)].some(s=>s.toLowerCase().includes(query)))continue;
    for(const name of key==='layer'?item.layer:[item[key]]){
      if(!groups.has(name))groups.set(name,[]);
      groups.get(name).push(item);
    }
  }
  for(const [name,entries] of [...groups].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}))){
    const details=document.createElement('details'),title=document.createElement('summary');
    const check=document.createElement('input');
    check.type='checkbox';check.setAttribute('aria-label','Show '+name);
    check.addEventListener('click',event=>event.stopPropagation());
    check.addEventListener('change',()=>{
      for(const item of entries)byElement.get(item.id).forEach(part=>part.visible=check.checked);
      if(selected&&!selected.visible)select(null);
      updateVisibility();
    });
    visibilityControls.push({check,entries});
    title.append(check,document.createTextNode(' '+name+' ('+entries.length+')'));details.append(title);
    details.addEventListener('toggle',()=>{
      if(!details.open||details.children.length>1)return;
      for(const item of entries){
        const button=document.createElement('button');button.type='button';button.textContent=item.name+' Â· #'+item.id;
        button.onclick=event=>{const parts=byElement.get(item.id);parts.forEach(p=>p.visible=true);select(parts[0],event.shiftKey);updateVisibility();};
        details.append(button);
      }
    });
    root.append(details);
  }
  updateVisibility();
  if(!groups.size)root.textContent=items.length?'No matching elements.':'Load a model to browse elements.';
}
let inspection=0;
async function inspectElement(id){
  const token=++inspection,panel=element('properties');panel.replaceChildren();
  if(id==null){panel.textContent='Select an IFC element.';return;}
  function appendSet(title,values){
    const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('dl');
    summary.textContent=title;details.append(summary,list);details.open=true;
    for(const [key,value] of values){
      if(value==='')continue;
      const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;list.append(dt,dd);
    }
    panel.append(details);
  }
  try{
    const line=api.GetLine(modelId,id);
    appendSet('IFC attributes',[['Category',api.GetNameFromTypeCode(line.type).toUpperCase()],['Local ID',String(id)],...['GlobalId','Name','Description','ObjectType','Tag','PredefinedType'].map(k=>[k,valueOf(line[k])])]);
    const sets=await api.properties.getPropertySets(modelId,id,true,true);
    if(token!==inspection)return;
    for(const set of sets){
      const values=(set.HasProperties||set.Quantities||[]).map(p=>[valueOf(p.Name),valueOf(p.NominalValue??p.LengthValue??p.AreaValue??p.VolumeValue??p.CountValue??p.WeightValue??p.ListValues??p.EnumerationValues)]);
      if(values.some(([,v])=>v!==''))appendSet(valueOf(set.Name)||'IFC property set',values);
    }
  }catch(error){
    if(token===inspection){const note=document.createElement('p');note.textContent='Some IFC properties could not be read.';panel.append(note);}
    console.warn(error);
  }
}
function updateSection(){
  const active=Boolean(bounds&&element('section').checked);
  sectionOutline.visible=active;
  const center=sectionBounds.getCenter(new THREE.Vector3());
  for(const {axis,side,handle,plane} of sectionFaces){
    handle.visible=active;
    if(!active)continue;
    handle.position.copy(center);
    handle.position[axis]=sectionBounds[side][axis];
    plane.constant=-plane.normal[axis]*handle.position[axis];
  }
  const planes=active?sectionFaces.map(face=>face.plane):[];
  const materials=new Set([highlight,...group.children.map(part=>part.userData.original)]);
  for(const part of group.children)if(part.userData.edges)materials.add(part.userData.edges.material);
  for(const material of materials){
    const changed=material.clippingPlanes?.length!==planes.length;
    material.clippingPlanes=planes;
    if(changed)material.needsUpdate=true;
  }
}
function selectionBounds(){
  const box=new THREE.Box3();
  for(const id of selectedIds)for(const part of byElement.get(id))box.expandByObject(part);
  return box;
}
function setSection(box){
  if(!bounds||box.isEmpty())return;
  sectionBounds.copy(box).expandByScalar(Math.max(.15,box.getSize(new THREE.Vector3()).length()*.02));
  element('section').checked=true;
  updateSection();
}
const canvas=renderer.domElement;
function sectionPointer(event){
  const rect=canvas.getBoundingClientRect();
  cursor.set(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height);
  ray.setFromCamera(cursor,camera);
}
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!sectionOutline.visible)return;
  sectionPointer(event);
  const hit=ray.intersectObjects(sectionFaces.map(face=>face.handle))[0];
  if(!hit)return;
  const face=sectionFaces.find(face=>face.handle===hit.object);
  const p=face.handle.position.clone(), q=p.clone();
  q[face.axis]+=1;
  const rect=canvas.getBoundingClientRect();
  p.project(camera);q.project(camera);
  let dx=(q.x-p.x)*rect.width/2,dy=(p.y-q.y)*rect.height/2;
  if(dx*dx+dy*dy<.25){
    dx=0;
    dy=-rect.height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(face.handle.position));
  }
  sectionDrag={face,dx,dy,x:event.clientX,y:event.clientY,value:sectionBounds[face.side][face.axis]};
  controls.enabled=false;
  canvas.setPointerCapture(event.pointerId);
  event.stopImmediatePropagation();
},true);
canvas.addEventListener('pointermove',event=>{
  if(!sectionDrag)return;
  const {face,dx,dy,x,y,value}=sectionDrag;
  const {axis,side}=face;
  const shift=((event.clientX-x)*dx+(event.clientY-y)*dy)/(dx*dx+dy*dy);
  const limit=side==='min'?sectionBounds.max[axis]-.02:sectionBounds.min[axis]+.02;
  sectionBounds[side][axis]=side==='min'?Math.min(value+shift,limit):Math.max(value+shift,limit);
  updateSection();
});
function endSectionDrag(event){
  if(!sectionDrag)return;
  sectionDrag=null;
  controls.enabled=true;
  start=null;
  event.stopImmediatePropagation();
}
canvas.addEventListener('pointerup',endSectionDrag,true);
canvas.addEventListener('pointercancel',endSectionDrag,true);
element('section-model').onclick=()=>{if(bounds)setSection(bounds);};
element('section-selection').onclick=()=>setSection(selectionBounds());
element('section').onchange=updateSection;
element('element-search').oninput=drawTree;
element('tree-group').onchange=drawTree;
element('focus').onclick=()=>{if(selected){frame(selectionBounds());}};
element('hide').onclick=()=>{if(selected){for(const id of selectedIds)byElement.get(id).forEach(p=>p.visible=false);select(null);updateVisibility();}};
element('isolate').onclick=()=>{if(selected){group.children.forEach(p=>p.visible=selectedIds.has(p.userData.id));updateVisibility();}};
element('show').onclick=()=>{group.children.forEach(p=>p.visible=true);updateVisibility();};
element('edges').onclick=()=>{selectionEdges=!selectionEdges;element('edges').setAttribute('aria-pressed',String(selectionEdges));const ids=[...selectedIds];select(null);for(const id of ids)select(byElement.get(id)[0],true);};
load(true);
