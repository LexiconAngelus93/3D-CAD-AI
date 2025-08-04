import React from 'react';
import { useApp } from '../context/AppContext';

const Toolbar: React.FC = () => {
  const { appState, selectTool, setViewMode, toggleGrid, toggleSnap, createNewProject, saveProject } = useApp();

  const tools = [
    { id: 'select', name: 'Select', icon: '🔍' },
    { id: 'move', name: 'Move', icon: '✋' },
    { id: 'rotate', name: 'Rotate', icon: '🔄' },
    { id: 'scale', name: 'Scale', icon: '📏' },
    { id: 'extrude', name: 'Extrude', icon: '⬆️' },
    { id: 'cut', name: 'Cut', icon: '✂️' },
    { id: 'fillet', name: 'Fillet', icon: '🔘' },
    { id: 'chamfer', name: 'Chamfer', icon: '📐' },
  ];

  const primitives = [
    { id: 'box', name: 'Box', icon: '📦' },
    { id: 'sphere', name: 'Sphere', icon: '🔵' },
    { id: 'cylinder', name: 'Cylinder', icon: '🥫' },
    { id: 'cone', name: 'Cone', icon: '🔺' },
    { id: 'torus', name: 'Torus', icon: '🍩' },
  ];

  const viewModes = [
    { id: 'modeling', name: '3D CAD', icon: '🔧' },
    { id: 'schematic', name: 'Schematic', icon: '⚡' },
    { id: 'pcb', name: 'PCB', icon: '🔌' },
    { id: 'simulation', name: 'Simulation', icon: '📊' },
  ];

  return (
    <div className="toolbar">
      {/* File Operations */}
      <div className="toolbar-group">
        <button className="btn btn-primary" onClick={() => createNewProject('New Project')}>
          📄 New
        </button>
        <button className="btn btn-secondary">
          📁 Open
        </button>
        <button className="btn btn-secondary" onClick={saveProject}>
          💾 Save
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* View Mode Switcher */}
      <div className="toolbar-group">
        <label>Mode:</label>
        {viewModes.map(mode => (
          <button
            key={mode.id}
            className={`btn ${appState.viewMode === mode.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode(mode.id as any)}
            title={mode.name}
          >
            {mode.icon} {mode.name}
          </button>
        ))}
      </div>

      <div className="toolbar-separator" />

      {/* CAD Tools (only show in modeling mode) */}
      {appState.viewMode === 'modeling' && (
        <>
          <div className="toolbar-group">
            <label>Tools:</label>
            {tools.map(tool => (
              <button
                key={tool.id}
                className={`btn ${appState.selectedTool === tool.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => selectTool(tool.id)}
                title={tool.name}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <div className="toolbar-separator" />

          <div className="toolbar-group">
            <label>Primitives:</label>
            {primitives.map(primitive => (
              <button
                key={primitive.id}
                className="btn btn-secondary"
                onClick={() => selectTool(primitive.id)}
                title={primitive.name}
              >
                {primitive.icon}
              </button>
            ))}
          </div>

          <div className="toolbar-separator" />
        </>
      )}

      {/* View Options */}
      <div className="toolbar-group">
        <button
          className={`btn ${appState.showGrid ? 'btn-primary' : 'btn-secondary'}`}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          🔲 Grid
        </button>
        <button
          className={`btn ${appState.snapToGrid ? 'btn-primary' : 'btn-secondary'}`}
          onClick={toggleSnap}
          title="Snap to Grid"
        >
          🧲 Snap
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Export Options */}
      <div className="toolbar-group">
        <button className="btn btn-success">
          📤 Export STL
        </button>
        <button className="btn btn-success">
          📤 Export STEP
        </button>
        {appState.viewMode === 'pcb' && (
          <button className="btn btn-success">
            📤 Export Gerber
          </button>
        )}
      </div>

      {/* AI Assistant Toggle */}
      <div className="toolbar-group ml-auto">
        <button className="btn btn-ai">
          🤖 AI Assistant
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

