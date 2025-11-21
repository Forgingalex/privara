import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/router';
import { PRIVARA_CONTRACT_ADDRESS, PRIVARA_ABI } from '../config/contract';
import Link from 'next/link';

export default function SubmitPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [encryptedPayload, setEncryptedPayload] = useState<string>('');
  
  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error: writeError 
  } = useWriteContract();
  
  const { 
    isLoading: isConfirming, 
    isSuccess 
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    const stored = localStorage.getItem('encryptedPayload');
    if (stored) {
      setEncryptedPayload(stored);
    } else {
      router.push('/encrypt');
    }
  }, [isConnected, router]);

  const handleSubmit = async () => {
    if (!encryptedPayload || !address) return;

    try {
      writeContract({
        address: PRIVARA_CONTRACT_ADDRESS as `0x${string}`,
        abi: PRIVARA_ABI,
        functionName: 'submitEncryptedData',
        args: [encryptedPayload as `0x${string}`],
      });
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  if (!encryptedPayload) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">No encrypted data found. Please encrypt first.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">Submit Encrypted Data</h1>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
            <div className="mb-6">
              <label className="block text-white mb-2 font-semibold">Encrypted Payload</label>
              <textarea
                value={encryptedPayload}
                readOnly
                className="w-full bg-black/20 text-white p-4 rounded-lg font-mono text-xs"
                rows={6}
              />
              <p className="text-sm text-gray-400 mt-2">
                This encrypted data will be stored on-chain and processed by the FHE compute worker.
              </p>
            </div>

            {writeError && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                Error: {writeError.message}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending || isConfirming || isSuccess}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition"
            >
              {isPending 
                ? 'Waiting for approval...' 
                : isConfirming 
                ? 'Submitting...' 
                : isSuccess
                ? '✓ Submitted'
                : 'Submit to Smart Contract'}
            </button>

            {hash && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-300">Transaction Hash:</p>
                <p className="text-xs text-white font-mono break-all">{hash}</p>
              </div>
            )}

            {isSuccess && (
              <div className="mt-6 p-4 bg-green-500/20 border border-green-500 rounded-lg">
                <p className="text-green-300 font-semibold mb-2">✓ Transaction Successful!</p>
                <p className="text-white text-sm mb-4">
                  Your encrypted data has been submitted. The FHE compute worker will process it and store the encrypted result.
                </p>
                <Link
                  href="/decrypt"
                  className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition mt-4 text-center"
                >
                  Check Result →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

