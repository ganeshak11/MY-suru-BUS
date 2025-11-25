'use client';

import L from 'leaflet';

// Custom SVG icons for different marker types
const createCustomIcon = (color: string, type: 'start' | 'end' | 'intermediate' | 'bus') => {
  let svgContent = '';
  
  switch (type) {
    case 'start':
      svgContent = `
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="#fff"/>
          <text x="16" y="20" text-anchor="middle" fill="${color}" font-family="Arial" font-size="12" font-weight="bold">S</text>
        </svg>
      `;
      break;
    case 'end':
      svgContent = `
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="#fff"/>
          <text x="16" y="20" text-anchor="middle" fill="${color}" font-family="Arial" font-size="12" font-weight="bold">E</text>
        </svg>
      `;
      break;
    case 'intermediate':
      svgContent = `
        <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 14 14 22 14 22s14-8 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="14" cy="14" r="6" fill="#fff"/>
        </svg>
      `;
      break;
    case 'bus':
      svgContent = `
        <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="4" width="20" height="16" rx="3" fill="${color}" stroke="#fff" stroke-width="2"/>
          <rect x="4" y="6" width="16" height="8" fill="#fff"/>
          <circle cx="7" cy="22" r="3" fill="${color}"/>
          <circle cx="17" cy="22" r="3" fill="${color}"/>
          <rect x="10" y="20" width="4" height="8" fill="${color}"/>
        </svg>
      `;
      break;
  }
  
  const svgUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  
  return new L.Icon({
    iconUrl: svgUrl,
    iconSize: type === 'bus' ? [24, 32] : type === 'intermediate' ? [28, 36] : [32, 40],
    iconAnchor: type === 'bus' ? [12, 32] : type === 'intermediate' ? [14, 36] : [16, 40],
    popupAnchor: [0, type === 'bus' ? -32 : type === 'intermediate' ? -36 : -40],
  });
};

// Predefined marker icons
export const MapMarkersClient = {
  startStop: createCustomIcon('#22c55e', 'start'), // Green
  endStop: createCustomIcon('#ef4444', 'end'), // Red
  intermediateStop: createCustomIcon('#3b82f6', 'intermediate'), // Blue
  selectedStop: createCustomIcon('#f59e0b', 'intermediate'), // Orange
  bus: createCustomIcon('#8b5cf6', 'bus'), // Purple
  selectedBus: createCustomIcon('#f59e0b', 'bus'), // Orange
};