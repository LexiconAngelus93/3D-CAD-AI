import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const SchematicEditor: React.FC = () => {
  const { schematicEngine, appState } = useApp();
  const [currentSheet, setCurrentSheet] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [ercErrors, setErcErrors] = useState<string[]>([]);
  const [ercWarnings, setErcWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (appState.viewMode === 'schematic' && !currentSheet) {
      // Create default sheet
      const sheetId = schematicEngine.createSheet('Main Schematic', 'A4');
      setCurrentSheet(sheetId);
    }
  }, [appState.viewMode, schematicEngine, currentSheet]);

  const handleAddComponent = (type: string) => {
    if (!currentSheet) return;

    try {
      const componentId = schematicEngine.addComponent(type, { x: 0, y: 0 });
      setSelectedSymbol(componentId);
    } catch (error) {
      console.error('Failed to add component:', error);
    }
  };

  const handleRunERC = () => {
    const result = schematicEngine.runElectricalRuleCheck();
    setErcErrors(result.errors);
    setErcWarnings(result.warnings);
  };

  const handleExportNetlist = () => {
    try {
      const netlist = schematicEngine.exportNetlist();
      const blob = new Blob([netlist], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'netlist.net';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export netlist:', error);
    }
  };

  const handleAutoWire = () => {
    // This would implement auto-wiring logic
    console.log('Auto-wire not yet implemented');
  };

  if (appState.viewMode !== 'schematic') {
    return null;
  }

  return (
    <div className="schematic-editor">
      <div className="schematic-toolbar">
        <div className="toolbar-group">
          <h3>Schematic Capture</h3>
        </div>

        <div className="toolbar-group">
          <label>Components:</label>
          <select onChange={(e) => {
            if (e.target.value) handleAddComponent(e.target.value);
          }}>
            <option value="">Select Symbol</option>
            <option value="resistor">Resistor</option>
            <option value="capacitor">Capacitor</option>
            <option value="inductor">Inductor</option>
            <option value="diode">Diode</option>
            <option value="transistor">Transistor</option>
            <option value="ic">IC</option>
            <option value="connector">Connector</option>
            <option value="power">Power</option>
            <option value="ground">Ground</option>
          </select>
        </div>

        <div className="toolbar-group">
          <button className="btn btn-secondary" onClick={handleRunERC}>
            ⚡ ERC Check
          </button>
          <button className="btn btn-secondary" onClick={handleAutoWire}>
            🔗 Auto Wire
          </button>
          <button className="btn btn-success" onClick={handleExportNetlist}>
            📤 Export Netlist
          </button>
        </div>
      </div>

      {(ercErrors.length > 0 || ercWarnings.length > 0) && (
        <div className="erc-results">
          {ercErrors.length > 0 && (
            <div className="erc-errors">
              <h4>Electrical Rule Errors:</h4>
              <ul>
                {ercErrors.map((error, index) => (
                  <li key={index} style={{ color: '#ff6b6b' }}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {ercWarnings.length > 0 && (
            <div className="erc-warnings">
              <h4>Warnings:</h4>
              <ul>
                {ercWarnings.map((warning, index) => (
                  <li key={index} style={{ color: '#ffa500' }}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="schematic-properties">
        <h4>Sheet Properties</h4>
        <div className="property-grid">
          <div className="property-item">
            <label>Title:</label>
            <input type="text" defaultValue="Main Schematic" />
          </div>
          <div className="property-item">
            <label>Designer:</label>
            <input type="text" placeholder="Enter designer name" />
          </div>
          <div className="property-item">
            <label>Revision:</label>
            <input type="text" defaultValue="A" />
          </div>
          <div className="property-item">
            <label>Date:</label>
            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        <h4>Grid Settings</h4>
        <div className="property-grid">
          <div className="property-item">
            <label>Grid Size:</label>
            <select defaultValue="2.54">
              <option value="1.27">1.27mm (0.05")</option>
              <option value="2.54">2.54mm (0.1")</option>
              <option value="5.08">5.08mm (0.2")</option>
            </select>
          </div>
          <div className="property-item">
            <label>Snap to Grid:</label>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>

      <div className="symbol-library">
        <h4>Symbol Library</h4>
        <div className="symbol-categories">
          <div className="category">
            <h5>Passive Components</h5>
            <div className="symbol-list">
              <button onClick={() => handleAddComponent('resistor')}>Resistor</button>
              <button onClick={() => handleAddComponent('capacitor')}>Capacitor</button>
              <button onClick={() => handleAddComponent('inductor')}>Inductor</button>
            </div>
          </div>
          
          <div className="category">
            <h5>Active Components</h5>
            <div className="symbol-list">
              <button onClick={() => handleAddComponent('diode')}>Diode</button>
              <button onClick={() => handleAddComponent('transistor')}>Transistor</button>
              <button onClick={() => handleAddComponent('ic')}>IC</button>
            </div>
          </div>
          
          <div className="category">
            <h5>Power & Ground</h5>
            <div className="symbol-list">
              <button onClick={() => handleAddComponent('power')}>Power</button>
              <button onClick={() => handleAddComponent('ground')}>Ground</button>
            </div>
          </div>
          
          <div className="category">
            <h5>Connectors</h5>
            <div className="symbol-list">
              <button onClick={() => handleAddComponent('connector')}>Connector</button>
            </div>
          </div>
        </div>
      </div>

      <div className="net-list">
        <h4>Nets</h4>
        <div className="net-items">
          <div className="net-item">
            <span className="net-name">VCC</span>
            <span className="net-pins">5 pins</span>
          </div>
          <div className="net-item">
            <span className="net-name">GND</span>
            <span className="net-pins">8 pins</span>
          </div>
          <div className="net-item">
            <span className="net-name">CLK</span>
            <span className="net-pins">3 pins</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchematicEditor;

