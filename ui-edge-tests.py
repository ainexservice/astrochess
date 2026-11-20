from playwright.sync_api import sync_playwright
from pathlib import Path
import base64, json
R=Path(__file__).resolve().parent
h=(R/'index.html').read_text()
h=h.replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','').replace('<link rel="apple-touch-icon" href="icon.svg">','')
h=h.replace('<link rel="stylesheet" href="styles.css">',f'<style>{(R/"styles.css").read_text()}</style>')
h=h.replace('<script src="chess-engine.js"></script>',f'<script>{(R/"chess-engine.js").read_text()}</script>')
app=(R/'app.js').read_text().replace('  render();\n  state.splashTimer=', '  window.__ASTROMUL_TEST__={state,render,finishGame};\n  render();\n  state.splashTimer=')
h=h.replace('<script src="app.js"></script>',f'<script>{app}</script>')
h=h.replace('src="hero-vip.webp"',f'src="data:image/webp;base64,{base64.b64encode((R/"hero-vip.webp").read_bytes()).decode()}"')
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':375,'height':812});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(h);page.wait_for_timeout(1300);page.locator('[data-action="play-setup"]').first.click();page.locator('[data-action="start-game"]').click()
 page.evaluate('''() => {
   const s=window.__ASTROMUL_TEST__.state, e=window.AstroChess, g=s.game;
   const board=Array(64).fill(null);board[e.square('h8')]='bk';board[e.square('h1')]='wk';board[e.square('e7')]='wp';
   g.pos={board,turn:'w',rights:{K:false,Q:false,k:false,q:false},ep:-1,half:0,full:1};
   g.legal=e.legalMoves(g.pos);g.lastMove=null;g.selected=null;g.history=[];g.san=[];g.reps={};g.reps[e.positionKey(g.pos)]=1;g.captures={w:[],b:[]};g.paused=false;g.thinking=false;g.ended=false;g.timers={w:null,b:null};g.clockLast=Date.now();s.overlay=null;s.screen='game';window.__ASTROMUL_TEST__.render();
 }''')
 page.locator('[data-square="12"]').click();page.locator('[data-square="4"]').click()
 assert page.locator('.dialog').inner_text().find('Promote Your Pawn')>=0
 assert page.locator('[data-action="promote"]').count()==4
 page.locator('[data-action="promote"][data-value="q"]').click()
 assert page.locator('[data-square="4"] .piece').inner_text()=='♕'
 assert page.locator('.notation-strip').inner_text().find('=Q')>=0
 checks.append('Pawn promotion chooser offers four pieces and applies Queen promotion')
 page.evaluate("window.__ASTROMUL_TEST__.finishGame('win','Checkmate')")
 assert 'You Win!' in page.locator('.result-banner').inner_text()
 assert 'Checkmate!' in page.locator('.result-subtitle').inner_text()
 assert page.locator('.result-actions [data-action="play-again"]').count()==1
 checks.append('Win result screen renders correctly and offers Play Again')
 page.locator('[data-action="play-again"]').click()
 assert page.locator('.chessboard').count()==1 and page.locator('.square').count()==64
 checks.append('Play Again starts a clean, connected game')
 assert not errors, errors
 b.close()
print(json.dumps({'status':'passed','checks':checks,'browser_errors':errors},indent=2))
