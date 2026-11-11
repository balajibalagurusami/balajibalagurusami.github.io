import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {IfcAPI} from './vendor/web-ifc-api.js';

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
new ResizeObserver(() => {
  const {clientWidth:w, clientHeight:h} = ui.scene;
  if (!w || !h) return;
  renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix();
}).observe(ui.scene);
renderer.setAnimationLoop(() => {controls.update(); renderer.render(scene,camera);});

const api = new IfcAPI();
api.SetWasmPath(new URL('./vendor/',location.href).href,true);
const ready = api.Init(undefined,true);
const files = {steel:'steel.ifc.gz',full:'full.ifc.gz'};
const ray = new THREE.Raycaster(), cursor = new THREE.Vector2();
let modelId, selected, measuring=false, points=[], busy=false;
function release(container) {
  const geometries=new Set(), materials=new Set();
  container.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());container.clear();
}
function fit(){
  const b=new THREE.Box3().setFromObject(group);
  if(b.isEmpty())return;
  const c=b.getCenter(new THREE.Vector3()), size=b.getSize(new THREE.Vector3()).length();
  controls.target.copy(c);camera.position.copy(c).add(new THREE.Vector3(1,.65,1).normalize().multiplyScalar(size*1.25));controls.update();
}
function select(mesh){
  if(selected)selected.material=selected.userData.original;
  selected=mesh;
  if(mesh)mesh.material=highlight;
  element('comment-context').textContent=mesh?'Attached to IFC #'+mesh.userData.id:'Attached to the current view.';
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
  busy=true;ui.model.disabled=true;ui.status.textContent='Loading model…';
  select(null);release(group);release(marks);points=[];
  try{
    await ready;
    if(modelId!==undefined){api.CloseModel(modelId);modelId=undefined;}
    const response=await fetch('./models/'+files[ui.model.value]);
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
      }
    });
    if(!group.children.length)throw new Error('No displayable geometry');
    group.updateMatrixWorld(true);fit();if(initial)restore();
    ui.status.textContent='Model ready'+(selected?' · IFC element #'+selected.userData.id:'');
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
  const hit=ray.intersectObjects(group.children,false)[0];if(!hit)return;
  if(!measuring){select(hit.object);const item=api.GetLine(modelId,hit.object.userData.id);ui.status.textContent=(item?.Name?.value||'IFC element')+' · #'+hit.object.userData.id;return;}
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
  if(!comments.length){list.textContent='No comments yet.';return;}
  for(const item of [...comments].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){
    const card=document.createElement('article'), body=document.createElement('p'), meta=document.createElement('small'), button=document.createElement('button');
    const view=new URLSearchParams(item.view), id=view.get('element');
    body.textContent=item.text;
    meta.textContent=new Date(item.date).toLocaleString()+' · '+(view.get('model')==='steel'?'Steel + slabs':'Full model')+(id?' · IFC #'+id:'');
    button.textContent='Go to view';
    button.onclick=async()=>{
      if(busy)return;
      if(ui.model.value!==view.get('model')){ui.model.value=view.get('model');await load();}
      if(group.children.length)restore(view);
    };
    card.append(meta,body,button);list.append(card);
  }
}
element('comment-form').onsubmit=event=>{
  event.preventDefault();
  const input=element('comment-text'), text=input.value.trim();
  if(!text)return;
  if(busy||!group.children.length){ui.status.textContent='Load a model before adding a comment.';return;}
  const item={id:crypto.randomUUID(),text,date:new Date().toISOString(),view:new URL(shareUrl()).hash.slice(1)};
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
showComments();
load(true);
