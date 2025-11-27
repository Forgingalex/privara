/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Increase build timeout for pages with heavy dependencies
  staticPageGenerationTimeout: 180,
  
  // Skip type checking during build (we already checked with lint)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Skip ESLint during build (we already checked with lint)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    // Ignore @zama-fhe/relayer-sdk during build (it's dynamically imported)
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^@zama-fhe\/relayer-sdk/,
      })
    );
    
    return config;
  },
};

module.exports = nextConfig;
