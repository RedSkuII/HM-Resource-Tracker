/** @type {import('next').NextConfig} */
const nextConfig = {
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