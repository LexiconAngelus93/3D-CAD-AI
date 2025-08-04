import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import AIAssistant from './AIAssistant';

const Viewport: React.FC = () => {
  const { cadEngine, appState, selectTool } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      cadEngine.setContainer(containerRef.current);
      setIsInitialized(true);

      // Set up event listeners
      const container = containerRef.current;
      
      // Handle object selection
      const handleObjectSelected = (event: CustomEvent) => {
        const objectId = event.detail.objectId;
        if (objectId) {
          cadEngine.selectObjects([objectId]);
        }
      };

      container.addEventListener('objectSelected', handleObjectSelected as EventListener);

      // Handle viewport clicks for creating objects
      const handleViewportClick = (event: MouseEvent) => {
        if (appState.selectedTool !== 'select') {
          createObjectAtPosition(event);
        }
      };

      container.addEventListener('click', handleViewportClick);

      return () => {
        container.removeEventListener('objectSelected', handleObjectSelected as EventListener);
        container.removeEventListener('click', handleViewportClick);
      };
    }
  }, [cadEngine, isInitialized, appState.selectedTool]);

  const createObjectAtPosition = (event: MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Convert screen coordinates to world coordinates (simplified)
    const worldX = x * 5;
    const worldZ = y * 5;

    let objectId: string;

    try {
      switch (appState.selectedTool) {
        case 'box':
          objectId = cadEngine.createBox(1, 1, 1);
          break;
        case 'sphere':
          objectId = cadEngine.createSphere(0.5);
          break;
        case 'cylinder':
          objectId = cadEngine.createCylinder(0.5, 0.5, 1);
          break;
        default:
          return;
      }

      // Position the object
      const object = cadEngine.getObject(objectId);
      if (object) {
        object.mesh.position.set(worldX, 0, worldZ);
        cadEngine.render();
      }

      // Select the new object
      cadEngine.selectObjects([objectId]);

      // Reset tool to select
      selectTool('select');
    } catch (error) {
      console.error('Failed to create object:', error);
    }
  };

  const handleResize = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      cadEngine.resize(clientWidth, clientHeight);
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="viewport-container">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: appState.selectedTool === 'select' ? 'default' : 'crosshair'
        }}
      />
      
      {/* Viewport Controls */}
      <ViewportControls />
      
      {/* Tool Indicator */}
      {appState.selectedTool !== 'select' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          pointerEvents: 'none'
        }}>
          Tool: {appState.selectedTool} - Click to place
        </div>
      )}

      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

const ViewportControls: React.FC = () => {
  const { cadEngine } = useApp();

  const viewDirections = [
    { name: 'Front', value: 'front' as const },
    { name: 'Back', value: 'back' as const },
    { name: 'Left', value: 'left' as const },
    { name: 'Right', value: 'right' as const },
    { name: 'Top', value: 'top' as const },
    { name: 'Bottom', value: 'bottom' as const },
    { name: 'Iso', value: 'iso' as const },
  ];

  const handleViewDirection = (direction: typeof viewDirections[0]['value']) => {
    cadEngine.renderEngine?.setViewDirection(direction);
    cadEngine.render();
  };

  const handleResetCamera = () => {
    cadEngine.renderEngine?.resetCamera();
    cadEngine.render();
  };

  const handleFitToView = () => {
    const allObjects = cadEngine.getAllObjects().map(obj => obj.mesh);
    cadEngine.renderEngine?.fitToView(allObjects);
    cadEngine.render();
  };

  const handleTakeScreenshot = () => {
    const dataURL = cadEngine.renderEngine?.takeScreenshot();
    if (dataURL) {
      const link = document.createElement('a');
      link.download = 'viewport-screenshot.png';
      link.href = dataURL;
      link.click();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* View Direction Controls */}
      <div style={{
        background: 'rgba(42, 42, 42, 0.9)',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '4px',
        minWidth: '120px'
      }}>
        {viewDirections.map(dir => (
          <button
            key={dir.value}
            className="btn btn-secondary"
            onClick={() => handleViewDirection(dir.value)}
            style={{
              fontSize: '10px',
              padding: '4px 6px',
              minWidth: '32px'
            }}
          >
            {dir.name}
          </button>
        ))}
      </div>

      {/* Camera Controls */}
      <div style={{
        background: 'rgba(42, 42, 42, 0.9)',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <button
          className="btn btn-secondary"
          onClick={handleResetCamera}
          style={{ fontSize: '12px', padding: '6px' }}
        >
          🏠 Reset
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleFitToView}
          style={{ fontSize: '12px', padding: '6px' }}
        >
          🔍 Fit All
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleTakeScreenshot}
          style={{ fontSize: '12px', padding: '6px' }}
        >
          📷 Screenshot
        </button>
      </div>

      {/* Render Settings */}
      <RenderSettings />
    </div>
  );
};

const RenderSettings: React.FC = () => {
  const { cadEngine } = useApp();
  const [settings, setSettings] = useState({
    wireframe: false,
    showGrid: true,
    showAxes: true,
    shadows: true
  });

  const updateSetting = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Update render engine settings
    cadEngine.renderEngine?.updateSettings(newSettings);
    cadEngine.render();
  };

  return (
    <div style={{
      background: 'rgba(42, 42, 42, 0.9)',
      border: '1px solid #444',
      borderRadius: '4px',
      padding: '8px',
      fontSize: '12px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Display</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={settings.wireframe}
            onChange={(e) => updateSetting('wireframe', e.target.checked)}
          />
          Wireframe
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={settings.showGrid}
            onChange={(e) => updateSetting('showGrid', e.target.checked)}
          />
          Grid
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={settings.showAxes}
            onChange={(e) => updateSetting('showAxes', e.target.checked)}
          />
          Axes
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={settings.shadows}
            onChange={(e) => updateSetting('shadows', e.target.checked)}
          />
          Shadows
        </label>
      </div>
    </div>
  );
};

export default Viewport;

