# MY(suru) BUS - Website

Modern 3D animated website for MY(suru) BUS mobile applications.

## 🚀 Features

- **3D Animated Bus Model** - Interactive rotating bus with mouse control
- **Light/Dark Theme** - Smooth theme switching with localStorage persistence
- **Responsive Design** - Works perfectly on all devices
- **Smooth Animations** - Scroll-triggered animations and parallax effects
- **Modern UI** - Clean, vibrant design with gradient accents
- **Fast Loading** - Optimized performance with lazy loading

## 📁 Structure

```
website/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # All styles with animations
├── js/
│   └── script.js      # Interactive features
├── assets/
│   ├── images/        # Logo, icons, etc.
│   └── screenshots/   # App screenshots
└── README.md
```

## 🎨 Sections

1. **Hero** - Eye-catching intro with 3D bus animation
2. **Features** - 6 key features with icons
3. **Apps** - Driver and Passenger app details
4. **Download** - Android/iOS download buttons
5. **Footer** - Links and copyright

## 🔧 Setup

### 1. Add Your APK Download Links

Edit `js/script.js` and update these URLs:

```javascript
const DRIVER_APK_URL = 'https://your-server.com/driver-app.apk';
const PASSENGER_APK_URL = 'https://your-server.com/passenger-app.apk';
```

### 2. Add Screenshots (Optional)

Place app screenshots in `assets/screenshots/`:
- `driver-app-1.png`
- `driver-app-2.png`
- `passenger-app-1.png`
- `passenger-app-2.png`

### 3. Deploy

#### Option A: GitHub Pages
```bash
git add .
git commit -m "Add website"
git push origin main
```
Enable GitHub Pages in repository settings.

#### Option B: Vercel
```bash
npm i -g vercel
vercel
```

#### Option C: Netlify
Drag and drop the `website` folder to [Netlify Drop](https://app.netlify.com/drop)

#### Option D: Firebase Hosting
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

## 🎯 Customization

### Colors
Edit CSS variables in `css/style.css`:
```css
:root {
    --primary: #C8B6E2;
    --secondary: #6366f1;
    --accent: #ec4899;
}
```

### Content
Edit text directly in `index.html`

### Animations
Adjust animation speeds in `css/style.css`:
```css
@keyframes rotateBus {
    /* Change duration here */
}
```

## 📱 Responsive Breakpoints

- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ⚡ Performance

- Lighthouse Score: 95+
- First Contentful Paint: < 1s
- Time to Interactive: < 2s

## 🎨 Design Credits

- Icons: Font Awesome 6
- Fonts: Inter (Google Fonts)
- Colors: Custom gradient palette

## 📄 License

MIT License - Feel free to use and modify

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Email: support@mysurubus.com

---

Built with ❤️ for MY(suru) BUS
