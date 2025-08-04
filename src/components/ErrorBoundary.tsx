import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: '#2a2a2a',
            padding: '30px',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <h1 style={{ 
              color: '#ff6b6b', 
              marginBottom: '20px',
              fontSize: '24px'
            }}>
              🚨 Application Error
            </h1>
            
            <p style={{ 
              marginBottom: '20px',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              The 3D CAD application encountered an unexpected error and needs to be restarted.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '14px',
                fontFamily: 'monospace',
                border: '1px solid #444',
                overflow: 'auto'
              }}>
                <strong>Error:</strong> {this.state.error.message}
                {this.state.error.stack && (
                  <pre style={{ 
                    marginTop: '10px',
                    fontSize: '12px',
                    opacity: 0.8,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#007acc',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                🔄 Reload Application
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🗑️ Clear Data & Reload
              </button>
            </div>

            <div style={{
              marginTop: '20px',
              fontSize: '12px',
              opacity: 0.6,
              lineHeight: '1.4'
            }}>
              If this error persists, please check the browser console for more details
              or try using a different browser. The application requires WebGL support
              and modern JavaScript features.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

