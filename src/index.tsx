import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Initialize the application
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);

// Hide loading screen
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      loading.style.display = 'none';
    }, 500);
  }
}, 1500);

