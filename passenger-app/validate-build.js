#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating build configuration...\n');

let hasErrors = false;

// Check 1: Verify app.json exists and is valid
try {
  const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
  console.log('✅ app.json is valid JSON');
  
  // Check required plugins
  const plugins = appJson.expo.plugins || [];
  const pluginNames = plugins.map(p => Array.isArray(p) ? p[0] : p);
  
  if (!pluginNames.includes('expo-router')) {
    console.error('❌ Missing expo-router plugin');
    hasErrors = true;
  } else {
    console.log('✅ expo-router plugin configured');
  }
  
  if (!pluginNames.includes('expo-location')) {
    console.error('❌ Missing expo-location plugin');
    hasErrors = true;
  } else {
    console.log('✅ expo-location plugin configured');
  }
  
  if (!pluginNames.includes('expo-notifications')) {
    console.error('❌ Missing expo-notifications plugin');
    hasErrors = true;
  } else {
    console.log('✅ expo-notifications plugin configured');
  }
  
  // Check Supabase config
  if (!appJson.expo.extra?.supabaseUrl || !appJson.expo.extra?.supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration in extra');
    hasErrors = true;
  } else {
    console.log('✅ Supabase configuration present');
  }
  
} catch (e) {
  console.error('❌ Error reading app.json:', e.message);
  hasErrors = true;
}

// Check 2: Verify package.json dependencies
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const required = [
    'expo',
    'expo-router',
    'expo-location',
    'expo-notifications',
    'react-native-webview',
    'react-native-maps',
    '@supabase/supabase-js'
  ];
  
  required.forEach(dep => {
    if (!deps[dep]) {
      console.error(`❌ Missing dependency: ${dep}`);
      hasErrors = true;
    }
  });
  
  console.log('✅ All required dependencies installed');
  
} catch (e) {
  console.error('❌ Error reading package.json:', e.message);
  hasErrors = true;
}

// Check 3: Verify critical files exist
const criticalFiles = [
  'app/_layout.tsx',
  'app/index.tsx',
  'lib/supabaseClient.ts',
  'contexts/ThemeContext.tsx'
];

criticalFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing critical file: ${file}`);
    hasErrors = true;
  }
});

console.log('✅ All critical files present');

// Check 4: Verify assets
const assets = [
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/splash.png'
];

assets.forEach(asset => {
  if (!fs.existsSync(asset)) {
    console.error(`❌ Missing asset: ${asset}`);
    hasErrors = true;
  }
});

console.log('✅ All required assets present');

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ BUILD VALIDATION FAILED - Fix errors before building');
  process.exit(1);
} else {
  console.log('✅ BUILD VALIDATION PASSED - Safe to build!');
  process.exit(0);
}
