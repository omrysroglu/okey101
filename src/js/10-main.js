/* ============================== SMALL HANDLERS ============================== */
async function discardSelected(){
  const tid = S.selectedTid;
  if(!tid || !S.room.hands[S.mySeat].includes(tid)) return;
  S.selectedTid=null;
  await discardTile(tid);
}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

/* ============================== BOOT ============================== */
(function boot(){
  render();
  let lastCols = rackCols();
  window.addEventListener('resize', ()=>{ const c=rackCols(); if(c!==lastCols){ lastCols=c; render(); } });
  setInterval(()=>{ if(S.screen==='game' && S.room && S.room.status==='playing'){ handleMyTimeout(); if(!S.drag) render(); } }, 1000); // süre çubuğu + süre dolması
})();
