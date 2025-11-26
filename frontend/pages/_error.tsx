import type { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1a1a2e',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        {statusCode ? `Error ${statusCode}` : 'An error occurred'}
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        {statusCode === 404
          ? 'This page could not be found.'
          : 'Something went wrong.'}
      </p>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#9333ea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold',
          marginTop: '1rem'
        }}
      >
        Go Home
      </button>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 404;
  return { statusCode };
};

export default Error;

