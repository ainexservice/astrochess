(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const app = $('#app');
  const Engine = window.AstroChess;
  if (!app || !Engine) return;

  const PIECES = {
    wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
    bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟'
  };
  const THEMES = [
    { id:'classic', name:'Classic Wood', light:'#eed8ad', dark:'#754628' },
    { id:'green', name:'Green Arena', light:'#e3ddbd', dark:'#547a4c' },
    { id:'marble', name:'Marble Stone', light:'#e5e5e2', dark:'#686b72' },
    { id:'dark', name:'Dark Wood', light:'#b18b65', dark:'#392318' },
    { id:'ivory', name:'Ivory', light:'#f5e9d1', dark:'#bc955d' },
    { id:'blue', name:'Royal Blue', light:'#dbe7ed', dark:'#3e668a' }
  ];
  const STYLES = [
    { id:'classic', name:'Classic Wood', white:'#fff7e7', black:'#1a100c' },
    { id:'dark', name:'Dark Wood', white:'#f4e3c4', black:'#0b0807' },
    { id:'silver', name:'Silver Metal', white:'#e6edf2', black:'#59636d' },
    { id:'gold', name:'Golden Royal', white:'#ffcf65', black:'#8d440d' },
    { id:'marble', name:'Marble White', white:'#fff', black:'#9e9b96' },
    { id:'obsidian', name:'Obsidian Black', white:'#e8e5de', black:'#030303' }
  ];
  const DEFAULT_SETTINGS = { sound:false, coordinates:true, confirmExit:true, showLegalMoves:true };
  const safeRead = (key, fallback) => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const savedRaw = safeRead('astromul-vip-settings', {});
  const saved = savedRaw && typeof savedRaw === 'object' ? savedRaw : {};

  const state = {
    screen:'splash', overlay:null, navStack:[],
    setup:{ side:'w', difficulty:'medium', minutes:10 },
    theme:THEMES.some(x=>x.id===saved.theme)?saved.theme:'classic',
    selectedTheme:THEMES.some(x=>x.id===saved.theme)?saved.theme:'classic',
    pieceStyle:STYLES.some(x=>x.id===saved.pieceStyle)?saved.pieceStyle:'classic',
    selectedPieceStyle:STYLES.some(x=>x.id===saved.pieceStyle)?saved.pieceStyle:'classic',
    settings:{ ...DEFAULT_SETTINGS, ...(saved.settings||{}) },
    rating:(()=>{const n=Number(safeRead('astromul-vip-rating',1200));return Number.isFinite(n)?Math.max(100,Math.round(n)):1200;})(),
    history:(()=>{const h=safeRead('astromul-vip-history',[]);return Array.isArray(h)?h.filter(x=>x&&typeof x==='object'):[];})(),
    game:null, toastTimer:null, aiTimer:null, clockTimer:null, aiToken:0,
    lastRatingChange:0, splashTimer:null
  };

  function brand() {
    return `<div class="logo-lockup"><span class="brand-small">✦ A S T R O M U L ✦</span><strong>AstroMul <span>Chess</span> ♞</strong></div>`;
  }
  function topbar(backAction='home', rightAction='go-settings') {
    return `<div class="topbar"><button class="icon-btn" data-action="${backAction}" aria-label="Go back">←</button><div class="topbar-center">${brand()}</div><button class="icon-btn" data-action="${rightAction}" aria-label="Settings">⚙</button></div>`;
  }
  function showToast(message) {
    const toast=$('#toast'); if(!toast)return;
    toast.textContent=message; toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer=setTimeout(()=>toast.classList.remove('show'),2100);
  }
  function persistPrefs() {
    safeWrite('astromul-vip-settings',{theme:state.theme,pieceStyle:state.pieceStyle,settings:state.settings});
  }
  function render() {
    switch(state.screen) {
      case 'splash': app.innerHTML=renderSplash(); break;
      case 'home': app.innerHTML=renderHome(); break;
      case 'setup': app.innerHTML=renderSetup(); break;
      case 'game': app.innerHTML=renderGame(); break;
      case 'themes': app.innerHTML=renderThemes(); break;
      case 'pieces': app.innerHTML=renderPieces(); break;
      case 'settings': app.innerHTML=renderSettings(); break;
      case 'help': app.innerHTML=renderHelp(); break;
      case 'history': app.innerHTML=renderHistory(); break;
      case 'result': app.innerHTML=renderResult(); break;
      default: state.screen='home'; app.innerHTML=renderHome();
    }
  }
  function renderSplash() {
    return `<section class="boot-screen"><div class="brand-emblem"><span class="emblem-sun">✦</span><span class="brand-small">ASTROMUL</span></div><h1>AstroMul <em>Chess</em></h1><p>Royal Strategy. Timeless Play.</p><div class="loading-track"><span></span></div></section>`;
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function renderHome() {
    const games=state.history;
    const wins=games.filter(x=>x.result==='Win').length;
    const losses=games.filter(x=>x.result==='Loss').length;
    const draws=games.filter(x=>x.result==='Draw').length;
    const themeName=THEMES.find(x=>x.id===state.theme)?.name||'Classic Wood';
    const pieceName=STYLES.find(x=>x.id===state.pieceStyle)?.name||'Classic Wood';
    const recent=games.slice(0,2).map(item=>{
      const result=item.result==='Win'?'WIN':item.result==='Loss'?'LOSS':'DRAW';
      const cls=result.toLowerCase();
      const safeReason=escapeHTML(item.reason||'Completed Match');
      const safeLevel=escapeHTML((item.level||'Medium').toUpperCase());
      const safeDate=escapeHTML(item.date||'Recently');
      const safeScore=escapeHTML(item.score||'—');
      return `<button class="recent-match" data-action="go-history"><span class="recent-result ${cls}">${result}</span><span class="recent-detail"><b>${safeReason}</b><small>${safeLevel} · ${safeDate}</small></span><strong class="recent-score">${safeScore}</strong><span class="recent-chevron">›</span></button>`;
    }).join('');
    return `<section class="screen home-screen">
      <div class="topbar home-topbar"><button class="icon-btn" data-action="home-menu" aria-label="Open main menu">☰</button><div class="topbar-center">${brand()}</div><button class="icon-btn" data-action="go-settings" aria-label="Game settings">⚙</button></div>

      <div class="home-welcome"><div><span class="eyebrow">WELCOME TO THE ROYAL ARENA</span><h2>Your Next Move Starts Here</h2></div><span class="offline-pill"><i></i> OFFLINE PLAY</span></div>

      <div class="home-hero">
        <img src="hero-vip.webp" alt="A golden chess king between ivory and dark wooden knights in a royal palace" fetchpriority="high">
        <div class="hero-topline"><span>✦ ASTROMUL CHESS</span><span>VIP EDITION</span></div>
        <div class="hero-vignette"><div class="hero-copy"><span class="hero-kicker">STRATEGY MEETS ROYALTY</span><strong>Rule The Board.</strong><span class="hero-caption">Challenge The Smart Computer</span></div></div>
      </div>

      <div class="home-play-row">
        <button class="royal-btn play home-play" data-action="play-setup"><span class="play-mark">♟</span><span class="play-copy"><b>PLAY VS COMPUTER</b><small>Choose Your Side · Difficulty · Time</small></span><span class="play-arrow">›</span></button>
        <button class="quick-match-btn" data-action="quick-play"><span class="quick-match-icon">⚡</span><span><b>QUICK MATCH</b><small>Medium · 10 Min</small></span></button>
      </div>

      <section class="home-stats" aria-label="Player statistics">
        <div class="home-stat-card rating-stat"><span class="stat-icon">♛</span><span class="stat-value">${state.rating}</span><span class="stat-label">YOUR RATING</span></div>
        <div class="home-stat-card"><span class="stat-icon">♟</span><span class="stat-value">${games.length}</span><span class="stat-label">MATCHES</span></div>
        <div class="home-stat-card"><span class="stat-icon">✦</span><span class="stat-value">${wins}</span><span class="stat-label">WINS</span></div>
      </section>

      <div class="home-section-heading"><div><span class="eyebrow">YOUR CHESS LOUNGE</span><h3>Explore The Game</h3></div><span class="section-count">${wins}W · ${draws}D · ${losses}L</span></div>
      <div class="home-quick">
        <button class="menu-card" data-action="go-themes"><span class="mi">▦</span><span class="menu-card-copy"><b>Board Themes</b><small>${escapeHTML(themeName)}</small></span><span class="card-chevron">›</span></button>
        <button class="menu-card" data-action="go-pieces"><span class="mi">♞</span><span class="menu-card-copy"><b>Piece Styles</b><small>${escapeHTML(pieceName)}</small></span><span class="card-chevron">›</span></button>
        <button class="menu-card" data-action="go-settings"><span class="mi">⚙</span><span class="menu-card-copy"><b>Game Settings</b><small>Sound · Board · Preferences</small></span><span class="card-chevron">›</span></button>
        <button class="menu-card" data-action="go-help"><span class="mi">▤</span><span class="menu-card-copy"><b>How To Play</b><small>Rules · Moves · Special Plays</small></span><span class="card-chevron">›</span></button>
      </div>

      <section class="home-recent-section">
        <div class="home-section-heading recent-heading"><div><span class="eyebrow">KEEP YOUR PROGRESS</span><h3>Recent Matches</h3></div><button class="text-link" data-action="go-history">VIEW ALL <span>›</span></button></div>
        <div class="home-recent-list">${recent||`<div class="home-empty-history"><span>♜</span><div><b>Your Story Starts With A Move</b><small>Completed matches and results will appear here.</small></div><button data-action="play-setup">PLAY NOW</button></div>`}</div>
      </section>

      <div class="home-footer-row"><span>♛ ASTROMUL · ROYAL CHESS</span><span>BUILT FOR THE LOVE OF CHESS</span></div>
      ${state.overlay==='homeMenu'?renderHomeMenu():''}
    </section>`;
  }
  function renderSetup() {
    const sides=[['w','♙','White'],['random','⇄','Random'],['b','♟','Black']];
    const levels=[['easy','♛','Easy'],['medium','♛♛','Medium'],['hard','♛♛♛','Hard']];
    const times=[[0,'∞','No Limit'],[5,'◷','5 Min'],[10,'◷','10 Min'],[15,'◷','15 Min'],[30,'◷','30 Min']];
    return `<section class="screen scroll-screen">${topbar('back')}
      <div class="setup-banner">♛ &nbsp; Configure Your Match</div>
      <div class="gold-panel choice-panel"><p class="choice-title">Choose Your Side</p><div class="choice-grid cols-3">${sides.map(([v,icon,label])=>`<button class="choice-tile ${state.setup.side===v?'selected':''}" data-action="setup-side" data-value="${v}"><span class="choice-icon">${icon}</span><span>${label}</span></button>`).join('')}</div></div>
      <div class="gold-panel choice-panel"><p class="choice-title">Select Difficulty Level</p><div class="choice-grid cols-3">${levels.map(([v,icon,label])=>`<button class="choice-tile ${state.setup.difficulty===v?'selected':''}" data-action="setup-level" data-value="${v}"><span class="choice-icon">${icon}</span><span>${label}</span></button>`).join('')}</div></div>
      <div class="gold-panel choice-panel"><p class="choice-title">Time Limit · Per Side</p><div class="choice-grid cols-5">${times.map(([v,icon,label])=>`<button class="choice-tile ${state.setup.minutes===v?'selected':''}" data-action="setup-time" data-value="${v}"><span class="choice-icon">${icon}</span><span>${label}</span></button>`).join('')}</div></div>
      <div class="setup-ai-card"><div class="bot-avatar">♟</div><div><strong>AstroMul Smart Opponent</strong><small>${state.setup.difficulty[0].toUpperCase()+state.setup.difficulty.slice(1)} Strategy · ${state.setup.minutes===0?'Unlimited Time':state.setup.minutes+' Minutes Per Side'}</small></div></div>
      <button class="royal-btn play setup-action" data-action="start-game">▶ &nbsp; PLAY NOW</button>
    </section>`;
  }
  function formatTime(seconds) {
    if(seconds===null||seconds===undefined)return '∞';
    const s=Math.max(0,Math.ceil(seconds));
    return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  }
  function displayMap() {
    const out=[];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
      const i=r*8+c; out.push(state.game.playerSide==='w'?i:63-i);
    }
    return out;
  }
  function renderBoard() {
    const g=state.game;
    const legalFrom=g.selected===null?[]:g.legal.filter(m=>m.from===g.selected);
    const targets=new Set(legalFrom.map(m=>m.to));
    const checkedKing=Engine.inCheck(g.pos,g.pos.turn)?g.pos.board.indexOf(g.pos.turn+'k'):-1;
    const cells=displayMap().map((sq,displayIndex)=>{
      const piece=g.pos.board[sq], row=displayIndex>>3, col=displayIndex&7;
      const classes=['square',(row+col)%2===0?'light':'dark'];
      if(g.selected===sq)classes.push('selected');
      if(g.lastMove&&(g.lastMove.from===sq||g.lastMove.to===sq))classes.push('last-move');
      if(sq===checkedKing)classes.push('check');
      if(g.hint&&(sq===g.hint.from||sq===g.hint.to))classes.push(sq===g.hint.from?'hint-from':'hint-to');
      const coord=state.settings.coordinates?`${col===0?Engine.coord(sq)[1]:''}${row===7?Engine.coord(sq)[0]:''}`:'';
      const legalDot=state.settings.showLegalMoves&&targets.has(sq)?'<span class="legal-dot"></span>':'';
      return `<button class="${classes.join(' ')}" data-action="square" data-square="${sq}" aria-label="${Engine.coord(sq)} ${piece?`${piece[0]==='w'?'White':'Black'} ${piece[1]}`:'empty'}">${piece?`<span class="piece ${piece[0]==='w'?'white':'black'}">${PIECES[piece]}</span>`:''}${legalDot}${coord?`<span class="coord">${coord}</span>`:''}</button>`;
    }).join('');
    return `<div class="board-frame theme-${state.theme} pieces-${state.pieceStyle}"><div class="chessboard" role="group" aria-label="Chess board, 8 rows by 8 columns">${cells}</div></div>`;
  }
  function renderNotation() {
    const g=state.game;
    if(!g.san.length)return `<div class="notation-strip"><strong>Moves</strong><span class="notation-entry">Game Started · White To Move</span></div>`;
    const begin=Math.max(0,g.san.length-8);
    const entries=g.san.slice(begin).map((san,index)=>{
      const ply=begin+index, prefix=ply%2===0?`${Math.floor(ply/2)+1}.`:'…';
      return `<span class="notation-entry">${prefix} ${san}</span>`;
    }).join('');
    return `<div class="notation-strip"><strong>Moves</strong>${entries}</div>`;
  }
  function capturedText(color) {
    const list=state.game.captures[color]||[];
    return list.map(piece=>PIECES[piece]).join(' ')||'—';
  }
  function renderGame() {
    const g=state.game, user=g.playerSide, ai=Engine.opposite(user);
    const status=g.paused?'Game Paused':g.thinking?'Computer Is Thinking…':Engine.inCheck(g.pos,g.pos.turn)?'Check!':g.pos.turn===user?'Your Move':'Computer To Move';
    const userTime=g.timers[user], aiTime=g.timers[ai];
    const userActive=!g.paused&&!g.ended&&g.pos.turn===user;
    const aiActive=!g.paused&&!g.ended&&g.pos.turn===ai;
    const lowUser=userTime!==null&&userTime<=20, lowAi=aiTime!==null&&aiTime<=20;
    const repetitionCount=g.reps[Engine.positionKey(g.pos)]||1;
    const claimReason=g.pos.half>=100?'50-Move Rule':repetitionCount>=3?'Threefold Repetition':null;
    return `<section class="screen game-screen">
      <div class="game-top"><button class="icon-btn" data-action="pause" aria-label="Pause game">Ⅱ</button><div class="topbar-center">${brand()}</div><button class="icon-btn" data-action="go-settings" aria-label="Game settings">⚙</button></div>
      <div class="players-bar">
        <div class="player-chip"><div class="player-avatar">♙</div><div class="player-info"><b>You · ${user==='w'?'White':'Black'}</b><small>Rating: ${state.rating}</small></div></div>
        <div class="player-chip ai"><div class="player-info"><b>AstroMul AI · ${ai==='w'?'White':'Black'}</b><small>${g.difficulty[0].toUpperCase()+g.difficulty.slice(1)} Level</small></div><div class="player-avatar bot">♟</div></div>
      </div>
      <div class="timer-strip"><div class="timer-pill ${userActive?'active':''} ${lowUser?'low':''}">◷ <span id="time-user">${formatTime(userTime)}</span></div><span class="difficulty-chip">♟ ${g.difficulty.toUpperCase()}</span><div class="timer-pill ${aiActive?'active':''} ${lowAi?'low':''}">◷ <span id="time-ai">${formatTime(aiTime)}</span></div></div>
      <div class="board-stage">${renderBoard()}</div>
      ${renderNotation()}
      <div class="captured-row"><span>You Took: <span class="captured-pieces">${capturedText(user)}</span></span><span>AI Took: <span class="captured-pieces">${capturedText(ai)}</span></span></div>
      <div class="move-status" id="move-status">${status}${g.san.length?' · '+g.san[g.san.length-1]:''}${claimReason&&g.pos.turn===g.playerSide&&!g.thinking?` · <button class="claim-draw-btn" data-action="claim-draw">Claim Draw</button>`:''}</div>
      <div class="game-controls">
        <button class="control-btn" data-action="undo" ${g.history.length===0?'disabled':''}><span class="ci">↶</span><span>Undo</span></button>
        <button class="control-btn" data-action="hint" ${g.thinking||g.paused||g.ended?'disabled':''}><span class="ci">✦</span><span>Hint</span></button>
        <button class="control-btn" data-action="restart" ${g.ended?'disabled':''}><span class="ci">⟳</span><span>Restart</span></button>
        <button class="control-btn" data-action="go-settings"><span class="ci">⚙</span><span>Settings</span></button>
        <button class="control-btn" data-action="pause"><span class="ci">☰</span><span>Menu</span></button>
      </div>
      ${state.overlay?renderOverlay():''}
    </section>`;
  }
  function renderOverlay() {
    const g=state.game;
    if(state.overlay==='pauseMenu') return `<div class="overlay"><div class="dialog menu-dialog"><div class="dialog-icon">♛</div><h2>Game Paused</h2><button class="royal-btn play" data-action="resume">▶ &nbsp; Resume Game</button><div class="dialog-menu-grid"><button class="royal-btn" data-action="new-game">✦ &nbsp; New Game</button><button class="royal-btn" data-action="restart">⟳ &nbsp; Restart</button><button class="royal-btn" data-action="undo">↶ &nbsp; Undo Move</button><button class="royal-btn" data-action="hint" ${g.pos.turn===g.playerSide?'':'disabled'}>✧ &nbsp; Hint</button><button class="royal-btn" data-action="go-themes">▦ &nbsp; Board Themes</button><button class="royal-btn" data-action="go-pieces">♞ &nbsp; Piece Styles</button><button class="royal-btn" data-action="go-settings">⚙ &nbsp; Game Settings</button><button class="royal-btn" data-action="go-help">▤ &nbsp; How To Play</button><button class="royal-btn" data-action="go-history">▣ &nbsp; Game History</button><button class="royal-btn" data-action="export-pgn" ${g.san.length?'':'disabled'}>⇩ &nbsp; Export PGN</button></div><button class="royal-btn danger" data-action="exit-confirm">⌂ &nbsp; Back To Home</button></div></div>`;
    if(state.overlay==='restartConfirm') return `<div class="overlay"><div class="dialog"><div class="dialog-icon">⟳</div><h2>Restart Game?</h2><p>Are You Sure You Want To Restart The Current Game?</p><p class="warning">Your Progress Will Be Lost.</p><div class="dialog-actions"><button class="royal-btn danger" data-action="close-overlay">✕ &nbsp; Cancel</button><button class="royal-btn play" data-action="confirm-restart">⟳ &nbsp; Restart</button></div></div></div>`;
    if(state.overlay==='exitConfirm') return `<div class="overlay"><div class="dialog"><div class="dialog-icon">⌂</div><h2>Main Menu?</h2><p>Are You Sure You Want To Go To The Main Menu?</p><p class="warning">The Current Game Will Be Lost.</p><div class="dialog-actions"><button class="royal-btn danger" data-action="close-overlay">✕ &nbsp; Cancel</button><button class="royal-btn play" data-action="confirm-exit">⌂ &nbsp; Main Menu</button></div></div></div>`;
    if(state.overlay==='promotion') return `<div class="overlay"><div class="dialog"><div class="dialog-icon">♛</div><h2>Promote Your Pawn</h2><p>Choose The New Piece</p><div class="choice-grid cols-3" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-top:12px">${['q','r','b','n'].map(type=>`<button class="choice-tile" data-action="promote" data-value="${type}"><span class="choice-icon" style="font-size:30px">${PIECES[g.playerSide+type]}</span><span>${({q:'Queen',r:'Rook',b:'Bishop',n:'Knight'})[type]}</span></button>`).join('')}</div></div></div>`;
    return '';
  }
  function renderHomeMenu() {
    return `<div class="overlay"><div class="dialog menu-dialog"><div class="dialog-icon">✦</div><h2>AstroMul Chess</h2><button class="royal-btn" data-action="go-themes">▦ &nbsp; Board Themes</button><button class="royal-btn" data-action="go-pieces">♞ &nbsp; Piece Styles</button><button class="royal-btn" data-action="go-settings">⚙ &nbsp; Game Settings</button><button class="royal-btn" data-action="go-history">▤ &nbsp; Game History</button><button class="royal-btn" data-action="go-help">? &nbsp; How To Play</button><button class="royal-btn danger" data-action="close-home-menu">✕ &nbsp; Close</button></div></div>`;
  }
  function renderThemes() {
    return `<section class="screen scroll-screen">${topbar('back')}<div class="section-ribbon">▦ &nbsp; Board Themes</div>
      <div class="theme-grid">${THEMES.map(theme=>`<button class="theme-card ${state.selectedTheme===theme.id?'selected':''}" data-action="select-theme" data-value="${theme.id}"><div class="theme-preview" style="--p-light:${theme.light};--p-dark:${theme.dark}"></div><b>${theme.name}</b></button>`).join('')}</div>
      <button class="royal-btn play apply-action" data-action="apply-theme">✓ &nbsp; APPLY THEME</button>
    </section>`;
  }
  function renderPieces() {
    return `<section class="screen scroll-screen">${topbar('back')}<div class="section-ribbon">♞ &nbsp; Piece Styles</div>
      <div class="piece-grid">${STYLES.map(style=>`<button class="piece-card ${state.selectedPieceStyle===style.id?'selected':''}" data-action="select-piece" data-value="${style.id}"><div class="piece-preview" style="--preview-white:${style.white};--preview-black:${style.black}"><span class="preview-white">♔♘</span><span class="preview-black">♚♞</span></div><b>${style.name}</b></button>`).join('')}</div>
      <button class="royal-btn play apply-action" data-action="apply-piece">✓ &nbsp; APPLY STYLE</button>
    </section>`;
  }
  function renderSettings() {
    const setting=(key,title,desc)=>`<div class="preference-row"><div><strong>${title}</strong><small>${desc}</small></div><button class="toggle ${state.settings[key]?'on':''}" data-action="toggle-setting" data-value="${key}" aria-label="Toggle ${title}"></button></div>`;
    return `<section class="screen scroll-screen">${topbar('back')}<div class="section-ribbon">⚙ &nbsp; Game Settings</div>
      <div class="preference-list">
        ${setting('sound','Sound Effects','Play A Soft Sound After Each Move')}
        ${setting('coordinates','Board Coordinates','Show Board Letters And Numbers')}
        ${setting('showLegalMoves','Legal Move Highlights','Show Valid Destinations When A Piece Is Selected')}
        ${setting('confirmExit','Confirm Before Leaving','Ask Before Returning To The Main Menu')}
      </div>
      <div class="info-card"><h3>Current Game Profile</h3><p>Board Theme: ${THEMES.find(x=>x.id===state.theme).name}<br>Piece Style: ${STYLES.find(x=>x.id===state.pieceStyle).name}<br>Player Rating: ${state.rating}</p></div>
      <button class="royal-btn" data-action="go-history">▤ &nbsp; Open Game History</button>
    </section>`;
  }
  function renderHelp() {
    return `<section class="screen scroll-screen">${topbar('back')}<div class="section-ribbon">▤ &nbsp; How To Play</div>
      <div class="info-card"><h3>♛ The Goal</h3><p>Checkmate The Opponent’s King. Check Means The King Is Under Attack; Checkmate Means There Is No Legal Move That Can Save It.</p></div>
      <div class="info-card"><h3>♞ How The Pieces Move</h3><ul><li><b>King:</b> One Square In Any Direction.</li><li><b>Queen:</b> Any Number Of Squares Horizontally, Vertically Or Diagonally.</li><li><b>Rook:</b> Horizontally Or Vertically.</li><li><b>Bishop:</b> Diagonally.</li><li><b>Knight:</b> In An L Shape; It Can Jump Over Pieces.</li><li><b>Pawn:</b> Forward One Square, Or Two From Its Starting Square; Captures Diagonally.</li></ul></div>
      <div class="info-card"><h3>✦ Special Moves</h3><ul><li><b>Castling:</b> The King And Rook Move Together When The King Has Not Moved, The Path Is Clear, And The King Does Not Cross An Attacked Square.</li><li><b>En Passant:</b> A Pawn Can Capture A Pawn That Just Advanced Two Squares, On The Very Next Move.</li><li><b>Promotion:</b> A Pawn Reaching The Last Rank Can Become A Queen, Rook, Bishop Or Knight.</li></ul></div>
      <div class="info-card"><h3>Touch Controls</h3><p>Tap One Of Your Pieces To See Its Legal Destinations. Tap A Highlighted Square To Move. Use Undo To Take Back Your Last Turn, Hint For A Suggested Move, And Menu To Pause Or Open Other Options.</p></div>
    </section>`;
  }
  function renderHistory() {
    const rows=state.history.slice(0,30).map((item,index)=>{
      const moves=(item.moves||[]).slice(0,10).join(' · ');
      return `<div class="history-item"><span><b class="${item.result==='Win'?'result-win':item.result==='Loss'?'result-loss':''}">${item.result}</b><small>${item.reason} · ${item.level}</small>${moves?`<small class="history-moves">${moves}</small>`:''}</span><span class="history-meta">${item.score}<small>${item.date}</small>${item.moves?.length?`<button class="history-export" data-action="export-history-pgn" data-index="${index}">PGN ⇩</button>`:''}</span></div>`;
    }).join('');
    return `<section class="screen scroll-screen">${topbar('back')}<div class="section-ribbon">▤ &nbsp; Game History</div><div class="history-list">${rows||'<div class="empty-state">No Games Played Yet</div>'}</div><button class="royal-btn" data-action="clear-history" ${state.history.length?'':'disabled'}>⌫ &nbsp; Clear History</button>${state.game&&state.game.san.length?'<button class="royal-btn" data-action="export-pgn">⇩ &nbsp; Export Current Game As PGN</button>':''}</section>`;
  }
  function renderResult() {
    const g=state.game, win=g.result==='win', draw=g.result==='draw';
    const title=win?'You Win!':draw?'Draw!':'You Lose!';
    const score=win?'1 – 0':draw?'½ – ½':'0 – 1';
    const delta=state.lastRatingChange;
    const subtitle=win?(g.reason==='Checkmate'?'Checkmate!':g.reason):draw?`${g.reason} — A Well-Fought Game.`:`${g.reason} — Better Luck Next Time!`;
    return `<section class="screen result-screen ${g.result}"><div class="logo-lockup"><span class="brand-small">✦ A S T R O M U L ✦</span><strong>AstroMul <span>Chess</span> ♞</strong></div><div class="section-ribbon">Game Result</div>
      <div class="result-banner">${title}</div><div class="result-subtitle">${subtitle}</div>
      <div class="result-score gold-panel"><div class="result-person"><div class="avatar">♙</div><b>You</b><small>Rating: ${state.rating}</small></div><div class="score-num">${score}</div><div class="result-person"><div class="avatar">♟</div><b>AstroMul AI</b><small>${g.difficulty.toUpperCase()}</small></div></div>
      <div class="rating-change ${delta<0?'negative':''}">${delta>0?'▲ +'+delta+' Rating Points':delta<0?'▼ '+delta+' Rating Points':'No Rating Change'}</div>
      <div class="result-actions"><button class="royal-btn play" data-action="play-again">▶ &nbsp; ${draw?'REMATCH':'PLAY AGAIN'}</button><button class="royal-btn" data-action="home">⌂ &nbsp; MAIN MENU</button><button class="royal-btn" data-action="go-themes">◈ &nbsp; CHANGE THEME</button></div>
    </section>`;
  }

  function stopClock() {
    clearInterval(state.clockTimer); state.clockTimer=null;
  }
  function stopAi() {
    clearTimeout(state.aiTimer); state.aiTimer=null; state.aiToken++;
    if(state.game)state.game.thinking=false;
  }
  function tickClock() {
    const g=state.game;
    if(!g||state.screen!=='game'||g.paused||g.ended)return;
    const now=Date.now();
    const elapsed=Math.max(0,(now-(g.clockLast||now))/1000); g.clockLast=now;
    const color=g.pos.turn;
    if(g.timers[color]===null)return;
    g.timers[color]=Math.max(0,g.timers[color]-elapsed);
    const userColor=g.playerSide, aiColor=Engine.opposite(userColor);
    const userEl=$('#time-user'), aiEl=$('#time-ai');
    if(userEl)userEl.textContent=formatTime(g.timers[userColor]);
    if(aiEl)aiEl.textContent=formatTime(g.timers[aiColor]);
    if(g.timers[color]<=0) {
      finishGame(color===userColor?'lose':'win','Time Out');
    }
  }
  function startClock() {
    if(!state.game||state.game.paused||state.game.ended)return;
    stopClock(); state.game.clockLast=Date.now();
    state.clockTimer=setInterval(tickClock,250);
  }
  function pauseCurrentGame() {
    const g=state.game; if(!g||g.ended)return;
    tickClock(); if(g.ended)return;
    g.paused=true; stopClock(); stopAi();
  }
  function navigate(screen) {
    const previous=state.screen;
    if(previous==='game'&&screen!=='game')pauseCurrentGame();
    state.navStack.push(previous); state.screen=screen; state.overlay=null; render();
  }
  function resumeGame() {
    const g=state.game; if(!g||g.ended)return;
    g.paused=false; g.clockLast=Date.now(); state.overlay=null; state.screen='game'; render(); startClock();
    if(g.pos.turn!==g.playerSide)scheduleAi();
  }
  function back() {
    const target=state.navStack.pop()||'home'; state.overlay=null; state.screen=target;
    if(target==='game'&&state.game){resumeGame();return;}
    render();
  }
  function startGame() {
    stopAi(); stopClock(); state.navStack=[]; state.overlay=null;
    const side=state.setup.side==='random'?(Math.random()<.5?'w':'b'):state.setup.side;
    const seconds=state.setup.minutes===0?null:state.setup.minutes*60;
    const position=Engine.initialPosition();
    state.game={
      pos:position,playerSide:side,difficulty:state.setup.difficulty,
      initialMinutes:state.setup.minutes,
      timers:{w:seconds,b:seconds},selected:null,legal:Engine.legalMoves(position),
      lastMove:null,history:[],san:[],reps:{},captures:{w:[],b:[]},hint:null,
      paused:false,thinking:false,ended:false,result:null,reason:null,clockLast:Date.now(),pendingPromotion:null
    };
    state.game.reps[Engine.positionKey(position)]=1;
    state.screen='game';render();startClock();
    if(position.turn!==side)scheduleAi();
  }
  function commitMove(move,byAi=false) {
    const g=state.game; if(!g||g.ended||g.paused)return;
    const legal=Engine.legalMoves(g.pos);
    const exact=legal.find(candidate=>candidate.from===move.from&&candidate.to===move.to&&candidate.promotion===move.promotion&&candidate.castle===move.castle&&candidate.epCapture===move.epCapture);
    if(!exact){showToast('That Move Is Not Legal');return;}
    const san=Engine.moveToSAN(g.pos,exact,legal);
    const mover=Engine.colorOf(g.pos.board[exact.from]);
    let captured=exact.epCapture?g.pos.board[exact.to+(mover==='w'?8:-8)]:g.pos.board[exact.to];
    g.history.push({
      pos:Engine.clone(g.pos),timers:{...g.timers},lastMove:g.lastMove,
      sanLength:g.san.length,reps:{...g.reps},captures:{w:g.captures.w.slice(),b:g.captures.b.slice()}
    });
    if(captured)g.captures[mover].push(captured);
    g.pos=Engine.applyMove(g.pos,exact);
    g.lastMove={from:exact.from,to:exact.to};g.san.push(san);
    g.selected=null;g.hint=null;g.pendingPromotion=null;g.legal=Engine.legalMoves(g.pos);
    g.thinking=false;g.clockLast=Date.now();
    const posKey=Engine.positionKey(g.pos);g.reps[posKey]=(g.reps[posKey]||0)+1;
    playMoveSound();
    const gameStatus=Engine.gameState(g.pos,g.reps[posKey]);
    if(gameStatus.over){finishGame(gameStatus.result==='draw'?'draw':gameStatus.result===g.playerSide?'win':'lose',gameStatus.reason);return;}
    render();
    if(g.pos.turn!==g.playerSide)scheduleAi();
  }
  function scheduleAi() {
    const g=state.game;
    if(!g||g.ended||g.paused||g.pos.turn===g.playerSide||g.thinking)return;
    g.thinking=true;g.clockLast=Date.now();render();
    const token=++state.aiToken;
    state.aiTimer=setTimeout(()=>{
      const current=state.game;
      if(token!==state.aiToken||!current||current.ended||current.paused||state.screen!=='game')return;
      const move=Engine.bestMove(current.pos,current.difficulty);
      tickClock();
      if(token!==state.aiToken||current.ended||current.paused)return;
      current.thinking=false;
      if(move)commitMove(move,true);
      else {
        const status=Engine.gameState(current.pos);
        finishGame(status.result==='draw'?'draw':status.result===current.playerSide?'win':'lose',status.reason||'No Legal Moves');
      }
    },180);
  }
  function chooseSquare(square) {
    const g=state.game;
    if(!g||g.ended||g.paused||g.thinking||g.pos.turn!==g.playerSide)return;
    const piece=g.pos.board[square];
    if(g.selected!==null) {
      const candidates=g.legal.filter(m=>m.from===g.selected&&m.to===square);
      if(candidates.length>1){g.pendingPromotion=candidates;state.overlay='promotion';render();return;}
      if(candidates.length===1){commitMove(candidates[0]);return;}
    }
    if(piece&&Engine.colorOf(piece)===g.playerSide){g.selected=square;g.hint=null;render();return;}
    g.selected=null;g.hint=null;render();
  }
  function doUndo() {
    const g=state.game;
    if(!g||!g.history.length){showToast('There Is No Move To Undo');return;}
    stopAi();
    let count=g.pos.turn===g.playerSide?2:1;
    while(count-->0&&g.history.length) {
      const snap=g.history.pop();g.pos=snap.pos;g.timers=snap.timers;g.lastMove=snap.lastMove;
      g.san=g.san.slice(0,snap.sanLength);g.reps=snap.reps;g.captures=snap.captures;
    }
    g.selected=null;g.hint=null;g.pendingPromotion=null;g.legal=Engine.legalMoves(g.pos);
    g.ended=false;g.result=null;g.reason=null;g.paused=false;g.thinking=false;g.clockLast=Date.now();
    state.overlay=null;state.screen='game';render();startClock();
    if(g.pos.turn!==g.playerSide)scheduleAi();
  }
  function askHint() {
    const g=state.game;if(!g||g.ended||g.paused||g.thinking||g.pos.turn!==g.playerSide)return;
    const move=Engine.bestMove(g.pos,g.difficulty==='hard'?'medium':'easy');
    if(!move){showToast('No Legal Hint Available');return;}
    g.hint={from:move.from,to:move.to};g.selected=null;render();
    showToast(`Suggested Move: ${Engine.coord(move.from)} → ${Engine.coord(move.to)}`);
  }
  function restartFromCurrent() {
    const g=state.game;if(!g)return;
    state.setup={side:g.playerSide,difficulty:g.difficulty,minutes:g.initialMinutes};startGame();
  }
  function finishGame(result,reason) {
    const g=state.game;if(!g||g.ended)return;
    stopAi();stopClock();g.ended=true;g.paused=false;g.result=result;g.reason=reason;
    const delta=result==='win'?12:result==='lose'?-12:0;
    state.lastRatingChange=delta;state.rating=Math.max(100,state.rating+delta);
    safeWrite('astromul-vip-rating',state.rating);
    const historyItem={
      result:result==='win'?'Win':result==='lose'?'Loss':'Draw',reason,
      level:g.difficulty,score:result==='win'?'1–0':result==='lose'?'0–1':'½–½',
      playerSide:g.playerSide,moves:g.san.slice(),date:new Date().toLocaleString(),dateISO:new Date().toISOString()
    };
    state.history.unshift(historyItem);state.history=state.history.slice(0,30);
    safeWrite('astromul-vip-history',state.history);
    state.overlay=null;state.navStack=[];state.screen='result';render();
  }
  function exitHome() {
    stopAi();stopClock();state.screen='home';state.overlay=null;state.navStack=[];state.game=null;render();
  }
  function playMoveSound() {
    if(!state.settings.sound)return;
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      const context=new Audio();const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=490;gain.gain.setValueAtTime(.035,context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.07);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.07);
      oscillator.onended=()=>context.close();
    } catch {}
  }
  function buildPGN(playerSide,moves,result,dateValue) {
    const parsedDate=dateValue?new Date(dateValue):new Date();
    const safeDate=Number.isNaN(parsedDate.getTime())?new Date():parsedDate;
    const date=safeDate.toISOString().slice(0,10).replaceAll('-','.');
    const headers=[
      '[Event "AstroMul Chess"]',`[Date "${date}"]`,
      `[White "${playerSide==='w'?'Human':'AstroMul AI'}"]`,
      `[Black "${playerSide==='b'?'Human':'AstroMul AI'}"]`,
      `[Result "${result}"]`
    ];
    const tokens=[];
    moves.forEach((san,index)=>{if(index%2===0)tokens.push(`${Math.floor(index/2)+1}. ${san}`);else tokens[tokens.length-1]+=` ${san}`;});
    return headers.join('\n')+'\n\n'+tokens.join(' ')+' '+result+'\n';
  }
  function savePGN(content,filename='astromul-chess-game.pgn') {
    const url=URL.createObjectURL(new Blob([content],{type:'application/x-chess-pgn'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('PGN Exported');
  }
  function exportPGN() {
    const g=state.game;if(!g||!g.san.length){showToast('No Moves To Export');return;}
    const result=g.result==='win'?(g.playerSide==='w'?'1-0':'0-1'):g.result==='lose'?(g.playerSide==='w'?'0-1':'1-0'):g.result==='draw'?'1/2-1/2':'*';
    savePGN(buildPGN(g.playerSide,g.san,result,new Date()),'astromul-chess-current-game.pgn');
  }
  function exportHistoryPGN(index) {
    const item=state.history[index];if(!item||!item.moves?.length)return;
    const result=item.result==='Win'?(item.playerSide==='w'?'1-0':'0-1'):item.result==='Loss'?(item.playerSide==='w'?'0-1':'1-0'):'1/2-1/2';
    savePGN(buildPGN(item.playerSide||'w',item.moves,result,item.dateISO||item.date),'astromul-chess-history-game.pgn');
  }

  app.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');if(!target)return;
    const action=target.dataset.action,value=target.dataset.value;
    switch(action) {
      case 'home':
        if(state.screen==='game'&&state.game&&!state.game.ended){pauseCurrentGame();state.overlay='exitConfirm';render();}
        else {stopClock();stopAi();state.screen='home';state.overlay=null;state.navStack=[];render();}
        break;
      case 'back':back();break;
      case 'home-menu':state.overlay='homeMenu';render();break;
      case 'close-home-menu':state.overlay=null;render();break;
      case 'play-setup':state.setup={side:'w',difficulty:'medium',minutes:10};navigate('setup');break;
      case 'quick-play':state.setup={side:'w',difficulty:'medium',minutes:10};startGame();break;
      case 'setup-side':state.setup.side=value;render();break;
      case 'setup-level':state.setup.difficulty=value;render();break;
      case 'setup-time':state.setup.minutes=Number(value);render();break;
      case 'start-game':startGame();break;
      case 'go-themes':state.selectedTheme=state.theme;navigate('themes');break;
      case 'go-pieces':state.selectedPieceStyle=state.pieceStyle;navigate('pieces');break;
      case 'go-settings':navigate('settings');break;
      case 'go-help':navigate('help');break;
      case 'go-history':navigate('history');break;
      case 'select-theme':state.selectedTheme=value;render();break;
      case 'apply-theme':state.theme=state.selectedTheme;persistPrefs();back();break;
      case 'select-piece':state.selectedPieceStyle=value;render();break;
      case 'apply-piece':state.pieceStyle=state.selectedPieceStyle;persistPrefs();back();break;
      case 'toggle-setting':state.settings[value]=!state.settings[value];persistPrefs();render();break;
      case 'pause':if(state.game&&!state.game.ended){pauseCurrentGame();state.overlay='pauseMenu';render();}break;
      case 'resume':resumeGame();break;
      case 'restart':if(state.game&&!state.game.ended){pauseCurrentGame();state.overlay='restartConfirm';render();}break;
      case 'confirm-restart':restartFromCurrent();break;
      case 'close-overlay':if(state.overlay==='promotion'){state.overlay=null;state.game.pendingPromotion=null;render();}else resumeGame();break;
      case 'exit-confirm':if(state.game){pauseCurrentGame();state.overlay='exitConfirm';render();}break;
      case 'confirm-exit':exitHome();break;
      case 'new-game':state.setup={side:state.game.playerSide,difficulty:state.game.difficulty,minutes:state.game.initialMinutes};navigate('setup');break;
      case 'undo':if(state.overlay==='pauseMenu'){state.overlay=null;}doUndo();break;
      case 'hint':if(state.overlay==='pauseMenu'){state.overlay=null;state.game.paused=false;startClock();}askHint();break;
      case 'claim-draw':{const g=state.game;if(g&&!g.ended&&g.pos.turn===g.playerSide){const rep=g.reps[Engine.positionKey(g.pos)]||1;const reason=g.pos.half>=100?'50-Move Rule':rep>=3?'Threefold Repetition':null;if(reason)finishGame('draw','Draw Claimed · '+reason);else showToast('A Draw Cannot Be Claimed Yet');}break;}
      case 'square':chooseSquare(Number(target.dataset.square));break;
      case 'promote':{
        const move=(state.game?.pendingPromotion||[]).find(m=>m.promotion===value);
        if(state.game){state.overlay=null;state.game.pendingPromotion=null;}
        if(move)commitMove(move);else render();
        break;
      }
      case 'play-again':restartFromCurrent();break;
      case 'clear-history':state.history=[];safeWrite('astromul-vip-history',[]);render();showToast('Game History Cleared');break;
      case 'export-pgn':exportPGN();break;
      case 'export-history-pgn':exportHistoryPGN(Number(target.dataset.index));break;
    }
  });

  // Pause and resume the game when the browser tab is backgrounded.
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&state.screen==='game'&&state.game&&!state.game.paused&&!state.game.ended){pauseCurrentGame();state.overlay='pauseMenu';render();}
  });
  window.addEventListener('pagehide',()=>{if(state.game&&!state.game.paused&&!state.game.ended)pauseCurrentGame();});

  render();
  state.splashTimer=setTimeout(()=>{if(state.screen==='splash'){state.screen='home';render();}},1250);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();
