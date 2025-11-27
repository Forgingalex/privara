import { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { 
  generateMockTwitterMetrics
} from '../utils/twitter';
import { initializeFHE } from '../utils/encryption';
import Link from 'next/link';

export default function Home() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { user, authenticated, ready, login, connectWallet } = usePrivy();

  // Memoize wallet address to prevent infinite loops - use stable reference
  const privyWalletAddress = useMemo(() => user?.wallet?.address, [user?.wallet?.address]);
  
  // Twitter connection state - Mock mode only (OAuth removed)
  const [twitterConnected, setTwitterConnected] = useState(false);
  
  // Update Twitter connection status - Mock mode only
  useEffect(() => {
    // Check mock mode only (OAuth removed)
    const isMockMode = typeof window !== 'undefined' && localStorage.getItem('twitterMockConnected') === 'true';
    if (isMockMode) {
      if (!twitterConnected) {
        setTwitterConnected(true);
      }
    } else {
      // Not in mock mode, reset connection
      if (twitterConnected) {
        setTwitterConnected(false);
      }
    }
  }, [twitterConnected]);
  
  // Combined wallet connection state - memoized to prevent re-renders
  const walletConnected = useMemo(() => isConnected || !!privyWalletAddress, [isConnected, privyWalletAddress]);
  const walletAddress = useMemo(() => address || privyWalletAddress, [address, privyWalletAddress]);

  // Track if we've already cleared loading to prevent loops
  const loadingClearedRef = useRef(false);
  const lastLoggedRef = useRef<string>('');

  // Debug status - only log when values actually change
  useEffect(() => {
    if (!ready) return;
    
    const currentState = `${isConnected}-${address}-${authenticated}-${user?.id || ''}`;
    if (currentState !== lastLoggedRef.current) {
      console.log('Wallet status:', { 
        isConnected, 
        address, 
        isConnecting,
        connectorsCount: connectors?.length,
        privyWalletAddress,
      });
      console.log('Privy status:', { authenticated, ready, hasTwitter: twitterConnected, hasUser: !!user });
      lastLoggedRef.current = currentState;
    }
  }, [isConnected, address, isConnecting, connectors?.length, authenticated, ready, twitterConnected, user?.id, privyWalletAddress]);

  // Auto-authenticate with Privy when wallet connects (disabled for Twitter independence)
  // Removed auto-login to prevent Privy modal interference with Twitter connection
  // useEffect(() => {
  //   if (walletConnected && !authenticated && ready && !loading) {
  //     console.log('🔐 Wallet connected but not authenticated with Privy - auto-login...');
  //     const timer = setTimeout(() => {
  //       login().catch(err => {
  //         console.warn('Auto-login failed:', err);
  //       });
  //     }, 500);
  //     return () => clearTimeout(timer);
  //   }
  // }, [walletConnected, authenticated, ready, login, loading]);

  // Clear loading state when wallet connects - with guard to prevent loops
  useEffect(() => {
    if (walletConnected && loading && !loadingClearedRef.current) {
      console.log('✅ Wallet connected! Clearing loading state.');
      loadingClearedRef.current = true;
      setLoading(false);
    } else if (!walletConnected && loadingClearedRef.current) {
      loadingClearedRef.current = false;
    }
  }, [walletConnected, loading]);

  // Auto-reset stuck loading state after 20 seconds
  useEffect(() => {
    if (loading && !walletConnected && !isConnecting) {
      const timeoutId = setTimeout(() => {
        console.log('⚠️ Loading state stuck - resetting');
        setLoading(false);
        loadingClearedRef.current = false;
      }, 20000); // 20 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading, walletConnected, isConnecting]);

  const loadMetrics = async (skipCheck = false) => {
    // Mock mode only - OAuth removed
    // Skip check if called from handleTwitterLogin (which sets state first)
    if (!skipCheck && !twitterConnected) {
      // Check localStorage as fallback since state might not be updated yet
      const isMockMode = typeof window !== 'undefined' && localStorage.getItem('twitterMockConnected') === 'true';
      if (!isMockMode) {
        alert('Please connect Twitter first');
        return;
      }
    }

    setLoading(true);
    try {
      console.log('📊 Loading MOCK Twitter metrics...');
      const mockData = generateMockTwitterMetrics();
      setMetrics(mockData);
      console.log('✅ Mock metrics loaded:', mockData);
    } catch (error: any) {
      console.error('Failed to load mock metrics:', error);
      alert(`Failed to load Twitter metrics: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTwitterLogin = async () => {
    if (twitterConnected) {
      // Already connected, just load metrics
      await loadMetrics();
      return;
    }

    setLoading(true);
    
    try {
      // MOCK MODE: Independent Twitter connection (no Privy, no wallet required)
      console.log('🎭 Using MOCK Twitter data');
      
      // Simulate a brief connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set mock connection state
      if (typeof window !== 'undefined') {
        localStorage.setItem('twitterMockConnected', 'true');
        localStorage.setItem('twitterMockTimestamp', Date.now().toString());
      }
      
      // Update state to show as connected
      setTwitterConnected(true);
      
      // Automatically load mock metrics (skip check since we just set state)
      await loadMetrics(true);
      
      console.log('✅ Mock Twitter connection successful');
    } catch (error: any) {
      console.error('❌ Mock Twitter connection failed:', error);
      alert(`Twitter connection failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Watch for Twitter connection completion - with guard to prevent infinite calls
  const metricsLoadedRef = useRef(false);
  useEffect(() => {
    if (twitterConnected && !metrics && !loading && !metricsLoadedRef.current) {
      // Twitter just got connected, automatically load metrics
      console.log('✅ Twitter connected! Loading metrics...');
      metricsLoadedRef.current = true;
      loadMetrics(true); // Pass skipCheck=true since we know Twitter is connected
    }
    if (!twitterConnected) {
      metricsLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twitterConnected, metrics, loading]);

  const handleWalletConnect = async () => {
    if (walletConnected) {
      console.log('Already connected:', walletAddress);
      return;
    }

    setLoading(true);
    try {
      console.log('🔗 Connecting wallet...');
      console.log('Initial state:', { isConnected, address, privyWallet: user?.wallet?.address, authenticated });
      
      // Use Wagmi connect directly (more reliable)
      console.log('Available connectors:', connectors?.map(c => ({ id: c.id, name: c.name })));
      
      if (!connectors || connectors.length === 0) {
        alert('No wallet connectors available. Please install MetaMask or another Web3 wallet.');
        setLoading(false);
        return;
      }

      // Find MetaMask connector - try multiple possible IDs
      const metaMaskConnector = connectors.find(
        c => c.id === 'metaMask' || 
             c.id === 'io.metamask' || 
             c.name?.toLowerCase().includes('metamask')
      );
      
      const connector = metaMaskConnector || connectors[0];
      console.log('Connecting with connector:', connector.id, connector.name);
      
      // Connect via Wagmi - this sends the request, wallet will confirm
      await connect({ connector });
      
      console.log('✅ Connection request sent to wallet. Waiting for confirmation...');
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      const errorMessage = error?.message || 'Failed to connect wallet';
      
      setLoading(false);
      loadingClearedRef.current = false;
      
      // Don't show alert for user rejection
      if (!errorMessage.toLowerCase().includes('user rejected') && 
          !errorMessage.toLowerCase().includes('user cancelled') &&
          !errorMessage.toLowerCase().includes('user closed')) {
        alert(`Wallet connection failed: ${errorMessage}`);
      }
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      
      // Disconnect from wagmi
      if (isConnected) {
        disconnect();
      }
      
      // Clear any local state
      setLoading(false);
      loadingClearedRef.current = false;
      
      console.log('✅ Wallet disconnected');
    } catch (error: any) {
      console.error('Disconnect error:', error);
    }
  };

  const canProceed = twitterConnected && walletConnected && metrics;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background - #FEDA15 as PRIMARY color */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FEDA15 0%, #FEDA15 40%, #0d1b2a 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Floating Header */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "30px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 50
          }}
        >
          {/* Privara name */}
          <span
            style={{
              fontFamily: "'Poppins', 'Inter', sans-serif",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              color: "white"
            }}
          >
            Privara
          </span>

          {/* Logo directly beside the name */}
          <img
            src="/logo.svg"
            alt="Privara Logo"
            style={{
              height: "42px",
              width: "42px",
              objectFit: "contain"
            }}
          />
        </div>

        {/* Hero Section - Centered */}
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-2xl mx-auto text-center space-y-12 animate-fade-in">
            {/* Main Title */}
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight px-4">
                The privacy preserving reputation layer for social identity
              </h2>
              
              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-gray-300 font-medium leading-relaxed max-w-xl mx-auto px-4">
                Compute reputation from encrypted Twitter data using Zama FHE
              </p>
            </div>

            {/* Action Buttons - Capsule Style */}
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxWidth: '420px',
                width: '100%',
                margin: '0 auto',
              }}
            >
              {/* Wallet Button - FIRST */}
              {walletConnected ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  {/* Wallet Status Display */}
                  <div
                    className="capsule-button-wallet"
                    style={{
                      background: 'white',
                      color: '#000000',
                      borderRadius: '9999px',
                      fontWeight: 'bold',
                      padding: '14px 32px',
                      fontSize: '16px',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>✓</span>
                    <span>Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                  </div>

                  {/* Disconnect Button */}
                  <button
                    onClick={handleWalletDisconnect}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      fontWeight: 'bold',
                      padding: '14px 24px',
                      fontSize: '16px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleWalletConnect}
                  disabled={walletConnected}
                  className="capsule-button-wallet"
                  style={{
                    background: 'white',
                    color: '#000000',
                    borderRadius: '9999px',
                    fontWeight: 'bold',
                    padding: '14px 32px',
                    fontSize: '16px',
                    border: 'none',
                    cursor: walletConnected ? 'not-allowed' : 'pointer',
                    opacity: walletConnected ? 0.5 : 1,
                    transition: 'all 0.3s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!walletConnected) {
                      e.currentTarget.style.background = '#f3f3f3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!walletConnected) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  {(loading || isConnecting) && !walletConnected ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
                      Connecting...
                    </span>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              )}

              {/* Twitter Button - SECOND */}
              <button
                onClick={async (e) => {
                  // Prevent Privy from intercepting this click
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (twitterConnected) {
                    await loadMetrics(true); // Pass skipCheck since Twitter is already connected
                  } else {
                    await handleTwitterLogin();
                  }
                }}
                disabled={loading}
                className="capsule-button-twitter"
                style={{
                  background: '#FEDA15',
                  color: '#000000',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  padding: '14px 32px',
                  fontSize: '16px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#e2c113';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#FEDA15';
                  }
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
                    Loading...
                  </span>
                ) : twitterConnected ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>✓</span>
                    Twitter Connected (Mock) - Click to Load Metrics
                  </span>
                ) : (
                  'Connect Twitter (Mock Mode)'
                )}
              </button>
            </div>

            {/* Metrics Preview */}
            {metrics && (
              <div className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl text-left border border-white/10 animate-fade-in">
                <h3 className="text-white font-semibold mb-4 text-lg">Twitter Metrics Preview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <span className="text-gray-400">Followers:</span>{' '}
                    <span className="text-white font-medium">{metrics.follower_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Following:</span>{' '}
                    <span className="text-white font-medium">{metrics.following_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Engagement:</span>{' '}
                    <span className="text-white font-medium">{metrics.engagement_rate.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Account Age:</span>{' '}
                    <span className="text-white font-medium">{metrics.account_age_days} days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Proceed Button */}
            {canProceed && (
              <Link
                href="/encrypt"
                style={{
                  display: 'block',
                  maxWidth: '420px',
                  width: '100%',
                  margin: '0 auto',
                  background: '#FEDA15',
                  color: '#000000',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  padding: '14px 32px',
                  fontSize: '16px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2c113';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FEDA15';
                }}
                className="animate-fade-in"
              >
                Proceed to Encrypt →
              </Link>
            )}
          </div>
        </main>

        {/* Footer Text - Bottom Center */}
        <footer 
          style={{
            position: 'absolute',
            bottom: '24px',
            left: 0,
            right: 0,
            zIndex: 20,
            padding: '0 16px',
          }}
        >
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.7)', fontWeight: 500, margin: 0 }}>
              All data is encrypted end to end using Zama FHE
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.7)', fontWeight: 500, margin: 0 }}>
              No raw analytics are ever exposed
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

