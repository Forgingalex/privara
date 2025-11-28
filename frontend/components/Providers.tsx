'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';
import { sepolia, mainnet } from 'wagmi/chains';
import NetworkSwitcher from './NetworkSwitcher';

// Simple wagmi config
const config = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmidrkb1x0115jr0cnwwzzqp2"}
      config={{
        loginMethods: ['wallet'],
        // Explicitly disable Solana to silence warning (we only use Ethereum)
        externalWallets: {
          solana: {
            connectors: [], // Empty array = disabled
          },
        },
        // Explicitly set wallet-first since we only have wallet login
        showWalletLoginFirst: true,
        appearance: {
          theme: 'dark',
        },
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider>
            <NetworkSwitcher />
            {children}
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}





