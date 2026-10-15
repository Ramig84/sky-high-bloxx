# Sky Bloxx — Android (Play Store)

The Android app is a Capacitor shell that loads the published game
(`https://sky-high-bloxx.lovable.app`). Because coins, accounts and the
leaderboard live in the cloud, the installed app needs internet — same as
the web version.

## Everything happens on GitHub — no coding needed

GitHub builds the app automatically via `.github/workflows/android.yml`.
You only click buttons in the browser.

### Step 1 — Add two password secrets (once)

1. Open your repo on github.com.
2. **Settings → Secrets and variables → Actions**.
3. Click **New repository secret**, twice:
   - Name: `ANDROID_KEYSTORE_PASSWORD` — Secret: any password you choose.
   - Name: `ANDROID_KEY_PASSWORD` — Secret: the same password again.

### Step 2 — Run the build

1. Go to the **Actions** tab → **Android build** → **Run workflow** → **Run workflow**.
2. When it finishes, the run page lists these artifacts to download:
   - `sky-bloxx-debug-apk` — install on your phone to test.
   - `sky-bloxx-release-aab` — unsigned on this first run.
   - `sky-bloxx-signing-key` — your signing key (created for you).

### Step 3 — Save the signing key as a secret (once)

1. Download the `sky-bloxx-signing-key` artifact and unzip it.
2. Open `keystore-base64.txt` in Notepad, select all, copy.
3. Back on GitHub: **Settings → Secrets and variables → Actions →
   New repository secret**.
   - Name: `ANDROID_KEYSTORE_BASE64` — Secret: paste everything you copied.
4. **Keep the `sky-bloxx.jks` file from the same zip safe forever.**
   Losing it means you can never update the app on Google Play again.

### Step 4 — Run the build again

**Actions → Android build → Run workflow.** Now `sky-bloxx-release-aab`
is signed and ready for the Play Console.

## Play Console checklist

The workflow applies the painted game icon to every Android launcher size,
adaptive icon and launch screen before building. If an installed APK shows the
Capacitor default icon, download and install the APK from a new build after
this change; updating the website alone cannot change an installed launcher icon.

1. Create the app in [Play Console](https://play.google.com/console).
   Package name: `app.lovable.skyhighbloxx`.
2. **Testing → Internal testing → Create release** and upload the signed AAB.
3. Keep **Play App Signing** turned on (the default). Your upload key only
   proves uploads come from you.
4. Store listing: use `public/game-icon-512.png` as the app icon and take
   phone screenshots from the published game.
5. Declare that the app requires internet, and (once real ads are enabled)
   that it contains ads.

## Local builds (optional)

If you ever want to build on your own machine instead of GitHub:

```bash
bun install
npx cap add android   # first time only
npx cap sync android
npx cap open android  # opens Android Studio, then Build → Generate Signed Bundle
```
