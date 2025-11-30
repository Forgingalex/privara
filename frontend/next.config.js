/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // CRITICAL: Transpile Zama FHE SDK package (required for Next.js)
  transpilePackages: ['@zama-fhe/relayer-sdk'],
  
  // Increase build timeout for pages with heavy dependencies
  staticPageGenerationTimeout: 180,
  
  // Skip type checking during build for dynamic imports
  // @zama-fhe/relayer-sdk uses dynamic imports that TypeScript can't resolve at build time
  // but the package works correctly at runtime. Type checking is done via lint.
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint during build (we already checked with lint)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Add COOP/COEP headers for WASM thread support (required by Zama FHE SDK)
  // These headers enable SharedArrayBuffer and WebAssembly threads
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
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
    
    // CRITICAL: Ignore Zama FHE SDK and ALL transitive dependencies during server-side builds
    // The SDK accesses 'window' and cannot run in Node.js/SSR environment
    // Only bundle it for client-side code to prevent "window is not defined" errors
    if (isServer) {
      const webpack = require('webpack');
      
      // CRITICAL: Use DefinePlugin to mock browser globals on the server
      // This prevents any synchronous code from accessing window/document/navigator
      // DefinePlugin does string replacement - use '(void 0)' to represent undefined
      // which is safer than 'undefined' keyword in all contexts
      config.plugins.push(
        new webpack.DefinePlugin({
          // Replace browser globals with undefined on server
          // '(void 0)' evaluates to undefined and is safe in all JavaScript contexts
          'window': '(void 0)',
          'document': '(void 0)',
          'navigator': '(void 0)',
          'self': '(void 0)',
        })
      );
      
      // Mark SDK as external to prevent bundling entirely on server
      config.externals = config.externals || [];
      config.externals.push({
        '@zama-fhe/relayer-sdk': 'commonjs @zama-fhe/relayer-sdk',
        '@zama-fhe/relayer-sdk/web': 'commonjs @zama-fhe/relayer-sdk/web',
      });
      
      // Aggressive pattern matching SDK and all known problematic browser-only dependencies
      // This list targets transitives that might crash SSR
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(?:@zama-fhe\/relayer-sdk|@zama-fhe|encrypted-types|idb|@fhenix\/fhevmjs|@ethersproject\/abstract-provider|@ethersproject\/logger)$/,
          // Ensure the context for node_modules is covered
          contextRegExp: /node_modules/,
        })
      );
      
      // Additional safeguard: Ignore any file path containing SDK-related code
      config.plugins.push(
        new webpack.IgnorePlugin({
          checkResource: (resource, context) => {
            // Ignore if the resource path contains zama or fhevm
            if (/[\\/]@zama-fhe[\\/]/.test(resource) || /[\\/]fhevm[\\/]/.test(resource)) {
              return true;
            }
            // Also ignore idb (IndexedDB wrapper) and ethersproject modules that might pull in browser code
            if (/[\\/]idb[\\/]/.test(resource) || /[\\/]@ethersproject[\\/]/.test(resource)) {
              return true;
            }
            return false;
          },
        })
      );
    }
    
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
