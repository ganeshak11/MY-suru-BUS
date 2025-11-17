# 🚀 Quick Start Guide

Get your MY(suru) BUS website up and running in 5 minutes!

## Step 1: Update Download Links (2 minutes)

Open `js/script.js` and update these lines:

```javascript
// Line 67-68
const DRIVER_APK_URL = 'YOUR_DRIVER_APP_DOWNLOAD_URL';
const PASSENGER_APK_URL = 'YOUR_PASSENGER_APP_DOWNLOAD_URL';
```

**Where to host your APK files:**
- GitHub Releases (Recommended)
- Google Drive (Make sure link is direct download)
- Your own server
- Firebase Storage

## Step 2: Test Locally (1 minute)

```bash
cd website
npm start
```

This will open `http://localhost:8000` in your browser.

**No npm?** Just open `index.html` in your browser!

## Step 3: Deploy (2 minutes)

### Easiest: Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Done! 🎉

### Alternative: Netlify Drag & Drop

1. Go to https://app.netlify.com/drop
2. Drag the `website` folder
3. Done! 🎉

## Step 4: Share Your Link! 🌐

Your website is now live! Share it with:
- Users
- Social media
- App stores (as website link)

---

## 🎨 Customization (Optional)

### Change Colors
Edit `css/style.css` (Lines 2-25):
```css
:root {
    --primary: #C8B6E2;        /* App primary color */
    --primary-dark: #8a63d2ff; /* App primary dark */
    --secondary: #895fd8ff;    /* App secondary */
}
```

**Note**: Colors already match your Driver/Passenger apps! 🎨

### Add Your Logo
1. Save logo as `assets/images/logo.png`
2. Update `index.html` (Line 28):
```html
<img src="assets/images/logo.png" alt="Logo">
```

### Add Screenshots
1. Take screenshots of your apps
2. Save in `assets/screenshots/`
3. Add to HTML (optional)

---

## 📱 Test Checklist

- [ ] Download buttons work
- [ ] Theme toggle works
- [ ] Mobile responsive
- [ ] All links work
- [ ] Animations smooth

---

## 🆘 Need Help?

**Common Issues:**

1. **Download links don't work**
   - Check URLs in `js/script.js`
   - Make sure links are direct downloads

2. **Styles look broken**
   - Clear browser cache (Ctrl+Shift+R)
   - Check file paths

3. **Can't deploy**
   - Make sure you're in the `website` folder
   - Check internet connection

---

## 🎉 You're Done!

Your website is live and ready to attract users!

**Next Steps:**
- Share on social media
- Add to app store listings
- Set up custom domain (optional)
- Add Google Analytics (optional)

---

**Need more help?** Check `DEPLOYMENT.md` for detailed guides!
