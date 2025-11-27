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
      const webpack = require('webpack');
      
      // Provide polyfill modules for global and globalThis
      // Some packages try to import these as modules, so we provide stubs
      config.resolve.alias = {
        ...config.resolve.alias,
        global: require.resolve('./polyfills/global.js'),
        globalThis: require.resolve('./polyfills/globalThis.js'),
      };
      
      // Use ProvidePlugin to inject 'global' whenever code references it
      // This ensures global is available even in strict mode
      config.plugins.push(
        new webpack.ProvidePlugin({
          global: require.resolve('./polyfills/global.js'),
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
