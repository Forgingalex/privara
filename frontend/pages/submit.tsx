import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { parseHexPayload } from '../utils/encryption';

// Privara Contract ABI (includes hasUserSubmitted check)
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
  },
  {
    name: 'hasUserSubmitted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' }
    ],
    outputs: [
      { name: '', type: 'bool' }
    ]
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
  const [txFailed, setTxFailed] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [step, setStep] = useState<'submit' | 'compute'>('submit');
  const [checkingSubmission, setCheckingSubmission] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const isRealContract = contractAddress && contractAddress !== '0x0000000000000000000000000000000000000001';

  // Contract write hooks with error handling
  const { 
    writeContract: submitMetrics, 
    data: submitTxHash, 
    isPending: isSubmitPending,
    error: submitError,
    reset: resetSubmit
  } = useWriteContract();
  const { 
    writeContract: computeReputation, 
    data: computeTxHash, 
    isPending: isComputePending,
    error: computeError,
    reset: resetCompute
  } = useWriteContract();
  
  // Transaction receipt hooks with error handling
  const { 
    isLoading: isSubmitConfirming, 
    isSuccess: isSubmitConfirmed,
    isError: isSubmitReceiptError,
    error: submitReceiptError
  } = useWaitForTransactionReceipt({
    hash: submitTxHash,
  });
  const { 
    isLoading: isComputeConfirming, 
    isSuccess: isComputeConfirmed,
    isError: isComputeReceiptError,
    error: computeReceiptError
  } = useWaitForTransactionReceipt({
    hash: computeTxHash,
  });

  // Check if user has already submitted
  const { data: hasSubmitted, refetch: checkSubmission } = useReadContract({
    address: contractAddress,
    abi: PRIVARA_ABI,
    functionName: 'hasUserSubmitted',
    args: address ? [address] : undefined,
    query: {
      enabled: !!contractAddress && !!address && isConnected && !isDemoMode,
    },
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

  // Check submission status when address or contract changes
  useEffect(() => {
    if (isConnected && address && contractAddress && !isDemoMode) {
      setCheckingSubmission(true);
      checkSubmission?.().then((result) => {
        setCheckingSubmission(false);
        if (result.data === true) {
          setError('You have already submitted metrics with this wallet address. Each address can only submit once.');
        }
      }).catch(() => {
        setCheckingSubmission(false);
      });
    }
  }, [address, contractAddress, isConnected, isDemoMode, checkSubmission]);

  // Handle transaction write errors
  useEffect(() => {
    if (submitError) {
      console.error('❌ Transaction submission error:', submitError);
      setError(`Transaction failed: ${submitError.message || 'Failed to submit transaction'}`);
      setTxFailed(true);
      setIsSubmitting(false);
    }
  }, [submitError]);

  useEffect(() => {
    if (computeError) {
      console.error('❌ Compute transaction error:', computeError);
      setError(`Compute failed: ${computeError.message || 'Failed to compute reputation'}`);
      setTxFailed(true);
      setIsSubmitting(false);
    }
  }, [computeError]);

  // Handle transaction receipt errors (transaction reverted)
  useEffect(() => {
    if (isSubmitReceiptError && submitTxHash) {
      console.error('❌ Transaction receipt error:', submitReceiptError);
      const errorMsg = submitReceiptError?.message || 'Transaction reverted or failed';
      
      // Try to extract revert reason
      let displayError = 'Transaction failed on blockchain';
      if (errorMsg.includes('Already submitted') || errorMsg.includes('already')) {
        displayError = 'You have already submitted metrics. Each wallet address can only submit once.';
      } else if (errorMsg.includes('revert')) {
        displayError = 'Transaction was reverted. This might mean invalid data format or you already submitted.';
      }
      
      setError(displayError);
      setTxFailed(true);
      setIsSubmitting(false);
    }
  }, [isSubmitReceiptError, submitReceiptError, submitTxHash]);

  useEffect(() => {
    if (isComputeReceiptError && computeTxHash) {
      console.error('❌ Compute receipt error:', computeReceiptError);
      setError(`Compute transaction failed: ${computeReceiptError?.message || 'Transaction reverted'}`);
      setTxFailed(true);
      setIsSubmitting(false);
    }
  }, [isComputeReceiptError, computeReceiptError, computeTxHash]);

  // Reset submitting state when tx hash is received
  useEffect(() => {
    if (submitTxHash && !txFailed) {
      console.log('📝 Transaction hash received:', submitTxHash);
      setIsSubmitting(false); // Reset submitting, now waiting for confirmation
      setTxHash(submitTxHash);
    }
  }, [submitTxHash, txFailed]);

  // Handle submit confirmation
  useEffect(() => {
    if (isSubmitConfirmed && step === 'submit') {
      console.log('✅ Metrics submitted successfully');
      setStep('compute');
      // Automatically trigger compute
      if (isRealContract && contractAddress) {
        handleCompute();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Reset error and failed states
    setError(null);
    setTxFailed(false);
    resetSubmit?.();
    resetCompute?.();

    // Check if user has already submitted (for real contract only)
    if (!isDemoMode && contractAddress) {
      setCheckingSubmission(true);
      try {
        const result = await checkSubmission?.();
        if (result?.data === true) {
          setError('You have already submitted metrics with this wallet address. Each address can only submit once.');
          setCheckingSubmission(false);
          return;
        }
      } catch (err) {
        console.warn('Could not check submission status:', err);
      }
      setCheckingSubmission(false);
    }

    setIsSubmitting(true);

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

    // Validate handles before submission
    if (handles.length !== 8) {
      setError(`Invalid encrypted data: Expected 8 handles, got ${handles.length}. Please encrypt your data again.`);
      setIsSubmitting(false);
      return;
    }

    // Validate handles are not empty
    const emptyHandles = handles.some(h => !h || h.length === 0);
    if (emptyHandles) {
      setError('Invalid encrypted data: Some handles are empty. Please encrypt your data again.');
      setIsSubmitting(false);
      return;
    }

    // Validate proof exists
    if (!inputProof || inputProof.length === 0) {
      setError('Invalid encrypted data: Missing proof. Please encrypt your data again.');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('📤 Submitting to contract:', contractAddress);
      console.log('   Handles count:', handles.length);
      console.log('   Input proof length:', inputProof.length, 'bytes');
      console.log('   Handle sizes:', handles.map(h => h.length));
      
      // Convert handles to bytes32 format - ensure exactly 32 bytes each
      const handlesBytes32 = handles.map((h, index) => {
        // Ensure handle is exactly 32 bytes
        const handle32 = new Uint8Array(32);
        
        if (h.length > 32) {
          // Truncate if longer than 32 bytes
          handle32.set(h.slice(0, 32));
          console.warn(`Handle ${index} was ${h.length} bytes, truncated to 32`);
        } else if (h.length < 32) {
          // Pad with zeros if shorter than 32 bytes
          handle32.set(h);
          console.warn(`Handle ${index} was ${h.length} bytes, padded to 32`);
        } else {
          // Already 32 bytes - use directly
          handle32.set(h);
        }
        
        // Convert to hex string
        const hex = '0x' + Array.from(handle32)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        return hex as `0x${string}`;
      });

      // Validate handles are properly formatted
      handlesBytes32.forEach((handle, i) => {
        if (!handle || handle.length !== 66) { // 0x + 64 hex chars = 66
          throw new Error(`Invalid handle format at index ${i}: ${handle}`);
        }
      });

      // Format input proof as hex
      const proofHex = '0x' + Array.from(inputProof)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('') as `0x${string}`;
      
      console.log('   Formatted handles:', handlesBytes32.map(h => h.slice(0, 10) + '...'));
      console.log('   Proof hex length:', proofHex.length, 'characters');

      submitMetrics(
        {
          address: contractAddress,
          abi: PRIVARA_ABI,
          functionName: 'submitMetrics',
          args: [
            handlesBytes32 as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
            proofHex
          ],
        },
        {
          onError: (error) => {
            console.error('Transaction error:', error);
            const errorMsg = error?.message || 'Unknown error';
            
            // Provide more helpful error messages
            let displayError = `Transaction failed: ${errorMsg}`;
            if (errorMsg.includes('execution reverted')) {
              displayError = 'Transaction was reverted by the contract. This might mean invalid data format or you already submitted.';
            } else if (errorMsg.includes('user rejected')) {
              displayError = 'Transaction was rejected by user.';
            }
            
            setError(displayError);
            setTxFailed(true);
            setIsSubmitting(false);
          },
        }
      );
      
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
            disabled={isProcessing || isSuccess || checkingSubmission || hasSubmitted === true}
            style={{
              width: '100%',
              background: isSuccess ? '#22c55e' : txFailed ? '#ef4444' : '#FEDA15',
              color: isSuccess || txFailed ? '#fff' : '#000',
              borderRadius: '9999px',
              fontWeight: 'bold',
              padding: '14px 32px',
              fontSize: '16px',
              border: 'none',
              cursor: (isProcessing || isSuccess || checkingSubmission || hasSubmitted === true) ? 'not-allowed' : 'pointer',
              opacity: (isProcessing || checkingSubmission) ? 0.7 : 1,
              marginBottom: '1rem'
            }}
          >
            {checkingSubmission
              ? '⏳ Checking submission status...'
              : hasSubmitted === true
                ? '✓ Already Submitted'
                : txFailed 
                  ? '❌ Transaction Failed - Click to Retry'
                  : isProcessing 
                    ? (isComputePending || isComputeConfirming ? '⏳ Computing...' : '⏳ Submitting...') 
                    : isSuccess 
                      ? '✓ Submitted Successfully' 
                      : 'Submit to Smart Contract'
            }
          </button>

          {/* Transaction Hash */}
          {(submitTxHash || txHash) && !txFailed && (
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

          {/* Failed Transaction Details */}
          {txFailed && submitTxHash && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>❌ Transaction Failed</p>
              <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Transaction Hash:</p>
              <code style={{ fontSize: '0.75rem', color: 'white', wordBreak: 'break-all' }}>
                {submitTxHash}
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
