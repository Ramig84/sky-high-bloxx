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

- Read subdirectory AGENTS.md (e.g. src/game/AGENTS.md) before changing files there.
- Release progression/completion follows uninterrupted earned stars in levels.ts; separate testing map helpers bypass access only, never fabricate stars or completion.
- Restore account UI from the SDK's persisted session, publish it before cloud progress requests, and defer auth-event sync outside callbacks; transient user-endpoint failures must not impersonate sign-out, while RLS continues to validate every private request.
- Keep the standalone transition preview isolated from saved campaign progress and rewards, so visual reviews cannot unlock districts or pay coins.
- Endless-mode rules live in the browser-safe src/game/endless.ts with tests; leaderboard scores are posted only via submit_endless_score, which requires a signed-in, finished, server-validated endless run ticket (one score per run), so guests cannot pollute the board.
- Recorded CDN audio uses one context in audio.ts; audioLifecycle gates foreground playback, so leaving silences sound without changing the mix or making runtime API calls.
- Every screen is wrapped in Preloader with an asset list from src/game/preload.ts and the canvas reuses its decoded images, so screens never appear half-loaded.
- Signed-in coins and Market items live in player_profiles and change only through security-definer functions; game coins are granted only by finish_game_run, which validates a start_game_run ticket (single use, minimum time per floor, level goal, daily caps) and recomputes the reward server-side. Prices and reward formulas are duplicated in SQL and src/game/wallet.ts. Guests keep a phone-only wallet imported once on first sign-in.
- Real ads run only natively via AdMob in src/game/ads.ts (unit IDs and testing flag in one place); web keeps the placeholder dialog and ads never touch wallets.
- Keep ad eligibility in browser-safe adPlacements logic and recording gain adjustments in audioMix with regression tests, so placement and mixing rules can be checked without running providers or audio devices.
- Keep completed-run eligibility in browser-safe runPolicy and enforce campaign completion in finish_game_run, so retries never bank unfinished level rewards.
- Pause gameplay through a separate ref from ad previews, so closing an ad cannot resume a manually paused game.
- Derive browser and native Android launcher/adaptive icons and launch screens from the same painted game-icon master; apply scripts/android_artwork.py after Capacitor sync and before packaging, so generated Android defaults cannot replace game identity.
- Android packages prerendered public documents, the full client build and CDN media through scripts/package_android.py; an exact-path native manifest serves only immutable game files at the published origin while API/auth/ad traffic remains online, preserving same-origin security and avoiding mixed game revisions.
- The daily challenge is a District Tour: browser-safe src/game/tour.ts picks one shared district per UTC day (mirrored by SQL tour_district_for, which start_game_run checks), with the level inside it scaled by player progress, so previews tease locked districts fairly.
- Keep altitude/depth/moods in tested browser-safe sky logic; preserve painted scenery. wind.ts owns held-only direction sequencing and shared warnings/weather; level specs retain force magnitude, so wind stays predictable without reward changes.
- Preload district spirit pose atlases through spiritArtwork and animate by selecting whole authored poses, so painted motion never relies on stretching still artwork.
- Clouds and aurora use preloaded whole painted atmosphere poses with in-place dissolves; keep fog and lightning behind gameplay, so no strip seams or washed-out landing silhouettes appear.
- Cache derived star paintings between levels and update balance DOM only when values change, so screen transitions avoid repeated pixel processing and frame-by-frame text replacement.
- Coin collections may overlap without cancelling each other; track pending arrivals per counter and use continuous curved paths, so all exact reward amounts arrive visibly.
- Shared painted poses with continuous wingbeat clocks; bird flight (birdPath) is a full-width horizontal crossing with gentle rise/dip, never near-vertical elevator paths; stationary menu birds under reduced motion; steam anchored to roofs, lanterns/butterflies above streets — scenery stays cohesive without changing obstacles.
- Endless submission status mirrors the leaderboard response and resets per run, so guests/failures never show success.
- Native Google sign-in returns via https /auth/app-return (custom app schemes are rejected), forwarding to the Android app link; src/game/nativeAuth.ts accepts only sign-ins started on this phone.
- Rewarded ads: normal provider completion, then five-second in-game countdown; pause play, cache paintings at full sharpness. No experimental Android wake/layer settings, surface recycling or debugging, so the standard flow stays isolated from game rules.
