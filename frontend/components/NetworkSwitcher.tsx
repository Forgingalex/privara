'use client';

import { useEffect, useRef } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export default function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const hasSwitchedRef = useRef(false);

  useEffect(() => {
    // Only auto-switch once per connection
    if (!isConnected || hasSwitchedRef.current || isPending) {
      return;
    }

    // Check if we're on the wrong network
    if (chainId !== sepolia.id) {
      console.log(`🔄 Switching to Sepolia testnet (current chain ID: ${chainId})`);
      hasSwitchedRef.current = true;
      
      switchChain(
        { chainId: sepolia.id },
        {
          onSuccess: () => {
            console.log('✅ Successfully switched to Sepolia');
          },
          onError: (error) => {
            console.error('❌ Failed to switch network:', error);
            hasSwitchedRef.current = false; // Allow retry
          },
        }
      );
    }
  }, [isConnected, chainId, switchChain, isPending]);

  // Reset ref when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasSwitchedRef.current = false;
    }
  }, [isConnected]);

  return null; // This component doesn't render anything
}

