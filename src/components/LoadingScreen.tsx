import React from 'react';
import { useApp } from '../context/AppContext';

const LoadingScreen: React.FC = () => {
  const { appState } = useApp();

  if (!appState.isLoading) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #333',
          borderTop: '4px solid #007acc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Initializing 3D CAD Engine...
        </div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>
          Loading AI, PCB, and Simulation modules
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;

