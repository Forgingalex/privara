/**
 * Next.js App Component - Simplified for Demo
 */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import '../styles/globals.css';
// CRITICAL: FHEProvider is dynamically imported to prevent SSR analysis
// Static import would cause Next.js to analyze the context module during SSR

// CRITICAL: Dynamically import FHEProvider FIRST to prevent any SSR analysis
// This must be done before any other code that might reference the FHE stack
const FHEProvider = dynamic(
  () => import('../context/FHEContext').then(mod => ({ default: mod.FHEProvider })),
  { ssr: false }
);

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

// Polyfill for 'global' variable in browser (needed for Zama FHE SDK)
// Moved after dynamic imports - only runs in browser, not during SSR
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

// Loading component for client-only pages
const LoadingComponent = () => (
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
);

// Pages that use encryption/FHE SDK - must be client-only to prevent SSR issues
// These pages import/use the Zama FHE SDK which accesses 'window' and cannot run during SSR
const ClientOnlyEncryptPage = dynamic(() => import('./encrypt'), {
  ssr: false,
  loading: LoadingComponent,
});

const ClientOnlyDecryptPage = dynamic(() => import('./decrypt'), {
  ssr: false,
  loading: LoadingComponent,
});

const ClientOnlySubmitPage = dynamic(() => import('./submit'), {
  ssr: false,
  loading: LoadingComponent,
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Render client-only versions for encryption-dependent pages
  // These pages use the FHE SDK which requires browser environment (window object)
  if (router.pathname === '/encrypt') {
    return (
      <Providers>
        <FHEProvider>
          <ClientOnlyEncryptPage {...pageProps} />
        </FHEProvider>
      </Providers>
    );
  }
  
  if (router.pathname === '/decrypt') {
    return (
      <Providers>
        <FHEProvider>
          <ClientOnlyDecryptPage {...pageProps} />
        </FHEProvider>
      </Providers>
    );
  }
  
  if (router.pathname === '/submit') {
    return (
      <Providers>
        <FHEProvider>
          <ClientOnlySubmitPage {...pageProps} />
        </FHEProvider>
      </Providers>
    );
  }
  
  // Render normal component for other pages (can use SSR)
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}
