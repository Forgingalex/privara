import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { parseHexPayload } from '../utils/encryption';

// Privara Contract ABI (minimal - just submitMetrics)
const PRIVARA_ABI = [
  {
    name: 'submitMetrics',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'metrics', type: 'bytes32[8]' },
      { name: 'inputProof', type: 'bytes' }
    ],
    outputs: []
  },
  {
    name: 'computeReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  }
] as const;

export default function SubmitPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [encryptedPayload, setEncryptedPayload] = useState<string>('');
  const [handles, setHandles] = useState<Uint8Array[]>([]);
  const [inputProof, setInputProof] = useState<Uint8Array | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [step, setStep] = useState<'submit' | 'compute'>('submit');

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const isRealContract = contractAddress && contractAddress !== '0x0000000000000000000000000000000000000001';

  // Contract write hooks
  const { writeContract: submitMetrics, data: submitTxHash, isPending: isSubmitPending } = useWriteContract();
  const { writeContract: computeReputation, data: computeTxHash, isPending: isComputePending } = useWriteContract();
  
  // Transaction receipt hooks
  const { isLoading: isSubmitConfirming, isSuccess: isSubmitConfirmed } = useWaitForTransactionReceipt({
    hash: submitTxHash,
  });
  const { isLoading: isComputeConfirming, isSuccess: isComputeConfirmed } = useWaitForTransactionReceipt({
    hash: computeTxHash,
  });

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Load encrypted data
    const stored = localStorage.getItem('encryptedPayload');
    const storedHandles = localStorage.getItem('encryptedHandles');
    const storedProof = localStorage.getItem('encryptedProof');
    
    if (stored) {
      setEncryptedPayload(stored);
      
      // Try to load pre-parsed handles and proof
      if (storedHandles && storedProof) {
        try {
          const parsedHandles = JSON.parse(storedHandles).map((arr: number[]) => new Uint8Array(arr));
          const parsedProof = new Uint8Array(JSON.parse(storedProof));
          setHandles(parsedHandles);
          setInputProof(parsedProof);
        } catch (e) {
          console.warn('Could not parse stored handles/proof');
        }
      }
      
      // Fallback: parse from hex payload
      if (!storedHandles) {
        try {
          const { handles: h, inputProof: p } = parseHexPayload(stored);
          setHandles(h);
          setInputProof(p);
        } catch (e) {
          console.warn('Could not parse encrypted payload');
        }
      }
    } else {
      router.push('/encrypt');
    }
    
    // Check if we should use demo mode
    setIsDemoMode(!isRealContract);
  }, [isConnected, router, isRealContract]);

  // Handle submit confirmation
  useEffect(() => {
    if (isSubmitConfirmed && step === 'submit') {
      console.log('✅ Metrics submitted successfully');
      setStep('compute');
      // Automatically trigger compute
      handleCompute();
    }
  }, [isSubmitConfirmed, step]);

  // Handle compute confirmation
  useEffect(() => {
    if (isComputeConfirmed) {
      console.log('✅ Reputation computed successfully');
      setIsSuccess(true);
      setTxHash(computeTxHash || submitTxHash || null);
      localStorage.setItem('submissionTxHash', computeTxHash || submitTxHash || '');
    }
  }, [isComputeConfirmed, computeTxHash, submitTxHash]);

  const handleCompute = async () => {
    if (!isRealContract || !contractAddress) return;
    
    try {
      computeReputation({
        address: contractAddress,
        abi: PRIVARA_ABI,
        functionName: 'computeReputation',
      });
    } catch (err: any) {
      console.error('Compute failed:', err);
      setError('Failed to compute reputation: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!encryptedPayload || !address) return;

    setIsSubmitting(true);
    setError(null);

    if (isDemoMode) {
      // Demo mode: Simulate blockchain submission
      await handleDemoSubmit();
    } else {
      // Real mode: Submit to smart contract
      await handleRealSubmit();
    }
  };

  const handleRealSubmit = async () => {
    if (!contractAddress || !handles.length || !inputProof) {
      setError('Missing contract address or encrypted data');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('📤 Submitting to contract:', contractAddress);
      
      // Convert handles to bytes32 format
      const handlesBytes32 = handles.map(h => {
        // Pad to 32 bytes
        const padded = new Uint8Array(32);
        padded.set(h.slice(0, 32));
        return ('0x' + Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
      });

      // Ensure we have exactly 8 handles
      while (handlesBytes32.length < 8) {
        handlesBytes32.push('0x' + '00'.repeat(32) as `0x${string}`);
      }

      submitMetrics({
        address: contractAddress,
        abi: PRIVARA_ABI,
        functionName: 'submitMetrics',
        args: [
          handlesBytes32.slice(0, 8) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
          ('0x' + Array.from(inputProof).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
        ],
      });
      
    } catch (err: any) {
      console.error('Submit failed:', err);
      setError(err.message || 'Submission failed');
      setIsSubmitting(false);
    }
  };

  const handleDemoSubmit = async () => {
    try {
      console.log('📤 Submitting encrypted data (demo mode)...');
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock transaction hash
      const mockTxHash = '0x' + Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      setTxHash(mockTxHash);
      
      // Store submission data for decrypt page
      localStorage.setItem('submittedPayload', encryptedPayload);
      localStorage.setItem('submissionTimestamp', Date.now().toString());
      localStorage.setItem('submissionTxHash', mockTxHash);
      
      // Simulate computing reputation
      setTimeout(() => {
        try {
          const { handles: h } = parseHexPayload(encryptedPayload);
          // Generate deterministic mock results based on handle data
          const seed = h.reduce((acc, handle) => acc + handle.reduce((a, b) => a + b, 0), 0);
          
          const result = {
            authenticity: 70 + (seed % 25),
            influence: 60 + (seed % 30),
            account_health: 75 + (seed % 20),
            risk_score: 5 + (seed % 20),
            momentum: 55 + (seed % 35),
          };
          
          localStorage.setItem('computedReputation', JSON.stringify(result));
          console.log('✅ Demo reputation computed:', result);
        } catch (e) {
          console.warn('Could not compute demo reputation');
        }
      }, 500);
      
      setIsSuccess(true);
      console.log('✅ Submission successful (demo mode)');
      
    } catch (err: any) {
      console.error('Submit failed:', err);
      setError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isSubmitting || isSubmitPending || isSubmitConfirming || isComputePending || isComputeConfirming;

  if (!encryptedPayload) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FEDA15 0%, #0d1b2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>No encrypted data found. Please encrypt first.</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FEDA15 0%, #0d1b2a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 700, color: 'white' }}>Privara</span>
          <img src="/logo.svg" alt="Logo" style={{ height: '42px', width: '42px' }} />
        </div>

        <h1 style={{ color: 'white', fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>Submit to Contract</h1>
        <p style={{ color: isDemoMode ? '#fbbf24' : '#22c55e', textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {isDemoMode ? '🎭 Demo Mode (Simulated Transaction)' : '🔗 Connected to Sepolia Testnet'}
        </p>

        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem' }}>
          {/* Encrypted Payload Preview */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'white', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
              Encrypted Payload ({handles.length} encrypted values)
            </label>
            <div style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '1rem', 
              borderRadius: '8px', 
              maxHeight: '120px', 
              overflow: 'auto' 
            }}>
              <code style={{ fontSize: '0.7rem', color: '#ccc', wordBreak: 'break-all' }}>
                {encryptedPayload.slice(0, 200)}...
              </code>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#aaa', marginTop: '0.5rem' }}>
              {isDemoMode 
                ? 'Demo mode: Transaction will be simulated locally.'
                : `This will be submitted to contract: ${contractAddress?.slice(0, 10)}...${contractAddress?.slice(-8)}`
              }
            </p>
          </div>

          {/* Progress Steps */}
          {!isDemoMode && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ 
                flex: 1, 
                padding: '0.75rem', 
                borderRadius: '8px',
                background: step === 'submit' ? 'rgba(254,218,21,0.2)' : isSubmitConfirmed ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${step === 'submit' ? '#FEDA15' : isSubmitConfirmed ? '#22c55e' : '#444'}`
              }}>
                <p style={{ color: 'white', fontSize: '0.875rem', margin: 0 }}>
                  {isSubmitConfirmed ? '✓' : '1.'} Submit Metrics
                </p>
              </div>
              <div style={{ 
                flex: 1, 
                padding: '0.75rem', 
                borderRadius: '8px',
                background: step === 'compute' ? 'rgba(254,218,21,0.2)' : isComputeConfirmed ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${step === 'compute' ? '#FEDA15' : isComputeConfirmed ? '#22c55e' : '#444'}`
              }}>
                <p style={{ color: 'white', fontSize: '0.875rem', margin: 0 }}>
                  {isComputeConfirmed ? '✓' : '2.'} Compute Reputation
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid #ff6b6b', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing || isSuccess}
            style={{
              width: '100%',
              background: isSuccess ? '#22c55e' : '#FEDA15',
              color: '#000',
              borderRadius: '9999px',
              fontWeight: 'bold',
              padding: '14px 32px',
              fontSize: '16px',
              border: 'none',
              cursor: isProcessing || isSuccess ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
              marginBottom: '1rem'
            }}
          >
            {isProcessing 
              ? (isComputePending || isComputeConfirming ? '⏳ Computing...' : '⏳ Submitting...') 
              : isSuccess 
                ? '✓ Submitted Successfully' 
                : 'Submit to Smart Contract'
            }
          </button>

          {/* Transaction Hash */}
          {(submitTxHash || txHash) && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Transaction Hash:</p>
              <code style={{ fontSize: '0.75rem', color: 'white', wordBreak: 'break-all' }}>
                {submitTxHash || txHash}
              </code>
              {!isDemoMode && submitTxHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${submitTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', color: '#FEDA15', fontSize: '0.75rem', marginTop: '0.5rem' }}
                >
                  View on Etherscan ↗
                </a>
              )}
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div style={{ 
              background: 'rgba(34,197,94,0.2)', 
              border: '1px solid #22c55e', 
              borderRadius: '8px', 
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ✓ Transaction Successful!
              </p>
              <p style={{ color: 'white', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Your encrypted data has been submitted. The reputation has been computed.
              </p>
              <Link
                href="/decrypt"
                style={{
                  display: 'inline-block',
                  background: '#FEDA15',
                  color: '#000',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  padding: '12px 24px',
                  textDecoration: 'none'
                }}
              >
                View Reputation →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
