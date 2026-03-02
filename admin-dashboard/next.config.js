/** @type {import('next').NextConfig} */
const nextConfig = {
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
    experimental: {
        serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js']
    }
};

module.exports = nextConfig;