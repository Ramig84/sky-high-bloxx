<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep motion calculations in the browser-safe game motion module with regression tests, so crane attachment and falling remain consistent across frame rates.
- Keep weather trajectories in browser-safe weather logic and draw individual painted rain strokes rather than tiled overlays, so wind direction and frame-rate behavior stay consistent.
- Judge equal-mass balance against rendered contact-overlap intervals and the fixed footing on every gameplay frame; capture each floor's landing bend so artwork and physics share coordinates without contact jumps.
- Animate game transforms through refs and publish HUD changes only on gameplay events, so React commits cannot reset moving objects.
- Animate painted coin collection with CoinCollector and update counter refs only on sprite arrivals; live run coins are previews and only validated finish rewards enter the wallet.
- Coin sprite bundles are apportioned in browser-safe coinFlight logic; labelled bundle amounts sum exactly to each reward and small rewards use one sprite per coin.
- Route recorded audio through independent music/effects gain buses; settings changes update ongoing playback immediately without creating additional audio contexts.
- Anchor water scenery through the backdrop cover transform and derive the live balance meter from rendered contact intervals, so visual feedback shares gameplay coordinates.
- The game renders on a single 2D canvas using generated illustrated sprites and painted backdrops (no 3D, no vector/CSS art), so stacking stays readable and matches the art direction.
- Keep unused character artwork out of the active artwork manifests and canvas loop, so removed characters incur no downloads or animation work.
- Select phone or higher-resolution tablet WebP artwork at mount while retaining source paintings, so phones avoid tablet downloads.
- Size the canvas from its portrait-constrained container and observe container resizing; keep HUD controls larger on tablets without changing logical motion or landing rules.
- Use cropped painted-contact pigment with multiply compositing at scene joins and painted-paper textures for interface surfaces, so grounding and controls avoid synthetic scenery.
- Derive building floors, street plate and footing from a single approved master painting and match auxiliary sprites to it, so independent asset generation cannot fragment the scene's visual language.
- Render celebration particles from a compact painted-paper sprite sheet rather than synthetic colored rectangles, so effects share the scene's material language.
- Endless-mode rules live in the browser-safe src/game/endless.ts with tests; leaderboard scores are posted only via submit_endless_score, which requires a signed-in, finished, server-validated endless run ticket (one score per run), so guests cannot pollute the board.
- Game audio is pre-generated recordings stored as CDN asset pointers in src/assets/audio and mixed through src/game/audio.ts (one Web Audio context), so playback needs no runtime API calls.
- Every screen is wrapped in Preloader with an asset list from src/game/preload.ts and the canvas reuses its decoded images, so screens never appear half-loaded.
- Signed-in coins and Market items live in player_profiles and change only through security-definer functions; game coins are granted only by finish_game_run, which validates a start_game_run ticket (single use, minimum time per floor, level goal, daily caps) and recomputes the reward server-side. Prices and reward formulas are duplicated in SQL and src/game/wallet.ts. Guests keep a phone-only wallet imported once on first sign-in.
- Real ads run only in the native app via AdMob in src/game/ads.ts (unit IDs and testing flag in one place, app ID in AndroidManifest); web keeps the placeholder dialog, and ads never touch wallets, so swapping test IDs for live ones is a two-spot change.
- Keep ad eligibility in browser-safe adPlacements logic and recording gain adjustments in audioMix with regression tests, so placement and mixing rules can be checked without running providers or audio devices.
- Keep completed-run eligibility in browser-safe runPolicy and enforce campaign completion in finish_game_run, so retries never bank unfinished level rewards.
- Pause gameplay through a separate ref from ad previews, so closing an ad cannot resume a manually paused game.
- Derive browser and native Android launcher/adaptive icons and launch screens from the same painted game-icon master; apply scripts/android_artwork.py after Capacitor sync and before packaging, so generated Android defaults cannot replace game identity.
- Android packages prerendered public documents, the full client build and CDN media through scripts/package_android.py; an exact-path native manifest serves only immutable game files at the published origin while API/auth/ad traffic remains online, preserving same-origin security and avoiding mixed game revisions.
- The daily challenge is a District Tour: browser-safe src/game/tour.ts picks one shared district per UTC day (mirrored by SQL tour_district_for, which start_game_run checks), with the level inside it scaled by player progress, so previews tease locked districts fairly.
