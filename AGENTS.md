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
- Judge equal-mass balance against rendered contact-overlap intervals and the fixed footing on every gameplay frame; capture each floor's landing bend so artwork and physics share coordinates without contact jumps.
- Animate game transforms through refs and publish HUD changes only on gameplay events, so React commits cannot reset moving objects.
- The game renders on a single 2D canvas using generated illustrated sprites and painted backdrops (no 3D, no vector/CSS art), so stacking stays readable and matches the art direction.
- Keep unused character artwork out of the active artwork manifests and canvas loop, so removed characters incur no downloads or animation work.
- Select phone or higher-resolution tablet WebP artwork at mount while retaining source paintings, so phones avoid tablet downloads.
- Size the canvas from its portrait-constrained container and observe container resizing; keep HUD controls larger on tablets without changing logical motion or landing rules.
- Use painted contact artwork at scene joins, so grounding avoids synthetic frames.
- Derive building floors, street plate and footing from a single approved master painting and match auxiliary sprites to it, so independent asset generation cannot fragment the scene's visual language.
- Render celebration particles from a compact painted-paper sprite sheet rather than synthetic colored rectangles, so effects share the scene's material language.
- Endless-mode rules live in the browser-safe src/game/endless.ts with tests; leaderboard scores go to the endless_scores table (public read/insert, score capped per floor) so no sign-in is needed.
