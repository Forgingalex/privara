import { useState, useEffect } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { useRouter } from 'next/router';
import Link from 'next/link';
import type { ReputationVector } from '../utils/encryption';

export default function DecryptPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [reputation, setReputation] = useState<ReputationVector | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmission, setHasSubmission] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const isRealContract = contractAddress && contractAddress !== '0x0000000000000000000000000000000000000001';

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Initialize FHE and check mode (wait for wallet to be ready)
    const init = async () => {
      try {
        // Wait for wallet provider to be ready
        if (!window.ethereum) {
          console.warn('Ethereum provider not available yet');
          return;
        }
        
        // Give wallet a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // CRITICAL: Lazy-load encryption utils only after component mounts in browser
        // This prevents any SDK code from executing during module import/evaluation
        const encryptionUtils = await import('../utils/encryption');
        const { initializeFHE, isRealFHE } = encryptionUtils;
        
        await initializeFHE();
        setIsDemoMode(!isRealFHE() || !isRealContract);
      } catch (err: any) {
        console.error('Failed to initialize FHE:', err);
        // Don't block the page, just set demo mode
        setIsDemoMode(true);
      }
    };
    init();
    
    // Check for existing submission
    const submitted = localStorage.getItem('submittedPayload');
    const computed = localStorage.getItem('computedReputation');
    
    if (submitted) {
      setHasSubmission(true);
      
      // Auto-load if already computed
      if (computed) {
        try {
          setReputation(JSON.parse(computed));
        } catch (e) {
          console.warn('Could not parse stored reputation');
        }
      }
    }
  }, [isConnected, router, isRealContract]);

  const handleDecrypt = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to get pre-computed reputation first
      const computed = localStorage.getItem('computedReputation');
      if (computed) {
        const rep = JSON.parse(computed);
        setReputation(rep);
        console.log('✅ Loaded pre-computed reputation:', rep);
        return;
      }
      
      // Get encrypted payload
      const payload = localStorage.getItem('encryptedPayload');
      if (!payload) {
        throw new Error('No encrypted data found. Please complete the encryption and submission steps first.');
      }
      
      console.log('🔓 Decrypting reputation...');
      
      // Lazy-load encryption utils
      const encryptionUtils = await import('../utils/encryption');
      const { decryptResultDemo } = encryptionUtils;
      
      // Use demo decryption (TODO: implement real FHE decryption for production)
      const rep = await decryptResultDemo(payload);
      setReputation(rep);
      localStorage.setItem('computedReputation', JSON.stringify(rep));
      console.log('✅ Reputation decrypted:', rep);
      
    } catch (err: any) {
      console.error('Decryption failed:', err);
      setError(err.message || 'Decryption failed');
    } finally {
      setLoading(false);
    }
  };

  const ReputationCard = ({ label, value, color, description }: { 
    label: string; 
    value: number; 
    color: string;
    description: string;
  }) => (
    <div style={{ 
      background: 'rgba(255,255,255,0.1)', 
      borderRadius: '12px', 
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h3 style={{ color: 'white', fontWeight: 'bold', marginBottom: '0.5rem' }}>{label}</h3>
      <p style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '1rem' }}>{description}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${Math.min(100, value)}%`, 
            height: '100%', 
            background: color,
            transition: 'width 0.5s ease'
          }} />
        </div>
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem', minWidth: '60px', textAlign: 'right' }}>
          {Math.round(value)}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FEDA15 0%, #0d1b2a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: '28px', fontWeight: 700, color: 'white' }}>Privara</span>
          <img src="/logo.svg" alt="Logo" style={{ height: '42px', width: '42px' }} />
        </div>

        <h1 style={{ color: 'white', fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Your Reputation Vector
        </h1>
        <p style={{ color: isDemoMode ? '#fbbf24' : '#22c55e', textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {isDemoMode ? '🎭 Demo Mode (Simulated Decryption)' : '🔐 Using Zama FHE Decryption'}
        </p>

        {/* Status Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '16px', 
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          {!hasSubmission && !reputation ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#fbbf24', marginBottom: '1rem' }}>
                ⚠️ No submission found. Please encrypt and submit your data first.
              </p>
              <Link
                href="/encrypt"
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
                Go to Encrypt →
              </Link>
            </div>
          ) : !reputation ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'white', marginBottom: '1rem' }}>
                ✅ Encrypted data found. Click below to decrypt your reputation vector.
              </p>
              
              {/* Demo Mode Notice */}
              <div style={{ 
                background: 'rgba(254,218,21,0.2)', 
                border: '1px solid #FEDA15', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1.5rem',
                textAlign: 'left'
              }}>
                <p style={{ color: '#FEDA15', fontSize: '0.875rem', margin: 0 }}>
                  🎭 <strong>Demo Mode:</strong> Decryption is simulated. In production, this uses Zama FHE to decrypt on-chain data.
                </p>
              </div>

              {error && (
                <div style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid #ff6b6b', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#ff6b6b' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleDecrypt}
                disabled={loading}
                style={{
                  background: '#FEDA15',
                  color: '#000',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  padding: '14px 32px',
                  fontSize: '16px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? '🔓 Decrypting...' : 'Decrypt Reputation'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ✓ Reputation Decrypted Successfully
              </p>
              <p style={{ color: '#aaa', fontSize: '0.875rem' }}>
                Your privacy-preserving reputation scores computed from encrypted Twitter data.
              </p>
            </div>
          )}
        </div>

        {/* Reputation Display */}
        {reputation && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <ReputationCard 
              label="Authenticity" 
              value={reputation.authenticity}
              color="linear-gradient(90deg, #22c55e, #16a34a)"
              description="How genuine and authentic your account appears"
            />
            <ReputationCard 
              label="Influence" 
              value={reputation.influence}
              color="linear-gradient(90deg, #3b82f6, #2563eb)"
              description="Your reach and impact on the platform"
            />
            <ReputationCard 
              label="Account Health" 
              value={reputation.account_health}
              color="linear-gradient(90deg, #a855f7, #9333ea)"
              description="Overall health and engagement metrics"
            />
            <ReputationCard 
              label="Risk Score" 
              value={reputation.risk_score}
              color="linear-gradient(90deg, #ef4444, #dc2626)"
              description="Likelihood of suspicious activity (lower is better)"
            />
            <ReputationCard 
              label="Momentum" 
              value={reputation.momentum}
              color="linear-gradient(90deg, #FEDA15, #eab308)"
              description="Growth trajectory and engagement trends"
            />
          </div>
        )}

        {/* Navigation */}
        {reputation && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                background: 'white',
                color: '#000',
                borderRadius: '9999px',
                fontWeight: 'bold',
                padding: '12px 24px',
                textDecoration: 'none',
                marginRight: '1rem'
              }}
            >
              ← Back to Home
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('encryptedPayload');
                localStorage.removeItem('submittedPayload');
                localStorage.removeItem('computedReputation');
                localStorage.removeItem('twitterMockConnected');
                router.push('/');
              }}
              style={{
                background: 'transparent',
                border: '2px solid white',
                color: 'white',
                borderRadius: '9999px',
                fontWeight: 'bold',
                padding: '10px 22px',
                cursor: 'pointer'
              }}
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
