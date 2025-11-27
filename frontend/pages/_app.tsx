/**
 * Next.js App Component - Simplified for Demo
 */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import '../styles/globals.css';

// Polyfill for 'global' variable in browser (needed for Zama FHE SDK)
// Must run before any SDK code loads
if (typeof window !== 'undefined') {
  // @ts-ignore - global is not defined in browser, we're adding it
  if (typeof global === 'undefined') {
    // @ts-ignore
    const g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
    
    // Use Function constructor to define global in non-strict context
    // This creates a true top-level global variable
    try {
      // @ts-ignore
      (new Function('g', 'global = g'))(g);
    } catch (e) {
      // Fallback: use Object.defineProperty on globalThis
      try {
        // @ts-ignore
        Object.defineProperty(g, 'global', {
          value: g,
          writable: true,
          enumerable: false,
          configurable: true,
        });
      } catch (e2) {
        // Final fallback: just set window.global
        // @ts-ignore
        window.global = g;
      }
    }
    
    // Also set window.global for compatibility
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.global) {
      // @ts-ignore
      window.global = g;
    }
  }
}

// Dynamically import providers to avoid SSR issues
const Providers = dynamic(() => import('../components/Providers'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FEDA15 0%, #0d1b2a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      Loading...
    </div>
  ),
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}
