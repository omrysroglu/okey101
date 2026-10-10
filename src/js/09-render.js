/* ============================== RENDER: TILE ============================== */
function tileHTML(tile, opts){
  opts = opts||{};
  const cls = ['tile']; if(opts.small) cls.push('small'); if(opts.mini) cls.push('mini'); if(opts.selected) cls.push('selected'); if(tile.fake) cls.push('fake'); if(opts.cls) cls.push(opts.cls);
  const clickAttr = (opts.onclick ? `onclick="${opts.onclick}"` : '') + (opts.attrs ? ' '+opts.attrs : '');
  if(opts.flipped){
    return `<div class="${cls.join(' ')} flipped" ${clickAttr} title="Okey (ters çevrildi, açmak için tıkla)">
      <span class="flip-star">★</span><span class="flip-lbl">OKEY</span>
    </div>`;
  }
  if(tile.fake){
    return `<div class="${cls.join(' ')}" ${clickAttr} title="Sahte Okey">
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width:62%;height:auto;margin-top:6%"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#1F1F1F"/></svg>
    </div>`;
  }
  return `<div class="${cls.join(' ')}" ${clickAttr}>
    <div class="num c-${tile.color}">${tile.number}</div>
    <div class="dot bg-${tile.color}"></div>
  </div>`;
}
function tileBackHTML(){ return `<div class="back-tile"></div>`; }

/* ============================== RENDER: SCREENS ============================== */
function render(){
  if(S.drag) return;   // sürükleme sırasında DOM'u yeniden çizme
  const app = document.getElementById('app');
  if(S.screen==='landing') app.innerHTML = renderLanding();
  else if(S.screen==='lobby') app.innerHTML = renderLobby();
  else if(S.screen==='game') app.innerHTML = renderGame();
  if(S.closeModalOpen) app.innerHTML += renderCloseModal();
  if(S.scoreboardOpen && S.screen==='game') app.innerHTML += renderScoreboard();
  if(S.screen==='game'){ checkPenaltyAlerts(); app.innerHTML += alertsHTML(); }
}

function renderLanding(){
  return `
  <div class="brand"><span class="mark">Okey 101</span><span class="sub">arkadaşlarınla online oyna</span></div>
  <div class="grid2">
    <div class="card">
      <h2>Oda Kur</h2>
      <p class="muted small">4 kişilik bir oda oluştur, kodu arkadaşlarına gönder.</p>
      <div class="col" style="margin-top:10px;">
        <label>Adın</label>
        <input type="text" value="${escapeAttr(S.nameInput)}" oninput="S.nameInput=this.value" placeholder="Örn. Ömer">
      </div>
      <div class="col" style="margin-top:10px;">
        <label>Hamle süresi</label>
        <select onchange="S.turnSecondsChoice=this.value">
          <option value="15">15 saniye</option>
          <option value="30" selected>30 saniye</option>
          <option value="60">60 saniye</option>
          <option value="90">90 saniye</option>
          <option value="none">Süre yok</option>
        </select>
      </div>
      <div style="margin-top:14px;"><button onclick="createRoom()" ${S.busy?'disabled':''}>Oda Kur</button></div>
    </div>
    <div class="card">
      <h2>Odaya Katıl</h2>
      <p class="muted small">Arkadaşından aldığın oda kodunu gir.</p>
      <div class="col" style="margin-top:10px;">
        <label>Adın</label>
        <input type="text" value="${escapeAttr(S.nameInput)}" oninput="S.nameInput=this.value" placeholder="Örn. Ayşe">
      </div>
      <div class="col" style="margin-top:10px;">
        <label>Oda kodu</label>
        <input type="text" style="text-transform:uppercase" value="${escapeAttr(S.joinCodeInput)}" oninput="S.joinCodeInput=this.value.toUpperCase()" placeholder="AB12C">
      </div>
      <div style="margin-top:14px;"><button class="secondary" onclick="joinRoom()" ${S.busy?'disabled':''}>Katıl</button></div>
    </div>
  </div>
  <div class="card" style="margin-top:14px;">
    <h2 style="font-size:16px;">Tek Başına Dene</h2>
    <p class="muted small">Arkadaşların hazır değilse masayı 3 bot'a karşı tek başına deneyebilirsin — görünümü ve kuralları test etmek için (yukarıdaki "Adın" alanını doldurman yeterli).</p>
    <div style="margin-top:10px;"><button class="secondary" onclick="startSoloTest()">Test Masasını Aç</button></div>
  </div>
  ${S.error?`<div class="err">${escapeHtml(S.error)}</div>`:''}
  <footer class="note">
    Bu oyun tamamen tarayıcı üzerinde, paylaşılan bulut depolamayla çalışır — arkadaşların aynı bağlantıyı açıp aynı oda koduna girer.
    Teknik bir not: bu depolama odadaki herkese açıktır; oturuma dahil olan biri tarayıcı geliştirici konsolundan teorik olarak diğer oyuncuların elini görebilir.
    Güvenilir bir arkadaş grubuyla oynamak için sorun değil, ama kağıt üstü bir kumarhane güvenliği beklemeyin.
  </footer>
  `;
}

