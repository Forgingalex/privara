import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Polyfill for global variable - MUST run before any other scripts */}
        {/* Using non-strict script to allow implicit global creation */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Non-strict mode script to define global variable
              (function() {
                'use strict';
                if (typeof window !== 'undefined') {
                  var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
                  
                  // Method 1: Use eval in non-strict context
                  try {
                    (function() {
                      // Non-strict function context
                      eval('var global = g');
                      // Now try to make it available globally
                      if (typeof window !== 'undefined') {
                        window.global = g;
                      }
                    })();
                  } catch (e) {}
                  
                  // Method 2: Define on globalThis and window
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
                  
                  // Method 3: Always set window.global
                  if (typeof window !== 'undefined') {
                    window.global = g;
                  }
                  
                  // Method 4: Use Function constructor (executes in non-strict)
                  try {
                    (new Function('g', 'global = g'))(g);
                  } catch (e) {}
                }
              })();
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

