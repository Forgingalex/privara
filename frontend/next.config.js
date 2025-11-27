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
  
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    // Ignore React Native modules that MetaMask SDK tries to use in browser
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        contextRegExp: /node_modules\/@metamask/,
      })
    );
    
    // Configure WASM support for Zama FHE SDK (only on client side)
    if (!isServer) {
      // Define global variables at build time (fixes "global is not defined" errors)
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          'global': 'typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : {}',
        })
      );
      
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
      
      // Add support for .wasm files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;
