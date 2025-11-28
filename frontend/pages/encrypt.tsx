import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import type { TwitterMetrics } from '../utils/encryption';
import { generateMockTwitterMetrics } from '../utils/twitter';
import Link from 'next/link';

export default function EncryptPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [metrics, setMetrics] = useState<TwitterMetrics | null>(null);
  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fheReady, setFheReady] = useState(false);
  const [isRealEncryption, setIsRealEncryption] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    const isTwitterConnected = typeof window !== 'undefined' && localStorage.getItem('twitterMockConnected') === 'true';
    if (!isTwitterConnected) {
      setError('Please connect Twitter first on the home page');
      return;
    }

    const initialize = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Wait for wallet to be fully ready (fhedback approach)
        if (!window.ethereum) {
          setError('Please connect your wallet first');
          return;
        }
        
        // Give wallet provider a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // CRITICAL: Lazy-load encryption utils only after component mounts in browser
        // This prevents any SDK code from executing during module import/evaluation
        const encryptionUtils = await import('../utils/encryption');
        const { initializeFHE, isRealFHE, validateMetrics } = encryptionUtils;
        
        // Initialize FHE SDK (will check for wallet internally)
        await initializeFHE();
        setFheReady(true);
        setIsRealEncryption(isRealFHE());
        
        // Load metrics
        const data = generateMockTwitterMetrics();
        if (!validateMetrics(data)) {
          setError('Invalid metrics data');
          return;
        }
        setMetrics(data);
      } catch (err: any) {
        console.error('FHE initialization error:', err);
        setError(`Failed to initialize: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [isConnected, router]);

  const handleEncrypt = async () => {
    if (!metrics || !address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Lazy-load encryption utils
      const encryptionUtils = await import('../utils/encryption');
      const { encryptMetrics, isRealFHE: isRealFHECheck } = encryptionUtils;
      
      const result = await encryptMetrics(metrics, address);
      setEncryptedData(result.hexPayload);
      
      // Store encrypted data for contract submission
      localStorage.setItem('encryptedPayload', result.hexPayload);
      localStorage.setItem('encryptedHandles', JSON.stringify(
        result.handles.map(h => Array.from(h))
      ));
      localStorage.setItem('encryptedProof', JSON.stringify(
        Array.from(result.inputProof)
      ));
      
      console.log('✅ Encryption complete');
      console.log('   Real FHE:', isRealFHECheck());
      console.log('   Payload size:', result.hexPayload.length, 'chars');
    } catch (err: any) {
      setError(err.message || 'Encryption failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FEDA15 0%, #0d1b2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ marginBottom: '1rem' }}>{loading ? 'Loading...' : 'Preparing...'}</div>
          {error && <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FEDA15 0%, #0d1b2a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '4rem' }}>
        <h1 style={{ color: 'white', fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>Encrypt Metrics</h1>
        <p style={{ color: isRealEncryption ? '#22c55e' : '#fbbf24', textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {isRealEncryption ? '🔐 Using Zama FHE (Real Encryption)' : '⚠️ Using Mock Encryption (Demo Mode)'}
        </p>
        
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>Your Twitter Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
              <div style={{ fontSize: '0.875rem', color: '#ccc' }}>Followers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{metrics.follower_count.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
              <div style={{ fontSize: '0.875rem', color: '#ccc' }}>Following</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{metrics.following_count.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
              <div style={{ fontSize: '0.875rem', color: '#ccc' }}>Engagement Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{metrics.engagement_rate.toFixed(2)}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
              <div style={{ fontSize: '0.875rem', color: '#ccc' }}>Account Age</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{metrics.account_age_days} days</div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem' }}>
          {error && (
            <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleEncrypt}
            disabled={loading || !!encryptedData}
            style={{
              width: '100%',
              background: encryptedData ? '#6b7280' : '#FEDA15',
              color: '#000',
              borderRadius: '9999px',
              fontWeight: 'bold',
              padding: '14px 32px',
              fontSize: '16px',
              border: 'none',
              cursor: encryptedData ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Encrypting...' : encryptedData ? '✓ Done' : 'Encrypt Metrics'}
          </button>

          {encryptedData && (
            <div>
              <p style={{ color: 'white', marginBottom: '0.5rem' }}>✓ Encryption Complete</p>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#ccc', wordBreak: 'break-all' }}>
                  {encryptedData.slice(0, 100)}...
                </p>
              </div>
              <Link
                href="/submit"
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'white',
                  color: '#000',
                  borderRadius: '9999px',
                  fontWeight: 'bold',
                  padding: '14px 32px',
                  fontSize: '16px',
                  textAlign: 'center',
                  textDecoration: 'none'
                }}
              >
                Submit to Contract →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
