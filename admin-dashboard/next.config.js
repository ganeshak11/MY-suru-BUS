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
    serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js']
};

module.exports = nextConfig;