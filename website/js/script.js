// Theme Management
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme or default to light
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Mobile Menu Toggle
const mobileToggle = document.getElementById('mobileToggle');
const navMenu = document.querySelector('.nav-menu');
const menuOverlay = document.getElementById('menuOverlay');

mobileToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
});

menuOverlay.addEventListener('click', () => {
    navMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
});

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                navMenu.classList.remove('active');
                menuOverlay.classList.remove('active');
            }
        }
    });
});

// Scroll Animations (AOS-like)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('aos-animate');
        }
    });
}, observerOptions);

document.querySelectorAll('[data-aos]').forEach(el => {
    observer.observe(el);
});

// Navbar Scroll Effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.padding = '10px 0';
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.padding = '15px 0';
    }
    
    lastScroll = currentScroll;
});

// Download Links (Update these with your actual APK URLs)
const driverAndroidBtn = document.getElementById('driverAndroid');
const passengerAndroidBtn = document.getElementById('passengerAndroid');

// Replace these URLs with your actual download links
const DRIVER_APK_URL = 'https://your-server.com/driver-app.apk';
const PASSENGER_APK_URL = 'https://your-server.com/passenger-app.apk';

driverAndroidBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // Show download modal or directly download
    if (confirm('Download MY(suru) BUS Driver App?')) {
        window.location.href = DRIVER_APK_URL;
        trackDownload('driver', 'android');
    }
});

passengerAndroidBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Download MY(suru) BUS Passenger App?')) {
        window.location.href = PASSENGER_APK_URL;
        trackDownload('passenger', 'android');
    }
});

// Analytics (optional)
function trackDownload(app, platform) {
    console.log(`Download tracked: ${app} - ${platform}`);
    // Add your analytics code here (Google Analytics, etc.)
}

// Parallax Effect for Hero
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual) {
        heroVisual.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
});

// 3D Bus Interaction
const bus3d = document.getElementById('bus3d');
let isMouseOver = false;

bus3d.addEventListener('mouseenter', () => {
    isMouseOver = true;
    const busContainer = bus3d.querySelector('.bus-container');
    busContainer.style.animationPlayState = 'paused';
});

bus3d.addEventListener('mouseleave', () => {
    isMouseOver = false;
    const busContainer = bus3d.querySelector('.bus-container');
    busContainer.style.animationPlayState = 'running';
});

bus3d.addEventListener('mousemove', (e) => {
    if (!isMouseOver) return;
    
    const rect = bus3d.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const busContainer = bus3d.querySelector('.bus-container');
    const rotateY = (x - 0.5) * 60;
    const rotateX = (y - 0.5) * -60;
    
    busContainer.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
});

// Feature Cards Tilt Effect
document.querySelectorAll('.feature-card, .app-card, .download-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// Floating Animation for Icons
const floatingIcons = document.querySelectorAll('.float-icon');
floatingIcons.forEach((icon, index) => {
    icon.style.animationDelay = `${index * 0.5}s`;
});

// Loading Animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s';
        document.body.style.opacity = '1';
    }, 100);
});

// Easter Egg: Konami Code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        activateEasterEgg();
    }
});

function activateEasterEgg() {
    const busContainer = document.querySelector('.bus-container');
    busContainer.style.animation = 'rotateBus 1s infinite linear';
    setTimeout(() => {
        busContainer.style.animation = 'rotateBus 20s infinite linear';
    }, 5000);
}

// Performance Optimization: Lazy Load Images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Cursor Trail Effect
const cursorTrail = document.getElementById('cursorTrail');
let mouseX = 0, mouseY = 0;
let trailX = 0, trailY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function animateCursor() {
    trailX += (mouseX - trailX) * 0.1;
    trailY += (mouseY - trailY) * 0.1;
    cursorTrail.style.left = trailX + 'px';
    cursorTrail.style.top = trailY + 'px';
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Particle Effects
const particlesContainer = document.getElementById('particles');
for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 20 + 's';
    particle.style.animationDuration = (15 + Math.random() * 10) + 's';
    particlesContainer.appendChild(particle);
}

// Ripple Effect on Buttons
document.querySelectorAll('.btn, .feature-card, .app-card, .download-card').forEach(element => {
    element.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        this.appendChild(ripple);
        
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Enhanced Parallax Scrolling
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    const floatingIcons = document.querySelectorAll('.float-icon');
    const morphingShapes = document.querySelectorAll('.morphing-shape');
    
    if (heroVisual) {
        heroVisual.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
    
    floatingIcons.forEach((icon, index) => {
        icon.style.transform = `translateY(${scrolled * (0.1 + index * 0.05)}px)`;
    });
    
    morphingShapes.forEach((shape, index) => {
        shape.style.transform = `translateY(${scrolled * (0.2 + index * 0.1)}px) rotate(${scrolled * 0.05}deg)`;
    });
});

// Animated Statistics Counter
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            entry.target.classList.add('counted');
            const text = entry.target.textContent;
            const number = parseInt(text);
            if (!isNaN(number)) {
                animateCounter(entry.target, number);
            }
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-value').forEach(stat => {
    if (stat.textContent.match(/\d+/)) {
        statsObserver.observe(stat);
    }
});

// Live Bus Animation - Move along circular path
let busPosition = 0;
function animateBusPath() {
    const busContainer = document.querySelector('.bus-container');
    const bus3dElement = document.getElementById('bus3d');
    
    if (busContainer && bus3dElement && !bus3dElement.matches(':hover')) {
        busPosition += 0.8;
        if (busPosition > 360) busPosition = 0;
        
        const x = Math.cos(busPosition * Math.PI / 180) * 80;
        const y = Math.sin(busPosition * Math.PI / 180) * 50;
        
        busContainer.style.transform = `translateX(${x}px) translateY(${y}px) rotateY(${busPosition}deg) rotateX(10deg)`;
    }
    requestAnimationFrame(animateBusPath);
}
animateBusPath();

// Console Message
console.log('%c🚌 MY(suru) BUS', 'font-size: 24px; font-weight: bold; color: #C8B6E2;');
console.log('%cBuilt with ❤️ for seamless bus tracking', 'font-size: 14px; color: #888;');
console.log('%cInterested in the code? Check out our GitHub!', 'font-size: 12px; color: #666;');
