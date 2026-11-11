const origin = 'https://wilp.aecbim.work';
const endpoint = '/api/steel-review';
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
    if (request.headers.get('Origin') !== origin) return json({error:'Open the WILP viewer to continue.'}, 403);
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
    if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'}, 405);
    try {
      const cookie = request.headers.get('Cookie');
      if (!cookie) return json({error:'Sign in to WILP to use shared comments.'}, 401);
      const auth = await env.WILP_AUTH.fetch('https://wilptest.aecbim.work/api/me', {headers:{Cookie:cookie,Origin:origin,Accept:'application/json'}});
      if (!auth.ok) return json({error:'Could not verify the WILP session.'}, auth.status === 401 ? 401 : 503);
      const session = await auth.json();
      if (session.authenticated !== true || !session.user) return json({error:'Sign in to WILP to use shared comments.'}, 401);
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
          if (bytes > 30000) { await reader.cancel(); return json({error:'Comment is too large'}, 413); }
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
      if (parent && !(await env.REVIEW_DB.prepare('SELECT id FROM steel_review_comments WHERE id = ? AND parent IS NULL').bind(parent).first())) {
        return json({error:'The original comment could not be found.'}, 404);
      }
      const author = String(session.user.name || session.user.displayName || 'WILP reviewer').trim().slice(0,100) || 'WILP reviewer';
      const comment = {id:crypto.randomUUID(),parent,author,text,view:input.view,date:new Date().toISOString()};
      await env.REVIEW_DB.prepare('INSERT INTO steel_review_comments (id, parent, author, text, view, date) VALUES (?, ?, ?, ?, ?, ?)').bind(comment.id,parent,author,text,comment.view,comment.date).run();
      return json({comment},201);
    } catch {
      return json({error:'Shared comments are temporarily unavailable.'},503);
    }
  },
};