function renderLobby(){
  const room = S.room;
  const seatsHtml = [0,1,2,3].map(seat=>{
    const p = room.players.find(pl=>pl.seat===seat);
    return `<div class="seat ${p?'filled':''}">
      <div>
        <div class="name">${p?escapeHtml(p.name):'Boş koltuk'}</div>
        <div class="tag">Koltuk ${seat+1}${p && p.seat===S.mySeat?' (sen)':''}</div>
      </div>
      ${p?'<span class="pill">Hazır</span>':''}
    </div>`;
  }).join('');
  const full = room.players.length>=room.maxPlayers;
  const timerLabel = room.turnSeconds ? `${room.turnSeconds} saniye` : 'süre yok';
  return `
  <div class="brand"><span class="mark">Okey 101</span><span class="sub">Lobi</span></div>
  <div class="card">
    <div class="row" style="justify-content:space-between;">
      <div>
        <div class="muted small">Oda kodu</div>
        <div style="font-size:26px; letter-spacing:3px; color:var(--gold); font-weight:700;">${room.code}</div>
      </div>
      <div class="pill">Hamle süresi: ${timerLabel}</div>
    </div>
    <div class="seats">${seatsHtml}</div>
    ${full
      ? (S.mySeat===0
          ? `<button onclick="startGame()">Oyunu Başlat</button>`
          : `<p class="muted small">Oda dolu — kurucu (Koltuk 1) oyunu başlatabilir.</p>`)
      : `<p class="muted small">${room.players.length}/4 oyuncu katıldı. Bağlantı: oda kodunu (${room.code}) arkadaşlarına ilet.</p>`}
  </div>
  `;
}

function backsHTML(n){ return Array(n).fill(0).map(()=>'<div class="tback"></div>').join(''); }

function nameplateHTML(room, seat, vertical, extra){
  const p = room.players.find(x=>x.seat===seat);
  const nm = p ? p.name : '?';
  const active = room.turnSeat===seat;
  return `<div class="nameplate ${vertical?'vertical':''} ${active?'active':''}">
    <div class="avatar">${escapeHtml((nm||'?').trim().charAt(0).toUpperCase())}</div>
    <div class="np-meta">
      <div class="nm" title="${escapeAttr(nm)}">${escapeHtml(nm)}${seat===room.dealerSeat?' <span class="badge">D</span>':''}</div>
      <span class="score-bubble" title="Toplam puan">${room.scores[seat]}</span>${openedBadgeHTML(room, seat)}${extra||''}
    </div>
  </div>`;
}

function pileHTML(room, seat, takeable, cls, droppable){
  const pile = room.discards[seat] || [];
  const top = pile.length ? room.allTilesById[pile[pile.length-1]] : null;
  return `<div class="pile ${cls} ${takeable?'take':''} ${droppable?'drop':''}" ${takeable?'onclick="drawFromDiscard()" title="Bu taşı al"':''}>
    ${top ? tileHTML(top,{small:true}) : '<div class="pile-empty"></div>'}
    <div class="pl">${escapeHtml(seatName(room,seat))}${pile.length?' · '+pile.length:''}${droppable?'<br><b>Atmak için taşı buraya sürükle</b>':''}</div>
  </div>`;
}

function laneHTML(room, seat){
  const groups = (room.table && room.table[seat]) || [];
  const info = room.opened && room.opened[seat];
  const myInfo = room.opened && room.opened[S.mySeat];
  const canWork = canDiscardNow() && myInfo && myInfo.mode==='groups';
  const meldsHtml = groups.length
    ? groups.map((g,gi)=>`<div class="meld ${canWork&&info&&info.mode==='groups'?'workable':''}" ${canWork&&info&&info.mode==='groups'?`onclick="meldClick(${seat},${gi})" title="Seçili taşı bu pere işle"`:''}>${g.map(tid=>tileHTML(room.allTilesById[tid],{mini:true})).join('')}</div>`).join('')
    : '<span class="lane-empty">Henüz per açmadı</span>';
  const sub = info ? (info.mode==='pairs' ? info.pairCount+' çift ile açtı' : info.meldValue+' puanla açtı') : '';
  return `<div class="lane ${seat===S.mySeat?'mine':''} ${room.turnSeat===seat?'active':''}">
    <div class="lane-name">${escapeHtml(seatName(room,seat))}<small>${sub}</small></div>
    <div class="lane-melds">${meldsHtml}</div>
  </div>`;
}

