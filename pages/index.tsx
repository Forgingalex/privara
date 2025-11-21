import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { connectTwitter, fetchTwitterMetrics } from '../utils/twitter';
import { initializeFHE } from '../utils/encryption';
import Link from 'next/link';

export default function Home() {
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    // Initialize FHE on mount
    initializeFHE().catch(console.error);
    
    // Check for existing Twitter connection
    const token = localStorage.getItem('twitterToken');
    if (token) {
      setTwitterConnected(true);
      loadMetrics();
    }
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await fetchTwitterMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleTwitterLogin = async () => {
    setLoading(true);
    try {
      await connectTwitter();
      setTwitterConnected(true);
      await loadMetrics();
    } catch (error) {
      console.error('Twitter login failed:', error);
      alert('Twitter login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = () => {
    if (!isConnected && connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  const canProceed = twitterConnected && isConnected && metrics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Privara</h1>
          <p className="text-xl text-gray-300 mb-2">
            The privacy-preserving reputation layer for social identity
          </p>
          <p className="text-sm text-gray-400 mb-12">
            Compute reputation from encrypted Twitter data using Zama FHE
          </p>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 space-y-6">
            <div className="space-y-4">
              <button
                onClick={handleTwitterLogin}
                disabled={loading || twitterConnected}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>Loading...</>
                ) : twitterConnected ? (
                  <>✓ Twitter Connected</>
                ) : (
                  <>Connect Twitter</>
                )}
              </button>

              <button
                onClick={handleWalletConnect}
                disabled={isConnected}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {isConnected ? (
                  <>✓ Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</>
                ) : (
                  <>Connect Wallet</>
                )}
              </button>
            </div>

            {metrics && (
              <div className="mt-6 p-4 bg-white/5 rounded-lg text-left">
                <h3 className="text-white font-semibold mb-3">Twitter Metrics Preview</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                  <div>Followers: <span className="text-white font-medium">{metrics.follower_count}</span></div>
                  <div>Following: <span className="text-white font-medium">{metrics.following_count}</span></div>
                  <div>Engagement: <span className="text-white font-medium">{metrics.engagement_rate.toFixed(2)}%</span></div>
                  <div>Account Age: <span className="text-white font-medium">{metrics.account_age_days} days</span></div>
                </div>
              </div>
            )}

            {canProceed && (
              <Link
                href="/encrypt"
                className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition mt-6"
              >
                Proceed to Encrypt →
              </Link>
            )}
          </div>

          <div className="mt-8 text-sm text-gray-400">
            <p>All data is encrypted end-to-end using Zama FHE</p>
            <p className="mt-2">No raw analytics are ever exposed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

