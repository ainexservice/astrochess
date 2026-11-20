# AstroMul Chess — VIP / Royal Edition

A complete, mobile-first, single-player chess game with a local smart computer opponent and an expanded VIP home dashboard. The project is a static PWA: it has no build step, no external JavaScript package, and no third-party CDN.

## Run It On A Computer

**Quickest method:** Extract the ZIP, extract the ZIP and double-click `index.html` from the location where the files were extracted. Use a recent version of Chrome, Edge, Firefox, or Safari.

For a local web-server session (useful for testing the installable PWA features):

- Windows: double-click `RUN-WINDOWS.bat`.
- macOS / Linux: open a terminal in the folder containing `index.html` and run `python3 -m http.server 8000`, then visit `http://localhost:8000`.

You can also upload the complete folder to any static HTTPS host. Keep all extracted files together in the same directory. This package intentionally has no subfolders.

## Install On A Phone

PWA installation requires the game to be served from HTTPS (or localhost for development). Opening `index.html` directly is enough to play, but does not enable PWA installation or service-worker caching.

- **Android:** Open the hosted HTTPS address in Chrome, then choose **Install App** or **Add To Home Screen** from the browser menu.
- **iPhone / iPad:** Open the hosted HTTPS address in Safari, tap **Share**, then **Add To Home Screen**.

After the first successful hosted load, the service worker caches the game files for offline play.

## Included Features

### Chess Rules And Game Flow

- 8×8 responsive board with square cells and White-at-bottom / Black-at-bottom orientation.
- Legal move generation and validation; illegal moves are rejected.
- Check, checkmate, stalemate, insufficient material, threefold repetition and 50-move draw claims.
- Automatic 75-move and fivefold-repetition draws.
- Castling, en passant, and all four promotion choices (Queen, Rook, Bishop, Knight).
- Selected-piece, legal-destination, last-move, hint and check highlights.
- Algebraic move notation, captured-piece display, undo, restart confirmation and PGN export.

### Smart Computer Opponent

- Easy, Medium and Hard difficulty levels.
- Local alpha-beta search and a position evaluation function.
- The AI only chooses from legal chess moves and can play either colour.
- No internet connection or external chess API is required for gameplay.

### Screens And Personalisation

- Splash, VIP home dashboard, game setup, active game, pause menu, result, settings, help, history, board themes and piece styles.
- Home dashboard with cinematic royal hero artwork, one-tap Quick Match, live local rating / match / win totals, shortcuts to all core sections, and recent match summaries.
- Board and piece selections are shown directly on the Home dashboard.
- Six board themes: Classic Wood, Green Arena, Marble Stone, Dark Wood, Ivory and Royal Blue.
- Six piece material palettes: Classic Wood, Dark Wood, Silver Metal, Golden Royal, Marble White and Obsidian Black.
- Timer choices: No Limit, 5, 10, 15 and 30 minutes per side.
- Sound, coordinates, legal-move highlights and exit-confirmation preferences.
- Result summaries and up to 30 locally saved game records, with move notation and PGN export.

### Responsive And Offline Behaviour

- Layout checks at 320×568, 375×667, 412×915, tablet and desktop viewports.
- Safe-area padding for notches and home indicators.
- The game board remains square; controls stay inside the tested phone viewports.
- Installable PWA manifest, SVG and PNG app icons, and service-worker asset caching.

## Data And Privacy

Settings, local rating and recent game records are stored in the browser's local storage on that device. The game does not send moves or personal data to a server. Clearing browser data can remove locally saved settings and history.

## Build Verification

The project includes repeatable tests in ``:

- `engine-smoke.js`: known chess perft positions, castling, en passant, promotion, checkmate, stalemate, draw thresholds, SAN and legal AI moves.
- `browser-smoke.py`: responsive layout and basic screen flow at five viewport sizes.
- `game-integration.py`: move selection, AI replies, undo, restart confirmation, clock pause/resume, themes, styles, settings and Black-side play.
- `ui-edge-tests.py`: promotion dialog and result / Play Again flow.

The browser smoke scripts use Playwright and a locally installed Chromium. The app itself has no Playwright or Node runtime dependency. `home-dashboard.py` specifically checks the VIP homepage, its one-tap Quick Match, dashboard links, return navigation and menu.

## Release Scope — Important

This deliverable is the **web/PWA edition**, not a signed native Android APK/AAB or iOS IPA. It is an offline, single-player game against the computer. Online multiplayer, accounts, cloud sync, payments, rankings across users and a server-side leaderboard are not part of this build. The piece-style options are visual material/color treatments of the chess glyphs, not separate 3D piece models. The displayed rating is a local casual-game score adjustment, not an official FIDE rating.
