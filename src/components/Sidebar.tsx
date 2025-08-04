import React from 'react';
import { useApp } from '../context/AppContext';
import ObjectTree from './ObjectTree';
import PropertiesPanel from './PropertiesPanel';
import PCBDesigner from './PCBDesigner';
import SchematicEditor from './SchematicEditor';
import SimulationPanel from './SimulationPanel';

const Sidebar: React.FC = () => {
  const { appState } = useApp();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>
          {appState.viewMode === 'modeling' && 'CAD Tools'}
          {appState.viewMode === 'pcb' && 'PCB Design'}
          {appState.viewMode === 'schematic' && 'Schematic'}
          {appState.viewMode === 'simulation' && 'Simulation'}
        </h3>
      </div>

      <div className="sidebar-content">
        {appState.viewMode === 'modeling' && (
          <>
            <ObjectTree />
            <PropertiesPanel />
          </>
        )}
        
        {appState.viewMode === 'pcb' && <PCBDesigner />}
        {appState.viewMode === 'schematic' && <SchematicEditor />}
        {appState.viewMode === 'simulation' && <SimulationPanel />}
      </div>
    </div>
  );
};

export default Sidebar;

