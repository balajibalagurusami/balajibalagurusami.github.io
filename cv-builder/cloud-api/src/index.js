// Cloudflare Worker: phone/password accounts and owner-scoped CV storage in D1.
// No secrets or credentials belong in this source file.
const TTL=7*24*60*60;
const KDF_ITERATIONS=310000;
const MAX_JSON=400000;
const LIMIT_WINDOW=15*60;
const enc=new TextEncoder();
function json(body,status=200,headers={}) {
  const actualHeaders=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  for(const [name,value] of new Headers(headers))actualHeaders.set(name,value);
  return new Response(JSON.stringify(body),{status,headers:actualHeaders});
}
function b64(data){let str='';for(const b of data)str+=String.fromCharCode(b);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')}
function fromB64(raw){const s=raw.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))}
function rand(n=32){return b64(crypto.getRandomValues(new Uint8Array(n)))}
async function digest(s){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))))}
async function passwordHash(password,salt,iterations=KDF_ITERATIONS){
  const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromB64(salt),iterations},key,256);
  return b64(new Uint8Array(bits));
}
function equal(a,b){const x=enc.encode(a),y=enc.encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0}
function phoneNumber(raw){
  const s=String(raw||'').replace(/[\s().-]/g,'');
  const n=/^\d{10}$/.test(s)?'+91'+s:s.startsWith('00')?'+'+s.slice(2):s;
  return /^\+[1-9]\d{7,14}$/.test(n)?n:null;
}
function passwordOk(p){return typeof p==='string'&&p.length>=12&&p.length<=128}
function now(){return new Date().toISOString()}
function noStore(status=204){return new Response(null,{status,headers:{'Cache-Control':'no-store'}})}
async function parseBody(req,max=MAX_JSON){
  if(Number(req.headers.get('content-length')||0)>max)throw {status:413,message:'Request too large'};
  const text=await req.text();
  if(enc.encode(text).byteLength>max)throw {status:413,message:'Request too large'};
  try{return JSON.parse(text)}catch{throw {status:400,message:'Expected valid JSON'}}
}
function allowOrigin(request,env){
  const origin=request.headers.get('Origin');
  const allowed=String(env.ALLOWED_ORIGINS||'https://balajibalagurusami.github.io')
    .split(',').map(x=>x.trim()).filter(Boolean);
  return origin&&allowed.includes(origin)?origin:null;
}
function cors(h,origin){if(origin){h.set('Access-Control-Allow-Origin',origin);h.set('Vary','Origin');h.set('Access-Control-Allow-Headers','Authorization, Content-Type');h.set('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');h.set('Access-Control-Max-Age','600')}return h}
async function throttle(env,label,identity,max){
  const key=await digest(label+':'+identity);
  const epoch=Math.floor(Date.now()/1000);
  await env.DB.prepare(
    'INSERT INTO login_limits (key,window_start,hits) VALUES (?,?,1) '+
    'ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN window_start<? THEN 1 ELSE hits+1 END, '+
    'window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END'
  ).bind(key,epoch,epoch-LIMIT_WINDOW,epoch-LIMIT_WINDOW).run();
  const row=await env.DB.prepare('SELECT hits FROM login_limits WHERE key=?').bind(key).first();
  if(row&&row.hits>max)throw {status:429,message:'Too many attempts. Try again in 15 minutes.'};
}
async function applyThrottle(env,request,phone){
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';
  await throttle(env,'ip',ip,40);
  await throttle(env,'phone',phone,12);
}
async function createSession(env,user){
  const token=rand(32),id=crypto.randomUUID(),expiry=Math.floor(Date.now()/1000)+TTL;
  await env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)')
    .bind(id,user.id,await digest(token),expiry,now()).run();
  return {token,expiresAt:new Date(expiry*1000).toISOString(),phone:user.phone};
}
async function authorized(request,env){
  const match=/^Bearer ([A-Za-z0-9_-]{30,200})$/.exec(request.headers.get('Authorization')||'');
  if(!match)throw {status:401,message:'Please log in'};
  const tokenHash=await digest(match[1]);
  const s=await env.DB.prepare('SELECT sessions.id as session_id,users.id as user_id,users.phone as phone FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?')
    .bind(tokenHash,Math.floor(Date.now()/1000)).first();
  if(!s)throw {status:401,message:'Session expired. Please log in again'};
  return s;
}
function safeTitle(v){const x=String(v||'Untitled CV').trim();return x.length<=120?x:x.slice(0,120)}
async function route(req,env,url){
  const path=url.pathname.replace(/\/+$/,'')||'/';
  const method=req.method;
  if(path==='/health'&&method==='GET')return json({ok:true,service:'cv-cloud-api'});
  if(!env.DB)throw {status:503,message:'Cloud database not configured'};
  if(path==='/api/register'&&method==='POST'){
    const body=await parseBody(req,3000),phone=phoneNumber(body.phone);
    if(!phone||!passwordOk(body.password))throw {status:400,message:'Enter a valid mobile number and password of 12–128 characters'};
    await applyThrottle(env,req,phone);
    const salt=rand(16),hash=await passwordHash(body.password,salt);
    const user={id:crypto.randomUUID(),phone};
    try{await env.DB.prepare('INSERT INTO users(id,phone,password_salt,password_hash,password_iterations,created_at) VALUES(?,?,?,?,?,?)')
      .bind(user.id,phone,salt,hash,KDF_ITERATIONS,now()).run()}
    catch(err){
      if(/UNIQUE|constraint/i.test(String(err)))throw {status:409,message:'This mobile number is already registered'};
      throw err;
    }
    return json(await createSession(env,user),201);
  }
  if(path==='/api/login'&&method==='POST'){
    const body=await parseBody(req,3000),phone=phoneNumber(body.phone);
    if(!phone||typeof body.password!=='string'||body.password.length>128)throw {status:400,message:'Invalid mobile number or password'};
    await applyThrottle(env,req,phone);
    const user=await env.DB.prepare('SELECT id,phone,password_salt,password_hash,password_iterations FROM users WHERE phone=?').bind(phone).first();
    // Derive even for a nonexistent user to reduce account-enumeration timing differences.
    const computed=await passwordHash(body.password,user?.password_salt||rand(16),user?.password_iterations||KDF_ITERATIONS);
    if(!user||!equal(computed,user.password_hash))throw {status:401,message:'Invalid mobile number or password'};
    return json(await createSession(env,user));
  }
  const auth=await authorized(req,env);
  if(path==='/api/me'&&method==='GET')return json({phone:auth.phone});
  if(path==='/api/logout'&&method==='POST'){
    await env.DB.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').bind(auth.session_id,auth.user_id).run();
    return json({ok:true});
  }
  if(path==='/api/cvs'&&method==='GET'){
    const rows=await env.DB.prepare('SELECT id,title,revision,created_at,updated_at FROM cvs WHERE user_id=? ORDER BY updated_at DESC LIMIT 100')
      .bind(auth.user_id).all();
    return json({cvs:rows.results||[]});
  }
  if(path==='/api/cvs'&&method==='POST'){
    const body=await parseBody(req);
    if(!body.cv||typeof body.cv!=='object'||Array.isArray(body.cv)||!Array.isArray(body.cv.projects)||!Array.isArray(body.cv.work)||!Array.isArray(body.cv.education))
      throw {status:400,message:'Invalid CV document'};
    const payload=JSON.stringify(body.cv);
    if(enc.encode(payload).byteLength>MAX_JSON)throw {status:413,message:'CV document is too large'};
    const id=crypto.randomUUID(),ts=now(),title=safeTitle(body.title||body.cv.name);
    await env.DB.prepare('INSERT INTO cvs(id,user_id,title,cv_json,revision,created_at,updated_at) VALUES(?,?,?,?,1,?,?)')
      .bind(id,auth.user_id,title,payload,ts,ts).run();
    return json({id,title,revision:1,updated_at:ts},201);
  }
  const matched=/^\/api\/cvs\/([a-f0-9-]{36})$/.exec(path);
  if(matched){
    const id=matched[1];
    if(method==='GET'){
      const cv=await env.DB.prepare('SELECT id,title,cv_json,revision,updated_at FROM cvs WHERE id=? AND user_id=?').bind(id,auth.user_id).first();
      if(!cv)throw {status:404,message:'CV not found'};
      return json({id:cv.id,title:cv.title,cv:JSON.parse(cv.cv_json),revision:cv.revision,updated_at:cv.updated_at});
    }
    if(method==='PUT'){
      const body=await parseBody(req);
      if(!body.cv||typeof body.cv!=='object'||Array.isArray(body.cv)||!Array.isArray(body.cv.projects)||!Array.isArray(body.cv.work)||!Array.isArray(body.cv.education))
        throw {status:400,message:'Invalid CV document'};
      const payload=JSON.stringify(body.cv);
      if(enc.encode(payload).byteLength>MAX_JSON)throw {status:413,message:'CV document is too large'};
      const ts=now(),title=safeTitle(body.title||body.cv.name),revision=Number(body.revision);
      if(!Number.isSafeInteger(revision)||revision<1)throw {status:400,message:'Revision required'};
      const result=await env.DB.prepare('UPDATE cvs SET title=?,cv_json=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=?')
        .bind(title,payload,ts,id,auth.user_id,revision).run();
      if(!result.meta?.changes){
        const existing=await env.DB.prepare('SELECT id FROM cvs WHERE id=? AND user_id=?').bind(id,auth.user_id).first();
        throw existing?{status:409,message:'This CV was updated elsewhere. Retrieve the latest copy before saving.'}:{status:404,message:'CV not found'};
      }
      return json({id,title,revision:revision+1,updated_at:ts});
    }
    if(method==='DELETE'){
      const result=await env.DB.prepare('DELETE FROM cvs WHERE id=? AND user_id=?').bind(id,auth.user_id).run();
      if(!result.meta?.changes)throw {status:404,message:'CV not found'};
      return json({ok:true});
    }
  }
  throw {status:404,message:'Not found'};
}
export default {
 async fetch(request,env){
  const origin=allowOrigin(request,env),headers=new Headers();
  cors(headers,origin);
  if(request.method==='OPTIONS'){
    if(!origin)return json({error:'Origin not allowed'},403);
    return new Response(null,{status:204,headers});
  }
  // Reject browser-origin requests from unknown sites; non-browser clients with bearer tokens still work.
  if(request.headers.has('Origin')&&!origin)return json({error:'Origin not allowed'},403);
  try{
    const response=await route(request,env,new URL(request.url));
    const copy=new Response(response.body,response);
    for(const [k,v] of headers)copy.headers.set(k,v);
    copy.headers.set('Referrer-Policy','no-referrer');
    copy.headers.set('X-Content-Type-Options','nosniff');
    return copy;
  }catch(error){
    const status=Number.isInteger(error?.status)?error.status:500;
    if(status>=500)console.error('CV API error',String(error?.message||error).slice(0,160));
    const response=json({error:status>=500?'Server error':String(error?.message||'Request failed')},status,headers);
    response.headers.set('Referrer-Policy','no-referrer');
    return response;
  }
 }
};
