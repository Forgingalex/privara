/**
 * FHE Context Provider
 * Manages FHEVM instance lifecycle and provides it to components
 * Ensures SDK is only initialized client-side in React context
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createFhevmInstance } from '../utils/fhevmLoader';

// Local type definition to avoid any SDK imports
type FhevmInstance = any;

interface FHEContextType {
  fheInstance: FhevmInstance | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  isInitialized: boolean; // Alias for isReady for compatibility
}

const FHEContext = createContext<FHEContextType>({
  fheInstance: null,
  isLoading: false,
  error: null,
  isReady: false,
  isInitialized: false,
});

export const useFHE = () => {
  const context = useContext(FHEContext);
  if (!context) {
    throw new Error('useFHE must be used within FHEProvider');
  }
  return context;
};

// Alias for compatibility
export const useFHEContext = useFHE;

interface FHEProviderProps {
  children: React.ReactNode;
}

export const FHEProvider: React.FC<FHEProviderProps> = ({ children }) => {
  const [fheInstance, setFheInstance] = useState<FhevmInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (initRef.current) return;
    
    // Only initialize in browser
    if (typeof window === 'undefined') return;

    // Only initialize if wallet is connected
    if (!window.ethereum) {
      return;
    }

    const initialize = async () => {
      // Prevent multiple initializations
      if (initRef.current) return;
      initRef.current = true;

      setIsLoading(true);
      setError(null);

      try {
        console.log('🔐 Initializing FHE SDK via React Context...');
        const instance = await createFhevmInstance();
        if (instance) {
          setFheInstance(instance);
          console.log('✅ FHE SDK initialized successfully');
        }
      } catch (err: any) {
        console.error('❌ FHE SDK initialization failed:', err);
        setError(err?.message || 'Failed to initialize FHE SDK');
        initRef.current = false; // Allow retry on error
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure wallet provider is ready
    const timer = setTimeout(() => {
      initialize();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Retry initialization when wallet connects
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.ethereum || fheInstance) return;
    if (initRef.current && !error) return; // Don't retry if already tried

    const handleAccountsChanged = () => {
      if (window.ethereum && !fheInstance && !initRef.current) {
        initRef.current = true;
        setIsLoading(true);
        setError(null);

        createFhevmInstance()
          .then(instance => {
            if (instance) {
              setFheInstance(instance);
              console.log('✅ FHE SDK initialized after wallet connection');
            }
          })
          .catch(err => {
            console.error('❌ FHE SDK initialization failed:', err);
            setError(err?.message || 'Failed to initialize FHE SDK');
            initRef.current = false;
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [fheInstance, error]);

  const isInitialized = fheInstance !== null;
  const value: FHEContextType = {
    fheInstance,
    isLoading,
    error,
    isReady: isInitialized,
    isInitialized,
  };

  return <FHEContext.Provider value={value}>{children}</FHEContext.Provider>;
};
