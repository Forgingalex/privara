import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import { useFHE } from '../context/FHEContext';
import type { TwitterMetrics } from '../utils/encryption';
import { encryptMetrics, validateMetrics } from '../utils/encryption';
import { generateMockTwitterMetrics } from '../utils/twitter';
import Link from 'next/link';

export default function EncryptPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { fheInstance, isLoading: fheLoading, error: fheError, isReady: fheReady, isInitialized } = useFHE();
  const [metrics, setMetrics] = useState<TwitterMetrics | null>(null);
  const [encryptedData, setEncryptedData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Load metrics
    const data = generateMockTwitterMetrics();
    if (!validateMetrics(data)) {
      setError('Invalid metrics data');
      return;
    }
    setMetrics(data);

    // Display FHE initialization errors
    if (fheError) {
      setError(
        'FHE SDK initialization failed: ' + fheError + '. ' +
        'Please refresh the page and ensure your wallet is connected.'
      );
    }
  }, [isConnected, router, fheError]);

  const handleEncrypt = async () => {
    if (!metrics || !address || !fheInstance) {
      setError('FHE SDK not ready. Please wait for initialization or refresh the page.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await encryptMetrics(fheInstance, metrics, address);
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
      console.log('   Real FHE: true (via FHEProvider)');
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
        <p style={{ color: isInitialized ? '#22c55e' : fheLoading ? '#fbbf24' : '#ef4444', textAlign: 'center', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {!isInitialized ? (fheLoading ? '⏳ Loading FHE...' : '⚠️ FHE SDK Not Ready') : '🔐 Using Zama FHE (Real Encryption)'}
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
            disabled={loading || !!encryptedData || !fheReady || fheLoading}
            style={{
              width: '100%',
              background: encryptedData ? '#6b7280' : (!fheReady || fheLoading) ? '#9ca3af' : '#FEDA15',
              color: '#000',
              borderRadius: '9999px',
              fontWeight: 'bold',
              padding: '14px 32px',
              fontSize: '16px',
              border: 'none',
              cursor: (encryptedData || !fheReady || fheLoading) ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {fheLoading ? 'Initializing...' : loading ? 'Encrypting...' : encryptedData ? '✓ Done' : !fheReady ? 'Waiting for FHE SDK...' : 'Encrypt Metrics'}
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