// Masa: solda seri/set perler (dikey sıralar), sağda çiftler. İsim yok.
// Açmış her oyuncu seri/set perlere işleyebilir; çiftlere yalnızca okey değişimi yapılabilir. Bu turda indirilen perlerde ✕ ile geri alma.
function meldsAreaHTML(room, seats){
  const myInfo = room.opened && room.opened[S.mySeat];
  const canWork = canDiscardNow() && !!myInfo;
  const runs=[], pairs=[];
  seats.forEach(seat=>{
    const info=room.opened && room.opened[seat];
    const groups=(room.table && room.table[seat]) || [];
    groups.forEach((g,gi)=>{
      const isPair = isPairMeld(room, seat, g);
      const undo = canDiscardNow() && laidThisTurn(room, seat, gi);
      const html = `<div class="meld ${canWork?'workable':''} ${seat===S.mySeat?'mine':''} ${undo?'fresh':''}" data-seat="${seat}" data-gi="${gi}" ${canWork?`onclick="meldClick(${seat},${gi})" title="${isPair?'Çiftteki okeyi aynı taşla değiştir':'Seçili taşı bu pere işle'}"`:''}>${g.map(tid=>tileHTML(room.allTilesById[tid],{mini:true})).join('')}${undo?`<button class="meld-x" onclick="event.stopPropagation(); takeBackMeld(${gi})" aria-label="Bu peri ıstakaya geri al" title="Bu peri ıstakaya geri al">✕</button>`:''}</div>`;
      (isPair?pairs:runs).push(html);
    });
  });
  return `<div class="melds-area">
    <div class="mz mz-runs">${runs.join('') || '<span class="mz-empty">Seri perler</span>'}</div>
    <div class="mz mz-pairs" onclick="pairZoneClick(event)" title="Seçili taşı eşiyle birlikte çift olarak işle">${pairs.join('') || '<span class="mz-empty">Çiftler</span>'}</div>
  </div>`;
}

// Oyuncunun masaya açtığı perlerin anlık değeri
function openedBadgeHTML(room, seat){
  const info=room.opened && room.opened[seat]; if(!info) return '';
  const v=openedSummaryValue(room, seat);
  return info.mode==='pairs'
    ? `<span class="open-badge pair" title="Masaya açtığı çift sayısı">${v} çift</span>`
    : `<span class="open-badge" title="Masaya açtığı perlerin toplamı">Açtı ${v}</span>`;
}

