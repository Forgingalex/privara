import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/router';
import { decryptResult, ReputationVector } from '../utils/encryption';
import { PRIVARA_CONTRACT_ADDRESS, PRIVARA_ABI } from '../config/contract';

export default function DecryptPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [reputation, setReputation] = useState<ReputationVector | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const { data: encryptedResult, refetch } = useReadContract({
    address: PRIVARA_CONTRACT_ADDRESS as `0x${string}`,
    abi: PRIVARA_ABI,
    functionName: 'getEncryptedResult',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Check if result is ready
    if (address) {
      setTimeout(() => {
        setChecking(false);
      }, 2000);
    }
  }, [isConnected, address, router]);

  const handleDecrypt = async () => {
    if (!encryptedResult || !address) return;

    setLoading(true);
    setError(null);
    
    try {
      // Pass user address for FHE decryption
      const decrypted = await decryptResult(encryptedResult as string, address);
      setReputation(decrypted);
    } catch (error: any) {
      console.error('Decryption failed:', error);
      setError(error.message || 'Decryption failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    await refetch();
    setTimeout(() => {
      setChecking(false);
    }, 1000);
  };

  const ReputationCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-3">{label}</h3>
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-black/20 rounded-full h-6 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        <span className="text-2xl font-bold text-white min-w-[60px] text-right">
          {Math.round(value)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Your Reputation Vector</h1>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
            {checking ? (
              <div className="text-center">
                <p className="text-white mb-4">Checking for encrypted result...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              </div>
            ) : encryptedResult && (encryptedResult as string).length > 2 ? (
              <>
                <p className="text-white mb-4">Encrypted result found. Ready to decrypt.</p>
                {error && (
                  <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleDecrypt}
                  disabled={loading || !!reputation}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition"
                >
                  {loading ? 'Decrypting...' : reputation ? '✓ Decrypted' : 'Decrypt Result'}
                </button>
              </>
            ) : (
              <>
                <p className="text-yellow-300 mb-4">
                  No encrypted result found. The FHE compute worker may still be processing your data.
                </p>
                <button
                  onClick={handleRefresh}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Refresh
                </button>
              </>
            )}
          </div>

          {reputation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReputationCard 
                label="Authenticity" 
                value={reputation.authenticity} 
                color="bg-gradient-to-r from-green-400 to-green-600"
              />
              <ReputationCard 
                label="Influence" 
                value={reputation.influence} 
                color="bg-gradient-to-r from-blue-400 to-blue-600"
              />
              <ReputationCard 
                label="Account Health" 
                value={reputation.account_health} 
                color="bg-gradient-to-r from-purple-400 to-purple-600"
              />
              <ReputationCard 
                label="Risk Score" 
                value={reputation.risk_score} 
                color="bg-gradient-to-r from-red-400 to-red-600"
              />
              <ReputationCard 
                label="Momentum" 
                value={reputation.momentum} 
                color="bg-gradient-to-r from-yellow-400 to-yellow-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

