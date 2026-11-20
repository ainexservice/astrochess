from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, json
ROOT=Path(__file__).resolve().parent
h=(ROOT/'index.html').read_text(); css=(ROOT/'styles.css').read_text(); engine=(ROOT/'chess-engine.js').read_text(); app=(ROOT/'app.js').read_text().replace('  render();\n  state.splashTimer=', '  window.__ASTROMUL_TEST__={state,render,finishGame};\n  render();\n  state.splashTimer=')
hero=base64.b64encode((ROOT/'hero-vip.webp').read_bytes()).decode()
h=h.replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','').replace('<link rel="apple-touch-icon" href="icon-192.png">','')
h=h.replace('<link rel="preload" as="image" href="hero-vip.webp" fetchpriority="high">','')
h=h.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>')
h=h.replace('<script src="chess-engine.js"></script>',f'<script>{engine}</script>').replace('<script src="app.js"></script>',f'<script>{app}</script>')
h=h.replace('src="hero-vip.webp"',f'src="data:image/webp;base64,{hero}"')
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None, args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':390,'height':844}); errs=[]; page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(h,wait_until='load'); page.wait_for_timeout(1350)
 assert page.locator('.home-screen').count()==1
 assert page.locator('.home-hero img').evaluate('(img)=>img.complete&&img.naturalWidth>0')
 assert page.locator('.home-stats .home-stat-card').count()==3
 assert page.locator('.home-quick .menu-card').count()==4
 assert page.locator('.home-recent-section').count()==1
 checks.append('Home dashboard, VIP hero asset, player statistics, quick links and recent-match panel load')
 page.screenshot(path=str(ROOT/'home-dashboard-preview.png'),full_page=False)
 page.locator('[data-action="quick-play"]').click(); page.wait_for_timeout(250)
 assert page.locator('.chessboard').count()==1 and page.locator('.square').count()==64
 assert 'MEDIUM' in page.locator('.difficulty-chip').inner_text()
 assert page.locator('#time-user').inner_text().startswith('09:') or page.locator('#time-user').inner_text()=='10:00'
 page.screenshot(path=str(ROOT/'home-dashboard-game.png'),full_page=False)
 checks.append('One-tap Quick Match launches a real 10-minute Medium game')
 page.evaluate("window.__ASTROMUL_TEST__.finishGame('win','Checkmate')")
 assert page.locator('.result-banner').inner_text()=='You Win!'
 page.locator('[data-action=\"home\"]').click()
 assert page.locator('.home-stat-card .stat-value').nth(0).inner_text()=='1212'
 assert page.locator('.home-stat-card .stat-value').nth(1).inner_text()=='1'
 assert page.locator('.home-stat-card .stat-value').nth(2).inner_text()=='1'
 assert page.locator('.recent-match').count()==1 and 'Checkmate' in page.locator('.recent-match').inner_text()
 checks.append('Completed match updates rating, game count, wins and Recent Matches on Home')
 assert page.locator('.home-screen').count()==1
 for action, selector, count in [('go-themes','.theme-card',6),('go-pieces','.piece-card',6),('go-settings','.preference-row',4),('go-help','.info-card',4),('go-history','.history-list',1)]:
  page.locator(f'[data-action="{action}"]').first.click()
  assert page.locator(selector).count()==count, f'{action}: expected {count} {selector}'
  page.locator('[data-action="back"]').first.click()
  assert page.locator('.home-screen').count()==1, f'{action}: failed to return home'
  checks.append(f'Home shortcut {action} opens its functional screen and returns correctly')
 page.locator('[data-action="home-menu"]').click()
 assert page.locator('.menu-dialog [data-action="go-themes"]').count()==1
 assert page.locator('.menu-dialog [data-action="go-pieces"]').count()==1
 page.locator('[data-action="close-home-menu"]').click()
 checks.append('Hamburger menu retains all additional navigation shortcuts')
 assert not errs, errs
 b.close()
print(json.dumps({'status':'passed','checks':checks,'browser_errors':errs},indent=2))
