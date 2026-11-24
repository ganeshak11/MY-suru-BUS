# Android builds (GitHub Actions + Gradle)

The driver and passenger APKs are built on GitHub's runners by
[`.github/workflows/android.yml`](../.github/workflows/android.yml). There is no EAS:
each build runs `expo prebuild` to generate the native project, then `./gradlew assembleRelease`.

## Getting an APK

- **Automatically:** every push to `main` that touches `driver-app/` or `passenger-app/` builds both apps.
- **By hand:** go to GitHub → **Actions → Android APKs → Run workflow**, and pick `both`, `driver-app` or `passenger-app`.

When the run finishes, download the APK from the run's **Artifacts** section, or use the CLI:

```bash
gh run download <run id> -D apk && adb install -r apk/*/*.apk
```

Each run's summary shows the file name, size, signing key and backend URL.

| | |
|---|---|
| Backend baked in | `EXPO_PUBLIC_API_BASE_URL` in the workflow's `env:` |
| `versionName` | `expo.version` in the app's `app.json` |
| `versionCode` | the workflow run number (always increases, so new builds install as updates) |
| ABIs | `arm64-v8a` (64-bit phones; 32-bit `armeabi-v7a` left out to halve build time) |
| Artifacts kept | 30 days |

## Signing (do this once)

Without signing secrets, the APK is signed with a debug key. It installs fine, but Android only
installs an update over an existing app if both are signed with the **same key**, and debug keys
can differ between runs. To get updates that install cleanly, create one release key and store it
as repository secrets.

1. Create the keystore. Keep the file and passwords somewhere safe, such as a password manager.
   If you lose them, installed apps can't be updated; they have to be uninstalled first.

   ```bash
   keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
     -keystore mysurubus-release.jks -alias mysurubus
   ```

2. Add the four secrets. `gh secret set` prompts for each value, so nothing ends up in your shell history:

   ```bash
   base64 -w0 mysurubus-release.jks | gh secret set MYSURUBUS_KEYSTORE_B64
   ```
   ```bash
   gh secret set MYSURUBUS_KEYSTORE_PASSWORD
   ```
   ```bash
   gh secret set MYSURUBUS_KEY_ALIAS
   ```
   ```bash
   gh secret set MYSURUBUS_KEY_PASSWORD
   ```

   The alias is `mysurubus` if you used the command above.

3. Run the workflow again. The summary should say **Signed with: release key**.

`*.jks` is already in `.gitignore`. Never commit the keystore.

## Building locally

You need the Android SDK (platform 36, NDK 27.1) and JDK 17.

```bash
cd driver-app && npm ci && EXPO_PUBLIC_API_BASE_URL=https://mysurubus-backend-720g.onrender.com/api npm run build:android
```

The APK lands in `android/app/build/outputs/apk/release/`. The generated `android/` folder is
git-ignored; `expo prebuild --clean` regenerates it from `app.json` each time, so put native
changes in `app.json` or a config plugin, never in `android/` directly.

## Over-the-air updates

EAS Update is switched off (`"updates": { "enabled": false }` in each `app.json`). Every APK ships
its own JavaScript bundle, so a JS change reaches phones only when they install a new APK.