// ---- Puan tablosu ----
function openScoreboard(){ S.scoreboardOpen=true; S.sbRound=null; render(); }
function closeScoreboard(){ S.scoreboardOpen=false; render(); }
function selectSbRound(i){ S.sbRound=i; render(); }
function renderScoreboard(){
  const room=S.room; if(!room) return '';
  const hist=room.history||[];
  const players=room.players.slice().sort((a,b)=>a.seat-b.seat);
  const sign=v=>`<span class="${v<=0?'delta-neg':'delta-pos'}">${v>0?'+':''}${v}</span>`;
  const live = room.status==='playing' && (room.penalties||[]).length;
  const liveRow = live ? `<tr class="sb-live"><td>El ${room.round||1} <small>(devam)</small></td>${players.map(p=>{ const v=(room.penalties||[]).filter(x=>x.seat===p.seat).reduce((a,x)=>a+x.amount,0); return `<td>${v?sign(v)+' <small>ceza</small>':'—'}</td>`; }).join('')}<td>—</td></tr>` : '';
  const sel = S.sbRound===null||S.sbRound===undefined ? hist.length-1 : S.sbRound;
  const roundsRows = hist.map((h,i)=>`<tr class="sb-row ${i===sel?'sel':''}" onclick="selectSbRound(${i})" title="Ayrıntıyı göster">
      <td>El ${h.round}</td>${players.map(p=>`<td>${sign(h.rows[p.seat].delta+(h.rows[p.seat].manual||0))}</td>`).join('')}
      <td>${h.winnerSeat===null?'<span class="muted">Deste bitti</span>':escapeHtml(seatName(room,h.winnerSeat))}</td></tr>`).join('');
  const ranked = players.slice().sort((a,b)=>room.scores[a.seat]-room.scores[b.seat]);
  let detail='';
  const h=hist[sel];
  if(h){
    const sum=(items,cat)=>items.filter(x=>x.cat===cat).reduce((a,x)=>a+x.amount,0);
    detail = `<h3 class="sb-h">El ${h.round} ayrıntısı</h3>
    <div class="sb-scroll"><table class="scoreboard sb-detail">
      <thead><tr><th>Oyuncu</th><th>Açılış</th><th>Kalan taş</th><th>Bitirme / bonus</th><th>Cezalar</th><th>Açamadı</th><th>Atıktan alma</th><th>Kalan taş puanı</th><th>Düzeltme</th><th>El toplamı</th></tr></thead>
      <tbody>${players.map(p=>{ const r=h.rows[p.seat], it=r.items||[];
        const op = r.opened ? (r.opened.mode==='pairs' ? r.opened.value+' çift' : 'Seri '+r.opened.value) : '<span class="muted">Açmadı</span>';
        const pens = it.filter(x=>x.cat==='ceza');
        return `<tr><td>${escapeHtml(p.name)}${p.seat===h.winnerSeat?' <span class="badge">Bitirdi</span>':''}</td>
          <td>${op}</td><td>${p.seat===h.winnerSeat?'0':r.tiles+' taş'}</td>
          <td>${sum(it,'bonus')?sign(sum(it,'bonus')):'—'}</td>
          <td title="${escapeAttr(pens.map(x=>x.label+' '+x.amount).join(', '))}">${pens.length?sign(sum(it,'ceza'))+` <small>(${pens.length})</small>`:'—'}</td>
          <td>${sum(it,'acamadi')?sign(sum(it,'acamadi')):'—'}</td>
          <td>${sum(it,'alma')?sign(sum(it,'alma')):'—'}</td>
          <td>${sum(it,'kalan')?sign(sum(it,'kalan')):'—'}</td>
          <td>${r.manual?sign(r.manual):'—'}</td>
          <td><b>${sign(r.delta+(r.manual||0))}</b></td></tr>`; }).join('')}</tbody>
    </table></div>`;
  }
  return `<div class="modal-backdrop" onclick="if(event.target===this) closeScoreboard()">
    <div class="modal sb-modal" role="dialog" aria-label="Puan tablosu">
      <div class="sb-head"><h2>Puan Tablosu</h2><button class="icon-x" onclick="closeScoreboard()" aria-label="Kapat">✕</button></div>
      <div class="sb-rank">${ranked.map((p,i)=>`<div class="sb-chip ${i===0?'lead':''}"><span class="sb-pos">${i+1}</span>${escapeHtml(p.name)}<b>${room.scores[p.seat]}</b></div>`).join('')}</div>
      <div class="sb-scroll"><table class="scoreboard sb-rounds">
        <thead><tr><th>El</th>${players.map(p=>`<th>${escapeHtml(p.name)}</th>`).join('')}<th>Bitiren</th></tr></thead>
        <tbody>${roundsRows || ''}${liveRow}${(!hist.length && !live)?`<tr><td colspan="${players.length+2}" class="muted">Henüz biten el yok.</td></tr>`:''}</tbody>
        <tfoot><tr><td>Toplam</td>${players.map(p=>`<td><b>${room.scores[p.seat]}</b></td>`).join('')}<td></td></tr></tfoot>
      </table></div>
      ${detail}
      <p class="muted small" style="margin-top:10px;">Düşük puan iyidir. Bir ele tıklayarak ayrıntısını gör.</p>
    </div>
  </div>`;
}

