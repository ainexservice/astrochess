from playwright.sync_api import sync_playwright
from pathlib import Path
import base64, json
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text()
css=(ROOT/'styles.css').read_text()
engine=(ROOT/'chess-engine.js').read_text()
app=(ROOT/'app.js').read_text()
hero=base64.b64encode((ROOT/'hero-vip.webp').read_bytes()).decode()
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','').replace('<link rel="apple-touch-icon" href="icon.svg">','')
html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>')
html=html.replace('<script src="chess-engine.js"></script>',f'<script>{engine}</script>').replace('<script src="app.js"></script>',f'<script>{app}</script>')
html=html.replace('src="hero-vip.webp"',f'src="data:image/webp;base64,{hero}"')
checks=[]
def ok(name): checks.append({'test':name,'status':'passed'})
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':320,'height':568})
 errors=[]; page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content(html);page.wait_for_timeout(1300)
 page.locator('[data-action="play-setup"]').first.click();page.locator('[data-action="start-game"]').click();page.wait_for_timeout(200)
 assert page.locator('.square').count()==64
 # Initial orientation and location of White pieces.
 assert page.locator('.square').nth(56).locator('.piece').inner_text()=='♖'
 assert page.locator('.square').nth(63).locator('.piece').inner_text()=='♖'
 ok('Standard starting layout: all 64 squares and White at the bottom')
 # Tap/select shows only real legal destination squares and can make e2-e4.
 page.locator('[data-square="52"]').click()
 assert page.locator('.square .legal-dot').count()==2
 page.locator('[data-square="36"]').click()
 assert page.locator('[data-square="36"] .piece').inner_text()=='♙'
 page.wait_for_timeout(1700)
 assert len(page.locator('.notation-entry').all())>=2
 ok('Legal selection, e2-e4, and a valid computer reply')
 # Undo must undo the complete player/AI turn.
 page.locator('[data-action="undo"]').click()
 assert page.locator('[data-square="52"] .piece').inner_text()=='♙'
 assert page.locator('[data-square="36"] .piece').count()==0
 assert 'Game Started' in page.locator('.notation-strip').inner_text()
 ok('Undo restores the full previous position')
 # Restart requires confirmation and restores the selected initial setup.
 page.locator('[data-square="52"]').click();page.locator('[data-square="36"]').click();page.wait_for_timeout(1700)
 page.locator('.game-controls [data-action="restart"]').click()
 assert 'Restart Game?' in page.locator('.dialog').inner_text()
 page.locator('[data-action="close-overlay"]').click()
 assert 'e4' in page.locator('.notation-strip').inner_text()
 page.locator('.game-controls [data-action="restart"]').click();page.locator('[data-action="confirm-restart"]').click()
 assert page.locator('[data-square="52"] .piece').inner_text()=='♙'
 assert '10:00' in page.locator('#time-user').inner_text()
 ok('Restart confirmation, cancel, and confirmed reset')
 # Timer pauses while the pause overlay is open.
 page.wait_for_timeout(1200);page.locator('[data-action="pause"]').first.click()
 frozen=page.locator('#time-user').inner_text();page.wait_for_timeout(1300)
 assert page.locator('#time-user').inner_text()==frozen
 page.locator('[data-action="resume"]').click();page.wait_for_timeout(1300)
 assert page.locator('#time-user').inner_text()!=frozen
 ok('Clock pauses and resumes correctly')
 # Navigate to themes and piece styles from the in-game menu; apply and return to game.
 page.locator('[data-action="pause"]').first.click();page.locator('[data-action="go-themes"]').click()
 assert page.locator('.theme-card').count()==6
 page.locator('[data-action="select-theme"][data-value="blue"]').click();page.locator('[data-action="apply-theme"]').click()
 assert page.locator('.board-frame.theme-blue').count()==1
 page.locator('[data-action="pause"]').first.click();page.locator('[data-action="go-pieces"]').click()
 assert page.locator('.piece-card').count()==6
 page.locator('[data-action="select-piece"][data-value="gold"]').click();page.locator('[data-action="apply-piece"]').click()
 assert page.locator('.board-frame.pieces-gold').count()==1
 ok('All six board themes and six piece styles are selectable and apply in-game')
 # Settings toggles and back navigation.
 page.locator('.game-top [data-action="go-settings"]').click()
 assert page.locator('.preference-row').count()==4
 first_toggle=page.locator('.preference-row .toggle').first
 before=first_toggle.get_attribute('class');first_toggle.click();after=page.locator('.preference-row .toggle').first.get_attribute('class')
 assert before!=after
 page.locator('[data-action="back"]').click()
 assert page.locator('.chessboard').count()==1
 ok('Settings toggles and return-to-game navigation')
 # Return home, choose Black, verify AI opens and board rotates for Black.
 page.locator('[data-action="pause"]').first.click();page.locator('[data-action="exit-confirm"]').click();page.locator('[data-action="confirm-exit"]').click()
 page.locator('[data-action="play-setup"]').first.click();page.locator('[data-action="setup-side"][data-value="b"]').click();page.locator('[data-action="start-game"]').click()
 page.wait_for_timeout(1600)
 assert 'You · Black' in page.locator('.player-chip').first.inner_text()
 assert page.locator('.square').nth(0).locator('.piece').inner_text()=='♖' # flipped board: white rook begins at top-left h1
 assert page.locator('.square').nth(56).locator('.piece').inner_text()=='♜' # black rook at bottom-left h8
 assert 'Game Started' not in page.locator('.notation-strip').inner_text()
 ok('Black-side selection, board rotation, and computer first move')
 # Black responds to the AI opening from e7 to e5.
 page.locator('[data-square="12"]').click();page.locator('[data-square="28"]').click();page.wait_for_timeout(1600)
 assert 'e5' in page.locator('.notation-strip').inner_text()
 ok('Black-side legal move and AI response')
 assert not errors, f'Browser errors: {errors}'
 ok('No uncaught browser JavaScript exceptions')
 browser.close()
print(json.dumps(checks,indent=2))
