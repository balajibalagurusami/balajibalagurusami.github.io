const origin = 'https://wilp.aecbim.work';
const endpoint = '/api/classmates/steel-review';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  Vary: 'Origin',
};
const json = (value, status = 200) => Response.json(value, {status, headers});

function validView(value) {
  if (typeof value !== 'string' || value.length > 1000) return false;
  const view = new URLSearchParams(value);
  if (!['steel', 'full'].includes(view.get('model'))) return false;
  if (view.has('element') && !/^\d{1,12}$/.test(view.get('element'))) return false;
  return ['camera', 'target'].every(key => {
    const coordinates = (view.get(key) || '').split(',');
    return coordinates.length === 3 && coordinates.every(part => part.trim() && Number.isFinite(Number(part)));
  });
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== endpoint) return json({error:'Not found'}, 404);
    const requestOrigin = request.headers.get('Origin');
    if (requestOrigin !== origin && (request.method !== 'GET' || requestOrigin)) return json({error:'Open the WILP viewer to continue.'}, 403);
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
    if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'}, 405);
    try {
      const cookie = request.headers.get('Cookie');
      if (!cookie) return json({error:'Sign in with your BITS WILP Google account to use shared comments.'}, 401);
      const auth = await env.WILP_AUTH.fetch('https://wilp.aecbim.work/api/classmates/me', {headers:{Cookie:cookie,Origin:origin,Accept:'application/json'}});
      if (!auth.ok) return json({error:'Could not verify the WILP session.'}, auth.status === 401 ? 401 : 503);
      const session = await auth.json();
      if (session.authenticated !== true || !session.user?.email?.toLowerCase().endsWith('@wilp.bits-pilani.ac.in')) return json({error:'Sign in with your BITS WILP Google account to use shared comments.'}, 401);
      const query = new URL(request.url).searchParams.get('mention');
      if (request.method === 'GET' && query !== null) {
        const term = query.trim().toLowerCase();
        if (term.length < 2 || term.length > 100) return json({people:[]});
        const directory = await env.WILP_AUTH.fetch('https://wilp.aecbim.work/api/classmates', {
          headers:{Cookie:cookie,Origin:origin,Accept:'application/json'},
        });
        if (!directory.ok) return json({error:'The classmate directory is unavailable.'},503);
        const {contacts} = await directory.json();
        const people = (contacts || []).filter(person =>
          [person.name,person.email].some(value => String(value || '').toLowerCase().includes(term))
        ).slice(0,8).map(({name,email})=>({name,email}));
        return json({people});
      }
      if (request.method === 'GET') {
        const rows = await env.REVIEW_DB.prepare('SELECT id, parent, author, text, view, date FROM steel_review_comments ORDER BY date DESC LIMIT 500').all();
        return json({comments:rows.results});
      }
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Expected JSON'}, 415);
      let input;
      try {
        const reader = request.body?.getReader();
        if (!reader) return json({error:'Comment is required'}, 400);
        let bytes = 0;
        const decoder = new TextDecoder();
        let body = '';
        for (;;) {
          const {done, value} = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 400000) { await reader.cancel(); return json({error:'Comment is too large'}, 413); }
          body += decoder.decode(value, {stream:true});
        }
        input = JSON.parse(body + decoder.decode());
      } catch { return json({error:'Invalid JSON'}, 400); }
      const text = typeof input?.text === 'string' ? input.text.trim() : '';
      const parent = input?.parent ?? null;
      if (!text || text.length > 4000 || !validView(input.view) ||
          (parent !== null && (typeof parent !== 'string' || !/^[0-9a-f-]{36}$/.test(parent)))) {
        return json({error:'Enter a comment and a valid viewpoint.'}, 400);
      }
      const recipients = [...new Set(Array.from(text.matchAll(/(?:^|\s)@([a-z0-9._%+-]+@(?:[a-z0-9-]+\.)*bits-pilani\.ac\.in)(?![\w-]|\.[a-z0-9])/gi),match=>match[1].toLowerCase()))];
      if (recipients.length > 5) return json({error:'Mention up to five people per comment.'},400);
      const snapshot = input.snapshot;
      if (recipients.length && (typeof snapshot !== 'string' || snapshot.length > 380000 || !/^\/9j\/[a-z0-9+/]+={0,2}$/i.test(snapshot))) {
        return json({error:'Could not attach the model snapshot.'},400);
      }
      if (parent && !(await env.REVIEW_DB.prepare('SELECT id FROM steel_review_comments WHERE id = ? AND parent IS NULL').bind(parent).first())) {
        return json({error:'The original comment could not be found.'}, 404);
      }
      const author = String(session.user.name || session.user.displayName || 'WILP reviewer').trim().slice(0,100) || 'WILP reviewer';
      const comment = {id:crypto.randomUUID(),parent,author,text,view:input.view,date:new Date().toISOString()};
      await env.REVIEW_DB.prepare('INSERT INTO steel_review_comments (id, parent, author, text, view, date) VALUES (?, ?, ?, ?, ?, ?)').bind(comment.id,parent,author,text,comment.view,comment.date).run();
      if (!recipients.length) return json({comment},201);
      if (!env.EMAIL || !env.MENTION_EMAIL_FROM || !env.MENTION_LIMIT) {
        return json({comment,notification:'Comment posted. Mention email is unavailable.'},201);
      }
      const {success} = await env.MENTION_LIMIT.limit({key:session.user.email.toLowerCase()}).catch(()=>({success:false}));
      if (!success) return json({comment,notification:'Comment posted. Mention email limit reached.'},201);
      const link = origin+'/steel-model/#'+comment.view;
      const results = await Promise.allSettled(recipients.map(async to=>env.EMAIL.send({
        to,from:env.MENTION_EMAIL_FROM,subject:'You were mentioned in a WILP steel model review',
        text:author+' mentioned you in a model review.\n\n'+text+'\n\nOpen the saved viewpoint: '+link,
        attachments:[{content:snapshot,filename:'steel-model-view.jpg',type:'image/jpeg',disposition:'attachment'}],
      })));
      const sent = results.filter(result=>result.status==='fulfilled').length;
      const notification = sent===recipients.length?'Mention email submitted for delivery.':
        'Comment posted. Mention email submitted for '+sent+' of '+recipients.length+' recipients.';
      return json({comment,notification},201);
    } catch {
      return json({error:'Shared comments are temporarily unavailable.'},503);
    }
  },
};
