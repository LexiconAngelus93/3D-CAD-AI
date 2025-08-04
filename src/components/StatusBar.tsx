import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const StatusBar: React.FC = () => {
  const { cadEngine, appState } = useApp();
  const [stats, setStats] = useState({
    objectCount: 0,
    selectedCount: 0,
    renderTime: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const objects = cadEngine.getAllObjects();
      setStats({
        objectCount: objects.length,
        selectedCount: appState.selectedObjects.length,
        renderTime: 16, // Placeholder - would get from render engine
        memoryUsage: objects.length * 1024 // Rough estimate
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [cadEngine, appState.selectedObjects]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="status-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Object Count */}
        <span>
          Objects: {stats.objectCount}
        </span>

        {/* Selection Count */}
        {stats.selectedCount > 0 && (
          <span>
            Selected: {stats.selectedCount}
          </span>
        )}

        {/* Current Tool */}
        <span>
          Tool: {appState.selectedTool}
        </span>

        {/* View Mode */}
        <span>
          Mode: {appState.viewMode}
        </span>

        {/* Separator */}
        <div style={{ 
          width: '1px', 
          height: '16px', 
          backgroundColor: '#444' 
        }} />

        {/* Performance Stats */}
        <span>
          Render: {stats.renderTime}ms
        </span>

        <span>
          Memory: {formatBytes(stats.memoryUsage)}
        </span>

        {/* Grid Settings */}
        <span>
          Grid: {appState.showGrid ? 'On' : 'Off'} 
          {appState.showGrid && ` (${appState.gridSize})`}
        </span>

        {/* Snap Settings */}
        <span>
          Snap: {appState.snapToGrid ? 'On' : 'Off'}
        </span>
      </div>

      {/* Right side info */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Coordinates (would show mouse position in real implementation) */}
        <span>
          X: 0.00 Y: 0.00 Z: 0.00
        </span>

        {/* Status indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px' 
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#28a745'
          }} />
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;