function renderGame(){
  const room = S.room;
  if(room.status==='roundEnd') return renderRoundEnd();
  if(room.status==='gameEnd') return renderGameEnd();

  const me = S.mySeat, n = room.players.length;
  const myHand = room.hands[me].map(id=>({id, t:room.allTilesById[id]}));
  const indicator = room.allTilesById[room.indicatorTileId];
  const okeyTile = {color:room.okeyColor, number:room.okeyNumber, fake:false};
  const myTurn = isMyTurn();
  const iOpened = !!(room.opened && room.opened[me]);
  const timeLeftPct = room.turnDeadline ? Math.max(0, Math.min(100, ((room.turnDeadline-Date.now())/(room.turnSeconds*1000))*100)) : 100;

  // seat positions: offset 1 = sağ, 2 = karşı (üst), 3 = sol  (sıra saat yönünün tersine)
  const seatAt = off => (me+off)%n;
  const sRight=seatAt(1), sTop=seatAt(2), sLeft=seatAt(3);

  const canDraw = myTurn && room.turnPhase==='draw';
  const canDiscard = myTurn && room.turnPhase==='discard';
  const takeSeat = canDrawFromDiscard() ? discardSourceSeat() : null;

  syncRack(room.hands[me]);
  const cols = rackCols(), rackRows = RACK_SLOTS/cols;
  const meldAt = {};
  const rackGroups = rackMelds(room);
  rackGroups.forEach(m=>m.slots.forEach((si,k)=>{ meldAt[si]={start:k===0, end:k===m.slots.length-1, value:m.value}; }));
  const rackPairList = rackPairs(room);
  rackPairList.forEach(m=>m.slots.forEach((si,k)=>{ if(!meldAt[si]) meldAt[si]={start:k===0, end:k===1, value:null, pair:true}; }));
  const rackTotal = rackGroups.reduce((a,m)=>a+m.value,0);
  const slotHTML = idx => {
    const id = S.rackSlots[idx];
    const t = id ? room.allTilesById[id] : null;
    const g = meldAt[idx];
    return `<div class="slot ${g?'g':''} ${g&&g.pair?'gp':''} ${g&&g.start?'gs':''} ${g&&g.end?'ge':''}" data-idx="${idx}">${g&&g.start&&!g.pair?`<span class="gsum">${g.value}</span>`:''}${t ? tileHTML(t,{cls:'rk', selected:S.selectedTid===id, flipped:!!(S.flipped&&S.flipped[id]&&isOkey(t,room.okeyColor,room.okeyNumber)), attrs:`onpointerdown="rackPointerDown(event,'${id}')"`}) : ''}</div>`;
  };
  const shelvesHtml = Array.from({length:rackRows},(_,r)=>
    `<div class="shelf" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${Array.from({length:cols},(_,c)=>slotHTML(r*cols+c)).join('')}</div>`).join('');
  const selOk = !!(S.selectedTid && room.hands[me].includes(S.selectedTid));

  const hint = mustReturnNow() ? 'Atıktan aldığın taşla elini aç. Açamıyorsan "Taşı Geri Bırak" ile geri koy ve yerden çek.'
    : canDraw ? 'Yerden çek ya da solundaki oyuncunun attığı taşı al (yalnızca o taşla hemen açabiliyorsan).'
    : canDiscard ? (iOpened ? 'Taşı ortadaki alana sürükleyip at (ya da çift tıkla). Taşı seçip bir pere tıklayarak işleyebilirsin. Son taşı atarsan eli bitirirsin.' : 'Taşı ortadaki alana sürükleyip at (ya da çift tıkla), ya da perlerini aç.')
    : 'Sıra sende değil. Taşlarını sürükleyerek dizebilirsin.';
  const rackTip = rackGroups.length ? ' Per taşını sürüklersen per topluca taşınır; tek taşı ayırmak için önce taşa tıkla.' : '';

  return `
  <div class="brand" style="justify-content:space-between;">
    <div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;"><span class="mark">Okey 101</span><span class="sub">El ${room.round} · ${S.code? 'Oda '+room.code : 'Test masası (botlara karşı)'}</span></div>
    ${S.code===null? `<button class="secondary" onclick="leaveSoloTest()">Testi Bitir</button>`:''}
  </div>
  <div class="board">
    <div class="board-top">
      <div class="pill">Sıra: ${myTurn?'Sende!':escapeHtml(seatName(room, room.turnSeat))}</div>
      ${room.turnSeconds? `<div class="timer-bar"><div class="timer-fill" style="width:${timeLeftPct}%"></div></div>`:'<div class="muted small">Süre sınırı yok</div>'}
      <div class="row" style="gap:8px;"><button class="secondary sb-btn" onclick="openScoreboard()">Puan Tablosu</button><div class="pill">Destede ${room.deck.length} taş</div></div>
    </div>

    <div class="felt-table">
      <div class="table3">
        <div class="seat-top">
          ${nameplateHTML(room, sTop, false)}
          <div class="rack rack-h rack-empty"></div>
        </div>

        <div class="seat-left">
          ${nameplateHTML(room, sLeft, true)}
          <div class="rack rack-v rack-empty"></div>
        </div>

        <div class="mid">
          ${pileHTML(room, sTop, takeSeat===sTop, 'pile-slot-tl')}
          <div class="deckbox">
            <div class="indicator-box"><div class="lbl">Gösterge</div>${tileHTML(indicator,{})}</div>
            <div class="deck-stack ${canDraw?'':'disabled'}" onclick="${canDraw?'drawFromDeck()':''}">Yerden<br>Çek<span class="cnt">${room.deck.length}</span></div>
          </div>
          ${pileHTML(room, sRight, takeSeat===sRight, 'pile-slot-tr')}
          ${meldsAreaHTML(room, [me, sRight, sTop, sLeft])}
          ${pileHTML(room, sLeft, takeSeat===sLeft, 'pile-slot-bl')}
          ${pileHTML(room, me, false, 'pile-slot-br', canDiscard)}
        </div>

        <div class="seat-right">
          ${nameplateHTML(room, sRight, true)}
          <div class="rack rack-v rack-empty"></div>
        </div>

        <div class="seat-bottom">
          <div class="me-bar">
            ${nameplateHTML(room, me, false, `<span class="per-bubble ${rackTotal>=OPEN_MIN?'ok':''}" title="Istakada dizili perlerin toplamı">Per ${rackTotal}</span>${rackPairList.length?`<span class="per-bubble pair ${rackPairList.length>=OPEN_MIN_PAIRS?'ok':''}" title="Istakada dizili çift sayısı">Çift ${rackPairList.length}</span>`:''}`)}
            <div class="row">
              <button class="secondary" onclick="sortMyHand()" title="En yüksek puanlı perleri kurar">Seri Diz</button>
              <button class="secondary" onclick="sortPairsHand()" title="Çiftleri yan yana dizer">Çift Diz</button>
              ${mustReturnNow()? `<button class="danger" onclick="returnTakenTile()">Taşı Geri Bırak</button>`:''}
              <button class="secondary" ${canDiscard?'':'disabled'} onclick="openOpenModal()">${iOpened?'Per İndir':'Per Aç'}</button>
              <button ${myTurn && !iOpened?'':'disabled'} onclick="openCloseModal()" title="Tüm elini tek seferde kapat">Elimi Kapat</button>
            </div>
          </div>
          <div class="rack rack-me">
            ${shelvesHtml}
          </div>
          <div class="rack-actions">
            ${canDiscard? `<button ${selOk?'':'disabled'} onclick="discardSelected()">Seçili Taşı At</button>` : ''}
            <span class="muted small">${hint}${rackTip}</span>
            ${S.noticeUntil>Date.now()?`<span class="notice">${escapeHtml(S.notice)}</span>`:''}
          </div>
        </div>
      </div>
    </div>

    <div class="log-panel">${(room.log||[]).slice(-12).map(l=>`<div>${escapeHtml(l)}</div>`).join('')}</div>
  </div>

  <details class="rules-accordion" style="margin-top:14px;">
    <summary>Bu oyundaki kurallar</summary>
    <div class="rule-list">
      <div><b>Per açma:</b> perlerinin toplamı en az ${OPEN_MIN} olmalı ya da en az ${OPEN_MIN_PAIRS} çift ile açabilirsin. Açtıktan sonra elinde atacak en az 1 taş kalmalı; son taşını atarsan eli bitirirsin.</div>
      <div><b>Sahte okey</b> joker değildir; okeyin temsil ettiği taşın değerini taşır. Tek joker gerçek okeydir.</div>
      <div><b>Atıktan taş alma:</b> yalnızca o taşla elini hemen açabiliyorsan. Alana taşın sayısı kadar bonus (−), atana aynı ceza (+); çift ile bitirenin kendi alışları 2 kat. Aldığın taşla açmazsan +101.</div>
      <div><b>İşleme:</b> açtıktan sonra ıstakadan taşı seç, masadaki (seri/set) bir pere tıkla. Perdeki okeyin yerine gerçek taşı koyarsan okeyi alırsın; perinden okey alınana +101.</div>
      <div><b>Eli bitirme bonusu:</b> −100 · <b>Okey atarak bitirme:</b> −100 ek (son taş okeyse)</div>
      <div><b>50 üstü açılış:</b> −100 · <b>60 üstü açılış:</b> −200 · <b>7 çift:</b> −100 · <b>9+ çift:</b> −200</div>
      <div><b>+101 ceza:</b> okeyi yere atmak, masadaki bir pere işlenebilecek taşı atmak, atıktan aldığı taşla açmamak, perinden okey alınması.</div>
      <div><b>Deste bitişi:</b> çekilecek taş kalmayınca el biter; herkesin elinde kalan taşlar ceza yazılır.</div>
      <div><b>Elde kalan taş:</b> kaybedenlere taş değerleri kadar ceza (okey taşı 2 kat sayılır)</div>
      <div class="muted" style="margin-top:6px;">Not: 4 kata çıkan zincirleme ceza kuralı ve geçersiz açılış anlaşmazlıkları otomatik hesaplanmıyor — bunlar için el sonunda "Manuel Puan Düzeltmesi" aracını kullanabilirsiniz.</div>
    </div>
  </details>
  `;
}

