/**
 * Next.js App Component
 * Sets up Wagmi, React Query, and ConnectKit providers
 */

import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';
import { sepolia, mainnet } from 'wagmi/chains';
import '../styles/globals.css';

const config = getDefaultConfig({
  // Required API Keys
  alchemyId: process.env.NEXT_PUBLIC_ALCHEMY_ID || '',
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  
  // Required
  appName: 'Privara',
  appDescription: 'Privacy-preserving reputation layer for social identity',
  appUrl: 'https://privara.xyz',
  appIcon: 'https://privara.xyz/logo.png',
  
  // Optional
  chains: [sepolia, mainnet],
});

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <Component {...pageProps} />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

