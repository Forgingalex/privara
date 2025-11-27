import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Polyfill for global variable - MUST run before any other scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  if (typeof global === 'undefined') {
                    var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
                    try {
                      // Use Function constructor to create global in non-strict context
                      (new Function('g', 'global = g'))(g);
                    } catch (e) {
                      // Fallback: define on window and use Object.defineProperty
                      try {
                        Object.defineProperty(g, 'global', {
                          value: g,
                          writable: true,
                          enumerable: false,
                          configurable: true
                        });
                      } catch (e2) {
                        // Final fallback
                        window.global = g;
                      }
                    }
                    // Also set window.global
                    if (typeof window !== 'undefined') {
                      window.global = g;
                    }
                  }
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