function renderRoundEnd(){
  const room = S.room;
  const r = room.roundResult;
  const rows = room.players.map(p=>{
    const items = r.breakdown[p.seat]||[];
    const total = r.deltaTotals[p.seat]||0;
    return `<tr>
      <td>${escapeHtml(p.name)}${p.seat===r.winnerSeat?' 🏆':''}</td>
      <td class="${total<=0?'delta-neg':'delta-pos'}">${total>0?'+':''}${total}</td>
      <td><b>${room.scores[p.seat]}</b></td>
      <td class="small muted">${items.map(i=>`${i.label}: ${i.amount>0?'+':''}${i.amount}`).join(' · ')||'—'}</td>
    </tr>`;
  }).join('');
  const isHost = S.mySeat===0;
  return `
  <div class="brand"><span class="mark">Okey 101</span><span class="sub">El ${room.round} sonucu</span></div>
  <div class="card">
    <h2>${r.winnerSeat===null||r.winnerSeat===undefined ? 'Deste bitti — kimse bitiremedi' : escapeHtml(seatName(room,r.winnerSeat))+' eli bitirdi'}</h2>
    <table class="scoreboard">
      <thead><tr><th>Oyuncu</th><th>Bu el</th><th>Toplam</th><th>Detay</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted small" style="margin-top:8px;">Düşük toplam iyidir.</p>

    <div class="divider"></div>
    <h3 style="font-size:14px;">Manuel Puan Düzeltmesi <span class="small muted">(dispute / özel durumlar için)</span></h3>
    <div class="row">
      <select onchange="S.adjustSeat=this.value">
        <option value="">Oyuncu seç</option>
        ${room.players.map(p=>`<option value="${p.seat}">${escapeHtml(p.name)}</option>`).join('')}
      </select>
      <input type="text" placeholder="Puan (ör. 101 veya -50)" style="width:150px" oninput="S.adjustAmount=this.value">
      <input type="text" placeholder="Not (opsiyonel)" style="width:180px" oninput="S.adjustNote=this.value">
      <button class="secondary" onclick="applyManualAdjustment()">Uygula</button>
    </div>

    <div class="divider"></div>
    <div class="row">
      ${isHost? `<button onclick="startNextRound()">Sonraki Eli Başlat</button>` : `<p class="muted small">Kurucu sonraki eli başlatabilir.</p>`}
      <button class="secondary" onclick="openScoreboard()">Puan Tablosu</button>
      <button class="danger" onclick="endGame()">Oyunu Bitir</button>
    </div>
  </div>
  `;
}

