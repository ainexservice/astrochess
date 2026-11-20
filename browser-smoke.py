from playwright.sync_api import sync_playwright
from pathlib import Path
import base64, json, re
ROOT=Path(__file__).resolve().parent
html=(ROOT/'index.html').read_text()
css=(ROOT/'styles.css').read_text()
engine=(ROOT/'chess-engine.js').read_text()
app=(ROOT/'app.js').read_text()
hero=base64.b64encode((ROOT/'hero-vip.webp').read_bytes()).decode()
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','')
html=html.replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','')
html=html.replace('<link rel="apple-touch-icon" href="icon.svg">','')
html=html.replace('<link rel="stylesheet" href="styles.css">',f'<style>{css}</style>')
html=html.replace('<script src="chess-engine.js"></script>',f'<script>{engine}</script>')
html=html.replace('<script src="app.js"></script>',f'<script>{app}</script>')
html=html.replace('src="hero-vip.webp"',f'src="data:image/webp;base64,{hero}"')
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None, args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height,name in [(320,568,'small-android'),(375,667,'iphone-size'),(412,915,'large-phone'),(768,1024,'tablet'),(1280,800,'desktop')]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda err, errors=errors: errors.append(str(err)))
        page.set_content(html,wait_until='load')
        page.wait_for_timeout(1400)
        home=page.locator('.home-screen')
        assert home.count()==1, f'{name}: home screen did not load'
        assert page.locator('.home-hero img').count()==1 and page.locator('.home-hero img').evaluate('(img)=>img.complete && img.naturalWidth>0'), f'{name}: VIP hero art did not load'
        assert page.locator('.home-stats .home-stat-card').count()==3, f'{name}: home statistics missing'
        assert page.locator('.home-quick .menu-card').count()==4, f'{name}: home shortcuts missing'
        assert page.locator('[data-action="quick-play"]').count()==1, f'{name}: quick match missing'
        metrics=page.evaluate('''() => ({vw:innerWidth, vh:innerHeight, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, appw:document.querySelector('.app-shell').clientWidth, homeScroll:document.querySelector('.home-screen').scrollHeight, homeClient:document.querySelector('.home-screen').clientHeight})''')
        assert metrics['sw']<=metrics['cw'], f'{name}: horizontal overflow {metrics}'
        if name in ('small-android','iphone-size'):
            page.screenshot(path=str(ROOT/f'{name}-home.png'),full_page=False)
        page.locator('[data-action="play-setup"]').first.click()
        assert page.locator('.setup-action').count()==1, f'{name}: setup missing'
        page.locator('[data-action="start-game"]').click()
        page.wait_for_timeout(300)
        assert page.locator('.chessboard').count()==1, f'{name}: board missing'
        assert page.locator('.square').count()==64, f'{name}: expected 64 squares'
        box=page.locator('.board-frame').bounding_box()
        assert abs(box['width']-box['height'])<1.5, f'{name}: board not square {box}'
        metrics=page.evaluate('''() => ({vw:innerWidth, vh:innerHeight, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, gameScroll:document.querySelector('.game-screen').scrollHeight, gameClient:document.querySelector('.game-screen').clientHeight, board: (()=>{const r=document.querySelector('.board-frame').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}})(), controls:document.querySelector('.game-controls').getBoundingClientRect().bottom})''')
        assert metrics['sw']<=metrics['cw'], f'{name}: game horizontal overflow {metrics}'
        assert metrics['board']['y']>=0 and metrics['board']['bottom']<=height+2, f'{name}: board offscreen {metrics}'
        assert metrics['controls']<=height+2, f'{name}: controls offscreen {metrics}'
        # Make a legal opening move (the default setup is White).
        page.locator('[data-square="52"]').click(); page.locator('[data-square="36"]').click()
        page.wait_for_timeout(1800)
        notation=page.locator('.notation-strip').inner_text()
        assert 'e4' in notation, f'{name}: user move not recorded: {notation}'
        assert page.locator('.player-chip').count()==2
        page.locator('[data-action="pause"]').first.click()
        assert page.get_by_text('Game Paused').count()>=1, f'{name}: pause modal missing'
        page.locator('[data-action="resume"]').click()
        page.locator('[data-action="go-settings"]').first.click()
        assert page.locator('.preference-row').count()==4, f'{name}: settings missing'
        page.locator('[data-action="back"]').click()
        page.locator('[data-action="pause"]').first.click()
        page.locator('[data-action="go-themes"]').click()
        assert page.locator('.theme-card').count()==6, f'{name}: themes missing'
        page.locator('[data-action="select-theme"][data-value="green"]').click()
        page.locator('[data-action="apply-theme"]').click()
        assert page.locator('.board-frame.theme-green').count()==1, f'{name}: theme did not apply'
        assert not errors, f'{name}: page errors {errors}'
        results.append({'viewport':name,'horizontal_overflow':False,'board_squares':64,'square_board':True,'controls_visible':True,'opening_move_and_ai':'passed','navigation_and_theme':'passed','console_errors':errors})
        page.close()
    browser.close()
print(json.dumps(results,indent=2))
