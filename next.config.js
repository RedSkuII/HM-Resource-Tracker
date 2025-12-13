/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    // Force new build ID for cache busting - v4 theme update Dec 12 2025
    return 'guildgamesh-theme-v4-' + Date.now()
  },
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client', 'libsql']
  },
  // Completely disable webpack processing of @libsql packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server-side: treat as external
      config.externals = [...(config.externals || []), '@libsql/client', 'libsql']
    } else {
      // Client-side: provide fallbacks
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    
    return config
  }
}
 
module.exports = nextConfig 