function renderGameEnd(){
  const room = S.room;
  const ranked = room.players.slice().sort((a,b)=>room.scores[a.seat]-room.scores[b.seat]);
  return `
  <div class="brand"><span class="mark">Okey 101</span><span class="sub">Oyun bitti</span></div>
  <div class="card">
    <div class="row" style="justify-content:space-between;"><h2>Final Sıralaması</h2><button class="secondary" onclick="openScoreboard()">Puan Tablosu</button></div>
    <table class="scoreboard">
      <thead><tr><th>#</th><th>Oyuncu</th><th>Puan</th></tr></thead>
      <tbody>
        ${ranked.map((p,i)=>`<tr><td>${i+1}${i===0?' 🏆':''}</td><td>${escapeHtml(p.name)}</td><td><b>${room.scores[p.seat]}</b></td></tr>`).join('')}
      </tbody>
    </table>
    <p class="muted small" style="margin-top:10px;">Düşük puan kazanır.</p>
  </div>
  `;
}

function renderCloseModal(){
  const room = S.room;
  const mode = S.closeMode;
  const isLay = S.modalKind==='lay';
  const isOpen = S.modalKind==='open' || isLay;
  const grouping = isOpen || mode==='groups';
  let previewHtml = '';
  if(isLay){
    previewHtml = `<div class="row" style="margin:10px 0;"><span class="pill">Elde kalacak: ${S.ungrouped.length} taş</span></div>`;
  } else if(isOpen){
    const pv = openPreview();
    const need = mode==='pairs' ? OPEN_MIN_PAIRS : OPEN_MIN;
    const ok = pv.total>=need && pv.bad===0;
    previewHtml = `<div class="row" style="margin:10px 0;">
      <span class="pill" style="color:${ok?'var(--good)':'var(--text)'}; border-color:${ok?'var(--good)':'var(--line)'};">${mode==='pairs'?'Çift':'Toplam'}: <b>${pv.total}</b> / ${need}</span>
      ${pv.bad? `<span class="pill" style="color:var(--bad); border-color:var(--bad);">${pv.bad} geçersiz grup</span>`:''}
      <span class="pill">Elde kalacak: ${S.ungrouped.length} taş</span>
    </div>`;
  }
  const makeLabel = (isOpen && mode==='pairs') ? 'Çift Yap' : 'Grup Yap';
  return `
  <div class="modal-backdrop" onclick="if(event.target===this) closeCloseModal()">
    <div class="modal">
      <h2>${isLay?'Per İndir':isOpen?'Per Aç':'Elimi Kapat'}</h2>
      ${isLay?'':`<div class="row" style="margin-bottom:10px;">
        <button class="${mode==='groups'?'':'secondary'}" onclick="setCloseMode('groups')">Seri/Set ile</button>
        <button class="${mode==='pairs'?'':'secondary'}" onclick="setCloseMode('pairs')">Çift ile</button>
      </div>`}
      ${isLay? `<p class="muted small" style="margin:0 0 6px;">Masaya indirmek istediğin perleri oluştur (ıstakada dizili perler hazır geldi). Elinde atacak en az 1 taş kalmalı; son taşı atarsan eli bitirirsin.</p>${previewHtml}` : isOpen? `<p class="muted small" style="margin:0 0 6px;">${mode==='pairs'
        ? `İkişer taş seçip "Çift Yap"a bas. En az ${OPEN_MIN_PAIRS} çift gerekli, elinde atacak en az 1 taş kalmalı.`
        : `Perlerini oluştur. Toplamları en az ${OPEN_MIN} olmalı; kalan taşlar elinde kalır ve birini atarsın.`}</p>${previewHtml}` : ''}

      ${grouping ? `
        <div>
          <div class="glabel">${isOpen?'Elindeki taşlar':'Gruplanmamış taşlar'} (üzerlerine tıkla, sonra "${makeLabel}")</div>
          <div class="my-rack">
            ${S.ungrouped.map(tid=>tileHTML(room.allTilesById[tid],{small:true, selected:S.pendingSelection.includes(tid), onclick:`toggleSelectUngrouped('${tid}')`})).join('')}
          </div>
          <div style="margin-top:8px;"><button class="secondary" onclick="makeGroupFromSelection()">${makeLabel} (${S.pendingSelection.length} taş)</button></div>
        </div>
        <div class="divider"></div>
        <div class="glabel">${(isOpen && mode==='pairs')?'Oluşturulan çiftler':'Oluşturulan gruplar'}</div>
        ${S.groups.map((g,gi)=>`
          <div class="group-box">
            ${g.map(tid=>tileHTML(room.allTilesById[tid],{small:true})).join('')}
            ${groupStatusHTML(g, isOpen && mode==='pairs')}
            <button class="icon-x gx" onclick="disbandGroup(${gi})" aria-label="Grubu boz, taşları geri al" title="Grubu boz, taşları geri al">✕</button>
          </div>
        `).join('') || '<p class="muted small">Henüz grup yok.</p>'}
      ` : `
        <p class="muted small">Elindeki tüm taşlar aynı taş çiftleri (veya okey ile tamamlanan çiftler) olmalı.</p>
        <div class="my-rack">${room.hands[S.mySeat].map(tid=>tileHTML(room.allTilesById[tid],{small:true})).join('')}</div>
      `}

      ${S.closeError? `<div class="err">${escapeHtml(S.closeError)}</div>`:''}

      <div class="row" style="margin-top:16px; justify-content:flex-end;">
        <button class="secondary" onclick="closeCloseModal()">Vazgeç</button>
        <button onclick="${isOpen?'attemptOpen()':'attemptClose()'}">${isLay?'Perleri İndir':isOpen?'Perleri Aç':'Kapatmayı Onayla'}</button>
      </div>
    </div>
  </div>
  `;
}


function groupStatusHTML(g, pairMode){
  const room=S.room;
  if(pairMode){
    const ok = g.length===2 && validatePairs(g.map(id=>room.allTilesById[id]), room.okeyColor, room.okeyNumber).valid;
    return `<span class="gstat ${ok?'ok':'bad'}">${ok?'Çift':'Geçersiz çift'}</span>`;
  }
  const r=meldInfo(g, room);
  return r.valid ? `<span class="gstat ok">${r.type==='run'?'Seri':'Set'} · ${r.value}</span>` : `<span class="gstat bad">${escapeHtml(meldErrorText(g, room))}</span>`;
}
