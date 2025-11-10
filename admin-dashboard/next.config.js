/** @type {import('next').NextConfig} */
const nextConfig = {
    // --- ADDED: Configuration to allow external image domains ---
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'unpkg.com',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
            },
            // Note: You do not need to list OpenStreetMap tile domains here.
            // Tile layers are handled by Leaflet and are not treated as Next.js images.
        ],
    },
    // --- END ADDED ---
};

module.exports = nextConfig;