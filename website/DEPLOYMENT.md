# Deployment Guide - MY(suru) BUS Website

## 🚀 Quick Deploy Options

### Option 1: GitHub Pages (FREE)

1. **Push to GitHub**
```bash
cd website
git init
git add .
git commit -m "Initial website commit"
git remote add origin https://github.com/YOUR_USERNAME/mysurubus-website.git
git push -u origin main
```

2. **Enable GitHub Pages**
- Go to repository Settings
- Navigate to Pages section
- Source: Deploy from branch `main`
- Folder: `/` (root)
- Save

3. **Access Your Site**
- URL: `https://YOUR_USERNAME.github.io/mysurubus-website/`

---

### Option 2: Vercel (FREE - RECOMMENDED)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
cd website
vercel
```

3. **Follow Prompts**
- Set up and deploy: Y
- Which scope: Your account
- Link to existing project: N
- Project name: mysurubus-website
- Directory: ./
- Override settings: N

4. **Production Deploy**
```bash
vercel --prod
```

**Your site is live!** Vercel provides:
- Custom domain support
- Automatic HTTPS
- Global CDN
- Instant deployments

---

### Option 3: Netlify (FREE)

#### Method A: Drag & Drop
1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag the `website` folder
3. Done! Get your URL

#### Method B: CLI
```bash
npm install -g netlify-cli
cd website
netlify deploy
```

Follow prompts:
- Create & configure new site: Y
- Team: Your team
- Site name: mysurubus-website
- Deploy path: ./

**Production deploy:**
```bash
netlify deploy --prod
```

---

### Option 4: Firebase Hosting (FREE)

1. **Install Firebase CLI**
```bash
npm install -g firebase-tools
```

2. **Login**
```bash
firebase login
```

3. **Initialize**
```bash
cd website
firebase init hosting
```

Select:
- Use existing project or create new
- Public directory: `.`
- Single-page app: N
- Automatic builds: N

4. **Deploy**
```bash
firebase deploy
```

---

### Option 5: Cloudflare Pages (FREE)

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your GitHub repository
3. Configure:
   - Build command: (leave empty)
   - Build output: `/`
4. Deploy

---

## 📝 Before Deployment Checklist

### 1. Update Download Links
Edit `js/script.js`:
```javascript
const DRIVER_APK_URL = 'YOUR_ACTUAL_DRIVER_APK_URL';
const PASSENGER_APK_URL = 'YOUR_ACTUAL_PASSENGER_APK_URL';
```

### 2. Add Favicon
Create `favicon.ico` and place in root:
```bash
# Use online tool: https://favicon.io/
```

### 3. Add Meta Tags (SEO)
Already included in `index.html`:
- Title
- Description
- Viewport

### 4. Test Locally
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server

# Option 3: VS Code Live Server
# Install "Live Server" extension and click "Go Live"
```

Visit: `http://localhost:8000`

### 5. Optimize Images
- Compress images: [TinyPNG](https://tinypng.com/)
- Convert to WebP for better performance
- Add to `assets/images/`

---

## 🔗 Custom Domain Setup

### For Vercel:
```bash
vercel domains add yourdomain.com
```

### For Netlify:
1. Go to Domain settings
2. Add custom domain
3. Update DNS records

### For GitHub Pages:
1. Add `CNAME` file with your domain
2. Update DNS:
   - Type: A
   - Host: @
   - Value: 185.199.108.153

---

## 📊 Analytics Setup (Optional)

### Google Analytics
Add to `index.html` before `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🔒 HTTPS Setup

All recommended platforms provide automatic HTTPS:
- ✅ Vercel: Automatic
- ✅ Netlify: Automatic
- ✅ GitHub Pages: Automatic
- ✅ Firebase: Automatic
- ✅ Cloudflare: Automatic

---

## 🎯 Performance Optimization

### 1. Enable Caching
Add `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Compress Assets
```bash
# Install gzip
npm install -g gzipper

# Compress
gzipper compress ./website
```

### 3. Minify CSS/JS
```bash
# Install minifier
npm install -g minify

# Minify
minify css/style.css > css/style.min.css
minify js/script.js > js/script.min.js
```

Update `index.html` to use `.min` files.

---

## 🐛 Troubleshooting

### Issue: 404 on GitHub Pages
**Solution**: Check repository settings, ensure branch is correct

### Issue: Styles not loading
**Solution**: Check file paths, use relative paths

### Issue: Download links not working
**Solution**: Update URLs in `js/script.js`

### Issue: Slow loading
**Solution**: 
- Compress images
- Enable CDN
- Minify CSS/JS

---

## 📱 Mobile Testing

Test on:
- Chrome DevTools (F12 → Toggle Device Toolbar)
- [BrowserStack](https://www.browserstack.com/)
- Real devices

---

## 🔄 Continuous Deployment

### GitHub Actions (Auto-deploy on push)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📈 Monitoring

### Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com/) - FREE
- [Pingdom](https://www.pingdom.com/)

### Performance Monitoring
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)

---

## 🎉 Post-Deployment

1. ✅ Test all links
2. ✅ Test download buttons
3. ✅ Test on mobile
4. ✅ Check theme toggle
5. ✅ Verify animations
6. ✅ Test on different browsers
7. ✅ Share with team
8. ✅ Submit to Google Search Console

---

## 📞 Need Help?

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- GitHub Pages: https://pages.github.com

---

**Recommended: Vercel** for best performance and ease of use! 🚀
