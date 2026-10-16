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

- Subdirectories have their own AGENTS.md (e.g. src/game/AGENTS.md); read it before changing files there.
- Keep the standalone transition preview isolated from saved campaign progress and rewards, so visual reviews cannot unlock districts or pay coins.
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
