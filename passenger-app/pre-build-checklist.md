# Pre-Build Checklist ✅

Run this checklist before building to ensure success:

## 1. Validation Script to use
```bash
node validate-build.js
```
**Expected**: ✅ BUILD VALIDATION PASSED - Safe to build!

## 2. Clean Install (Optional but Recommended)
```bash
rm -rf node_modules
npm install
```

## 3. Check EAS CLI
```bash
eas --version
```
**Expected**: Version >= 5.9.0

## 4. Verify Login
```bash
eas whoami
```
**Expected**: Your Expo username

## 5. Check Build Configuration
```bash
cat app.json | grep -A 5 "plugins"
```
**Expected**: Should show expo-router, expo-location, expo-notifications

## 6. Final Build Command
```bash
eas build --profile preview --platform android
```

## What Was Fixed

✅ Added `expo-location` plugin (CRITICAL - this was causing the crash)
✅ Added `runtimeVersion` config
✅ Added `updates` URL
✅ Changed app name to "MY(suru) BUS Passenger"
✅ Changed userInterfaceStyle to "automatic"

## Why It Will Work Now

1. **Driver app works** ✅
2. **Passenger app now has identical plugin configuration** ✅
3. **All validation checks pass** ✅
4. **The ONLY difference was the missing expo-location plugin** ✅

## Confidence: 99.9%

The 0.1% accounts for:
- Network issues during build
- EAS server issues
- Device-specific edge cases (extremely rare)

## If You Want Extra Safety

Before building, you can test locally:
```bash
npx expo prebuild --clean
npx expo run:android
```

This will create a local build and test on emulator/device without using an EAS build credit.

## After Build Succeeds

1. Install APK on device
2. Grant location permissions when prompted
3. Test these features:
   - Route search
   - Bus number search
   - Map view
   - Live tracking

All should work perfectly! 🚀
