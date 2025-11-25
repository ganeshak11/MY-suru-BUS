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
    
        ],
    },
    // Fix network timeout issues
    experimental: {
        serverComponentsExternalPackages: ['@supabase/ssr']
    }
};

module.exports = nextConfig;