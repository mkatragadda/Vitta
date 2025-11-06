/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Exclude admin pages from production builds
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      // In production client builds, exclude admin pages
      config.plugins.push(
        new (require('webpack').IgnorePlugin)({
          resourceRegExp: /^\.\/admin\/.*/,
          contextRegExp: /pages$/,
        })
      );
    }
    return config;
  },

  // Page extensions (optional: helps with organization)
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
}

module.exports = nextConfig