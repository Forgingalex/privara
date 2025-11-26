/**
 * Next.js App Component - Simplified for Demo
 */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

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
