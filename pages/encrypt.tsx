import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { encryptMetrics, validateMetrics, TwitterMetrics } from '../utils/encryption';
import { fetchTwitterMetrics } from '../utils/twitter';
import Link from 'next/link';

export default function EncryptPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [metrics, setMetrics] = useState<TwitterMetrics | null>(null);
  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    loadMetrics();
  }, [isConnected, router]);

  const loadMetrics = async () => {
    try {
      const data = await fetchTwitterMetrics();
      if (!validateMetrics(data)) {
        setError('Invalid metrics data');
        return;
      }
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setError('Failed to load Twitter metrics');
    }
  };

  const handleEncrypt = async () => {
    if (!metrics || !address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Pass user address for FHE encryption
      const encrypted = await encryptMetrics(metrics, address);
      setEncryptedData(encrypted);
      localStorage.setItem('encryptedPayload', encrypted);
    } catch (error: any) {
      console.error('Encryption failed:', error);
      setError(error.message || 'Encryption failed');
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Encrypt Metrics</h1>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Your Twitter Metrics</h2>
            <div className="grid grid-cols-2 gap-4 text-white">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Followers</div>
                <div className="text-2xl font-bold">{metrics.follower_count.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Following</div>
                <div className="text-2xl font-bold">{metrics.following_count.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Engagement Rate</div>
                <div className="text-2xl font-bold">{metrics.engagement_rate.toFixed(2)}%</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Account Age</div>
                <div className="text-2xl font-bold">{metrics.account_age_days} days</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Bot Likelihood</div>
                <div className="text-2xl font-bold">{metrics.bot_likelihood.toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Posting Frequency</div>
                <div className="text-2xl font-bold">{(metrics.posting_frequency * 100).toFixed(1)}%</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Follower Quality</div>
                <div className="text-2xl font-bold">{metrics.follower_quality.toFixed(1)}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-300">Growth Score</div>
                <div className="text-2xl font-bold">{metrics.growth_score.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}

            <button
              onClick={handleEncrypt}
              disabled={loading || !!encryptedData}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition mb-6"
            >
              {loading ? 'Encrypting...' : encryptedData ? '✓ Encryption Complete' : 'Encrypt Metrics'}
            </button>

            {encryptedData && (
              <div className="mt-6">
                <p className="text-white mb-2 font-semibold">✓ Encryption Complete</p>
                <div className="bg-black/20 p-4 rounded-lg mb-4">
                  <p className="text-xs text-gray-300 break-all font-mono">
                    {encryptedData.slice(0, 100)}...
                  </p>
                </div>
                <Link
                  href="/submit"
                  className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition text-center"
                >
                  Submit to Contract →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

