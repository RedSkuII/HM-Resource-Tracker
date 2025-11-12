/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client']
  },
  webpack: (config, { isServer, webpack }) => {
    // Fix libsql webpack issues - ignore problematic files completely
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.(md|txt|LICENSE)$/,
        contextRegExp: /@libsql/
      })
    )
    
    return config
  }
}
 
module.exports = nextConfig 