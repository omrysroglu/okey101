/* ============================== STORAGE HELPERS ============================== */
function roomKey(code){ return 'room-'+code; }
// Claude'da yayınlanınca window.storage, başka yerde (Vercel) /api/room kullanılır.
function useClaudeStorage(){ return !!(window.storage && typeof window.storage.get==='function'); }
async function loadRoom(code){
  try{
    if(useClaudeStorage()){
      const res = await window.storage.get(roomKey(code), true);
      return res ? JSON.parse(res.value) : null;
    }
    const r = await fetch('/api/room?code='+encodeURIComponent(code), {cache:'no-store'});
    if(r.status===404) return null;
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(e){ console.error('load failed', e); return null; }
}
async function saveRoom(code, obj){
  try{
    if(useClaudeStorage()){
      await window.storage.set(roomKey(code), JSON.stringify(obj), true);
      return true;
    }
    const r = await fetch('/api/room?code='+encodeURIComponent(code), {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(obj),
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return true;
  }catch(e){ console.error('save failed', e); return false; }
}
function genCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s='';
  for(let i=0;i<5;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
// In solo-test mode (S.code is null) there's no room to sync — just update local state.
async function persist(room){
  if(S.code){ await saveRoom(S.code, room); }
  S.room = room;
  render();
}
function myId(){
  let id = sessionStorage.getItem('okey101_myid');
  if(!id){ id = 'p'+Math.random().toString(36).slice(2,10); sessionStorage.setItem('okey101_myid', id); }
  return id;
}

