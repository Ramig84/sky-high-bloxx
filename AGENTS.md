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
- Animate game transforms through refs and publish HUD changes only on gameplay events, so React commits cannot reset moving objects.
- The game renders on a single 2D canvas using generated illustrated sprites and painted backdrops (no 3D, no vector/CSS art), so stacking stays readable and matches the art direction.
- Character animation uses aligned, source-clipped painted poses with stable canvas dimensions and grounded takeoff/landing phases, so changing limbs does not become sprite sliding or cast flicker.
- Keep spectator mood selection in a tested browser-safe module and clip six grounded poses from one consistent two-person sheet, so landing reactions preserve the cast.
- Select phone or higher-resolution tablet WebP artwork at mount while retaining source paintings, so phones avoid tablet downloads.
- Size the canvas from its portrait-constrained container and observe container resizing; keep HUD controls larger on tablets without changing logical motion or landing rules.
