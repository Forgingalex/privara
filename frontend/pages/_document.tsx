import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Polyfill for global variable - MUST run before any other scripts */}
        {/* Completely non-strict script to allow implicit global creation */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Completely non-strict - no 'use strict' anywhere
              var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
              
              // Method 1: Direct assignment (works in non-strict)
              if (typeof global === 'undefined') {
                global = g;
              }
              
              // Method 2: Use Function constructor (always non-strict)
              (new Function('g', 'global = g'))(g);
              
              // Method 3: Define on globalThis
              if (typeof globalThis !== 'undefined') {
                try {
                  Object.defineProperty(globalThis, 'global', {
                    value: g,
                    writable: true,
                    enumerable: false,
                    configurable: true
                  });
                } catch (e) {}
              }
              
              // Method 4: Always set window.global for compatibility
              if (typeof window !== 'undefined') {
                window.global = g;
              }
              
              // Verify it worked
              if (typeof global === 'undefined' && typeof window !== 'undefined') {
                // Last resort: use with statement (non-strict only)
                try {
                  with (window) {
                    global = g;
                  }
                } catch (e) {}
              }
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

