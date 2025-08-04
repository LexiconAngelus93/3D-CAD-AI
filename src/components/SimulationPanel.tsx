import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const SimulationPanel: React.FC = () => {
  const { simulationEngine, cadEngine, appState } = useApp();
  const [currentMesh, setCurrentMesh] = useState<string | null>(null);
  const [simulationResults, setSimulationResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationType, setSimulationType] = useState<'structural' | 'thermal' | 'fluid' | 'modal'>('structural');

  const handleGenerateMesh = async () => {
    try {
      const selectedObjects = cadEngine.getSelectedObjects();
      if (selectedObjects.length === 0) {
        alert('Please select an object to simulate');
        return;
      }

      // Get geometry from selected object
      const geometry = selectedObjects[0].geometry;
      if (!geometry) {
        alert('Selected object has no geometry');
        return;
      }

      const meshId = simulationEngine.generateMesh(geometry, 1.0);
      setCurrentMesh(meshId);
      console.log('Mesh generated:', meshId);
    } catch (error) {
      console.error('Failed to generate mesh:', error);
      alert('Failed to generate mesh');
    }
  };

  const handleAddBoundaryCondition = (type: string) => {
    if (!currentMesh) {
      alert('Please generate mesh first');
      return;
    }

    try {
      switch (type) {
        case 'fixed':
          simulationEngine.addFixedSupport(currentMesh, ['node_0']); // Simplified
          break;
        case 'force':
          simulationEngine.addForce(currentMesh, ['node_1'], { x: 0, y: -1000, z: 0 });
          break;
        case 'pressure':
          simulationEngine.addPressure(currentMesh, ['node_2'], 100000);
          break;
        case 'temperature':
          simulationEngine.addTemperature(currentMesh, ['node_3'], 100);
          break;
      }
      console.log(`Added ${type} boundary condition`);
    } catch (error) {
      console.error('Failed to add boundary condition:', error);
    }
  };

  const handleRunSimulation = async () => {
    if (!currentMesh) {
      alert('Please generate mesh first');
      return;
    }

    setIsRunning(true);
    try {
      let resultId: string;
      
      switch (simulationType) {
        case 'structural':
          resultId = await simulationEngine.runStructuralAnalysis(currentMesh);
          break;
        case 'thermal':
          resultId = await simulationEngine.runThermalAnalysis(currentMesh);
          break;
        case 'fluid':
          resultId = await simulationEngine.runFluidAnalysis(currentMesh);
          break;
        case 'modal':
          resultId = await simulationEngine.runModalAnalysis(currentMesh, 10);
          break;
        default:
          throw new Error('Unknown simulation type');
      }

      setSimulationResults(prev => [...prev, resultId]);
      console.log('Simulation completed:', resultId);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('Simulation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewResults = (resultId: string) => {
    const result = simulationEngine.getResult(resultId);
    if (result) {
      console.log('Simulation result:', result);
      // Display results in a modal or panel
      alert(`Max stress: ${result.globalResults.maxStress?.toFixed(2) || 'N/A'} Pa\nMax displacement: ${result.globalResults.maxDisplacement?.toFixed(6) || 'N/A'} m`);
    }
  };

  if (appState.viewMode !== 'simulation') {
    return null;
  }

  return (
    <div className="simulation-panel">
      <div className="simulation-toolbar">
        <div className="toolbar-group">
          <h3>Simulation</h3>
        </div>

        <div className="toolbar-group">
          <label>Type:</label>
          <select 
            value={simulationType} 
            onChange={(e) => setSimulationType(e.target.value as any)}
          >
            <option value="structural">Structural</option>
            <option value="thermal">Thermal</option>
            <option value="fluid">Fluid</option>
            <option value="modal">Modal</option>
          </select>
        </div>

        <div className="toolbar-group">
          <button className="btn btn-secondary" onClick={handleGenerateMesh}>
            🔗 Generate Mesh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleRunSimulation}
            disabled={!currentMesh || isRunning}
          >
            {isRunning ? '⏳ Running...' : '▶️ Run Simulation'}
          </button>
        </div>
      </div>

      <div className="simulation-setup">
        <h4>Mesh Properties</h4>
        <div className="property-grid">
          <div className="property-item">
            <label>Element Size:</label>
            <input type="number" defaultValue="1.0" step="0.1" />
            <span>mm</span>
          </div>
          <div className="property-item">
            <label>Mesh Quality:</label>
            <select defaultValue="medium">
              <option value="coarse">Coarse</option>
              <option value="medium">Medium</option>
              <option value="fine">Fine</option>
              <option value="very-fine">Very Fine</option>
            </select>
          </div>
        </div>

        <h4>Boundary Conditions</h4>
        <div className="boundary-conditions">
          <button 
            className="btn btn-outline" 
            onClick={() => handleAddBoundaryCondition('fixed')}
          >
            🔒 Fixed Support
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleAddBoundaryCondition('force')}
          >
            ➡️ Force
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleAddBoundaryCondition('pressure')}
          >
            💨 Pressure
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleAddBoundaryCondition('temperature')}
          >
            🌡️ Temperature
          </button>
        </div>

        {simulationType === 'structural' && (
          <div className="structural-settings">
            <h4>Structural Settings</h4>
            <div className="property-grid">
              <div className="property-item">
                <label>Material:</label>
                <select defaultValue="steel">
                  <option value="steel">Steel</option>
                  <option value="aluminum">Aluminum</option>
                  <option value="plastic">Plastic</option>
                  <option value="concrete">Concrete</option>
                </select>
              </div>
              <div className="property-item">
                <label>Young's Modulus:</label>
                <input type="number" defaultValue="200000" />
                <span>MPa</span>
              </div>
              <div className="property-item">
                <label>Poisson's Ratio:</label>
                <input type="number" defaultValue="0.3" step="0.01" />
              </div>
            </div>
          </div>
        )}

        {simulationType === 'thermal' && (
          <div className="thermal-settings">
            <h4>Thermal Settings</h4>
            <div className="property-grid">
              <div className="property-item">
                <label>Thermal Conductivity:</label>
                <input type="number" defaultValue="50" />
                <span>W/m·K</span>
              </div>
              <div className="property-item">
                <label>Specific Heat:</label>
                <input type="number" defaultValue="460" />
                <span>J/kg·K</span>
              </div>
              <div className="property-item">
                <label>Time Step:</label>
                <input type="number" defaultValue="0.1" step="0.01" />
                <span>s</span>
              </div>
            </div>
          </div>
        )}

        {simulationType === 'fluid' && (
          <div className="fluid-settings">
            <h4>Fluid Settings</h4>
            <div className="property-grid">
              <div className="property-item">
                <label>Fluid Type:</label>
                <select defaultValue="water">
                  <option value="water">Water</option>
                  <option value="air">Air</option>
                  <option value="oil">Oil</option>
                </select>
              </div>
              <div className="property-item">
                <label>Viscosity:</label>
                <input type="number" defaultValue="0.001" step="0.0001" />
                <span>Pa·s</span>
              </div>
              <div className="property-item">
                <label>Inlet Velocity:</label>
                <input type="number" defaultValue="1.0" step="0.1" />
                <span>m/s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="simulation-results">
        <h4>Results</h4>
        {simulationResults.length === 0 ? (
          <p>No simulation results yet. Run a simulation to see results.</p>
        ) : (
          <div className="results-list">
            {simulationResults.map((resultId, index) => (
              <div key={resultId} className="result-item">
                <span>Result {index + 1} ({simulationType})</span>
                <button 
                  className="btn btn-small" 
                  onClick={() => handleViewResults(resultId)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="solver-settings">
        <h4>Solver Settings</h4>
        <div className="property-grid">
          <div className="property-item">
            <label>Solver Type:</label>
            <select defaultValue="direct">
              <option value="direct">Direct</option>
              <option value="iterative">Iterative</option>
            </select>
          </div>
          <div className="property-item">
            <label>Convergence:</label>
            <input type="number" defaultValue="1e-6" step="1e-7" />
          </div>
          <div className="property-item">
            <label>Max Iterations:</label>
            <input type="number" defaultValue="1000" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;

