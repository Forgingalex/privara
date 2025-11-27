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
  // Define global at the global scope (not just window.global)
  // @ts-ignore - global is not defined in browser, we're adding it
  if (typeof global === 'undefined') {
    // @ts-ignore
    (function(globalThis) {
      // @ts-ignore
      global = globalThis;
    })(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {});
    
    // Also set window.global for compatibility
    // @ts-ignore
    window.global = global;
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
