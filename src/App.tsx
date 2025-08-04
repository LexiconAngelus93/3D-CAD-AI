import React from 'react';
import { AppProvider } from './context/AppContext';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import Viewport from './components/Viewport';
import StatusBar from './components/StatusBar';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="app">
      <LoadingScreen />
      <div className="app-layout">
        <header className="app-header">
          <Toolbar />
        </header>
        
        <div className="app-body">
          <aside className="app-sidebar">
            <Sidebar />
          </aside>
          
          <main className="app-main">
            <Viewport />
          </main>
        </div>
        
        <footer className="app-footer">
          <StatusBar />
        </footer>
      </div>
    </div>
  );
};

export default App;

