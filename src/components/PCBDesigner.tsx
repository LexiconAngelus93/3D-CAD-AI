import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const PCBDesigner: React.FC = () => {
  const { pcbEngine, appState } = useApp();
  const [currentBoard, setCurrentBoard] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [designRuleErrors, setDesignRuleErrors] = useState<string[]>([]);

  useEffect(() => {
    if (appState.viewMode === 'pcb' && !currentBoard) {
      // Create default board
      const boardId = pcbEngine.createBoard('Main Board', { width: 100, height: 80, thickness: 1.6 });
      setCurrentBoard(boardId);
    }
  }, [appState.viewMode, pcbEngine, currentBoard]);

  const handleAddComponent = (type: string, package: string) => {
    if (!currentBoard) return;

    try {
      const componentId = pcbEngine.addComponent(type, package, { x: 0, y: 0 });
      setSelectedComponent(componentId);
    } catch (error) {
      console.error('Failed to add component:', error);
    }
  };

  const handleRunDRC = () => {
    const result = pcbEngine.runDesignRuleCheck();
    setDesignRuleErrors(result.errors);
  };

  const handleAutoRoute = () => {
    const board = pcbEngine.getCurrentBoard();
    if (!board) return;

    board.nets.forEach(net => {
      pcbEngine.routeNet(net.id, 'auto');
    });
  };

  const handleExportGerber = () => {
    try {
      const { files, drillFile } = pcbEngine.exportGerber();
      
      // Create and download files
      files.forEach((content, filename) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });

      // Download drill file
      const drillBlob = new Blob([drillFile], { type: 'text/plain' });
      const drillUrl = URL.createObjectURL(drillBlob);
      const drillLink = document.createElement('a');
      drillLink.href = drillUrl;
      drillLink.download = 'drill.txt';
      drillLink.click();
      URL.revokeObjectURL(drillUrl);
    } catch (error) {
      console.error('Failed to export Gerber files:', error);
    }
  };

  if (appState.viewMode !== 'pcb') {
    return null;
  }

  return (
    <div className="pcb-designer">
      <div className="pcb-toolbar">
        <div className="toolbar-group">
          <h3>PCB Design</h3>
        </div>

        <div className="toolbar-group">
          <label>Components:</label>
          <select onChange={(e) => {
            const [type, pkg] = e.target.value.split('_');
            if (type && pkg) handleAddComponent(type, pkg);
          }}>
            <option value="">Select Component</option>
            <option value="resistor_0805">Resistor 0805</option>
            <option value="capacitor_0805">Capacitor 0805</option>
            <option value="ic_soic8">IC SOIC-8</option>
            <option value="connector_header">Pin Header</option>
            <option value="led_3mm">LED 3mm</option>
          </select>
        </div>

        <div className="toolbar-group">
          <button className="btn btn-secondary" onClick={handleRunDRC}>
            🔍 DRC Check
          </button>
          <button className="btn btn-secondary" onClick={handleAutoRoute}>
            🔄 Auto Route
          </button>
          <button className="btn btn-success" onClick={handleExportGerber}>
            📤 Export Gerber
          </button>
        </div>
      </div>

      {designRuleErrors.length > 0 && (
        <div className="drc-errors">
          <h4>Design Rule Violations:</h4>
          <ul>
            {designRuleErrors.map((error, index) => (
              <li key={index} style={{ color: '#ff6b6b' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pcb-properties">
        <h4>Board Properties</h4>
        <div className="property-grid">
          <div className="property-item">
            <label>Width:</label>
            <input type="number" defaultValue="100" step="0.1" />
            <span>mm</span>
          </div>
          <div className="property-item">
            <label>Height:</label>
            <input type="number" defaultValue="80" step="0.1" />
            <span>mm</span>
          </div>
          <div className="property-item">
            <label>Thickness:</label>
            <input type="number" defaultValue="1.6" step="0.1" />
            <span>mm</span>
          </div>
        </div>

        <h4>Design Rules</h4>
        <div className="property-grid">
          <div className="property-item">
            <label>Min Trace Width:</label>
            <input type="number" defaultValue="0.1" step="0.01" />
            <span>mm</span>
          </div>
          <div className="property-item">
            <label>Min Spacing:</label>
            <input type="number" defaultValue="0.1" step="0.01" />
            <span>mm</span>
          </div>
          <div className="property-item">
            <label>Via Size:</label>
            <input type="number" defaultValue="0.2" step="0.01" />
            <span>mm</span>
          </div>
        </div>
      </div>

      <div className="layer-panel">
        <h4>Layers</h4>
        <div className="layer-list">
          <div className="layer-item">
            <input type="checkbox" defaultChecked />
            <span className="layer-color" style={{ backgroundColor: '#ff0000' }}></span>
            <span>Top Copper</span>
          </div>
          <div className="layer-item">
            <input type="checkbox" defaultChecked />
            <span className="layer-color" style={{ backgroundColor: '#00ff00' }}></span>
            <span>Top Soldermask</span>
          </div>
          <div className="layer-item">
            <input type="checkbox" defaultChecked />
            <span className="layer-color" style={{ backgroundColor: '#ffff00' }}></span>
            <span>Top Silkscreen</span>
          </div>
          <div className="layer-item">
            <input type="checkbox" defaultChecked />
            <span className="layer-color" style={{ backgroundColor: '#0000ff' }}></span>
            <span>Bottom Copper</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PCBDesigner;

