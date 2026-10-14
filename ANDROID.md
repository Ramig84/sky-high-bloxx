# Sky Bloxx — Android (Play Store)

The Android app is a Capacitor shell that loads the published game
(`https://sky-high-bloxx.lovable.app`). Because coins, accounts and the
leaderboard live in the cloud, the installed app needs internet — same as
the web version.

## How builds work

GitHub builds everything automatically via `.github/workflows/android.yml`:

- Every push to `main` (or manually: Actions → Android build → Run workflow)
  produces two downloadable files under the workflow run's **Artifacts**:
  - `sky-bloxx-debug-apk` — install on a phone directly for testing.
  - `sky-bloxx-release-aab` — the file you upload to the Play Console.

## One-time setup: signing key (required for Play Store)

Google Play requires the AAB to be signed with your own upload key.

1. On any computer with Java installed, generate a keystore (keep it safe —
   losing it means you can never update the app again):

   ```bash
   keytool -genkey -v -keystore sky-bloxx.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias skybloxx
   ```

2. Convert it to base64:

   ```bash
   base64 -w 0 sky-bloxx.jks > keystore.b64
   ```

3. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `ANDROID_KEYSTORE_BASE64` — contents of `keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD` — the keystore password you chose
   - `ANDROID_KEY_ALIAS` — `skybloxx`
   - `ANDROID_KEY_PASSWORD` — the key password

4. Push any change (or re-run the workflow) — the AAB comes out signed.

## Play Console checklist

- Create the app in [Play Console](https://play.google.com/console) with
  package name `app.lovable.skyhighbloxx`.
- Upload the signed AAB to an internal testing track first.
- Store listing: use `public/game-icon-512.png` as the app icon and take
  phone screenshots from the published game.
- Declare that the app requires internet and (once real ads are enabled)
  that it contains ads.

## Local builds (optional)

If you ever want to build on your own machine instead of GitHub:

```bash
bun install
npx cap add android   # first time only
npx cap sync android
npx cap open android  # opens Android Studio, then Build → Generate Signed Bundle
```
