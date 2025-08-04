import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CADObject } from '../engine/CADEngine';

const ObjectTree: React.FC = () => {
  const { cadEngine, appState, selectObjects } = useApp();
  const [objects, setObjects] = useState<CADObject[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Update objects list when scene changes
    const updateObjects = () => {
      setObjects(cadEngine.getAllObjects());
    };

    updateObjects();
    
    // Set up interval to refresh (in a real app, this would be event-driven)
    const interval = setInterval(updateObjects, 1000);
    return () => clearInterval(interval);
  }, [cadEngine]);

  const handleObjectClick = (objectId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      const currentSelection = appState.selectedObjects;
      if (currentSelection.includes(objectId)) {
        selectObjects(currentSelection.filter(id => id !== objectId));
      } else {
        selectObjects([...currentSelection, objectId]);
      }
    } else {
      // Single select
      selectObjects([objectId]);
    }
  };

  const handleObjectDoubleClick = (objectId: string) => {
    // Focus on object (fit to view)
    const object = cadEngine.getObject(objectId);
    if (object) {
      // This would focus the camera on the object
      console.log('Focus on object:', objectId);
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleVisibilityToggle = (objectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const object = cadEngine.getObject(objectId);
    if (object) {
      object.visible = !object.visible;
      object.mesh.visible = object.visible;
      setObjects([...cadEngine.getAllObjects()]);
    }
  };

  const handleLockToggle = (objectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const object = cadEngine.getObject(objectId);
    if (object) {
      object.locked = !object.locked;
      setObjects([...cadEngine.getAllObjects()]);
    }
  };

  const handleDeleteObject = (objectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Delete this object?')) {
      cadEngine.removeObject(objectId);
      setObjects(cadEngine.getAllObjects());
    }
  };

  const getObjectIcon = (type: string): string => {
    switch (type) {
      case 'sketch': return '✏️';
      case 'solid': return '📦';
      case 'surface': return '📄';
      case 'assembly': return '🔧';
      default: return '📦';
    }
  };

  const renderObjectNode = (object: CADObject, level: number = 0) => {
    const isSelected = appState.selectedObjects.includes(object.id);
    const hasChildren = object.children.length > 0;
    const isExpanded = expandedNodes.has(object.id);

    return (
      <div key={object.id}>
        <div
          className={`tree-item ${isSelected ? 'selected' : ''}`}
          style={{ 
            paddingLeft: `${level * 20 + 8}px`,
            opacity: object.locked ? 0.6 : 1
          }}
          onClick={(e) => handleObjectClick(object.id, e)}
          onDoubleClick={() => handleObjectDoubleClick(object.id)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              className="tree-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(object.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '2px',
                marginRight: '4px'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}

          {/* Object Icon */}
          <span className="tree-item-icon">
            {getObjectIcon(object.type)}
          </span>

          {/* Object Name */}
          <span className="tree-item-label">
            {object.name}
          </span>

          {/* Action Buttons */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            <button
              onClick={(e) => handleVisibilityToggle(object.id, e)}
              style={{
                background: 'none',
                border: 'none',
                color: object.visible ? '#fff' : '#666',
                cursor: 'pointer',
                padding: '2px'
              }}
              title={object.visible ? 'Hide' : 'Show'}
            >
              👁️
            </button>
            <button
              onClick={(e) => handleLockToggle(object.id, e)}
              style={{
                background: 'none',
                border: 'none',
                color: object.locked ? '#ff6b6b' : '#666',
                cursor: 'pointer',
                padding: '2px'
              }}
              title={object.locked ? 'Unlock' : 'Lock'}
            >
              🔒
            </button>
            <button
              onClick={(e) => handleDeleteObject(object.id, e)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b6b',
                cursor: 'pointer',
                padding: '2px'
              }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {object.children.map(childId => {
              const childObject = cadEngine.getObject(childId);
              return childObject ? renderObjectNode(childObject, level + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  // Group objects by type
  const groupedObjects = objects.reduce((groups, object) => {
    if (!groups[object.type]) {
      groups[object.type] = [];
    }
    groups[object.type].push(object);
    return groups;
  }, {} as Record<string, CADObject[]>);

  return (
    <div className="tree-view" style={{ height: '100%', overflow: 'auto' }}>
      <div className="panel-header">Scene Objects</div>
      
      {objects.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#888',
          fontSize: '14px'
        }}>
          No objects in scene.<br/>
          Use the toolbar to create objects.
        </div>
      ) : (
        <div>
          {Object.entries(groupedObjects).map(([type, typeObjects]) => (
            <div key={type}>
              {/* Type Header */}
              <div
                className="tree-item"
                style={{ 
                  fontWeight: 'bold',
                  backgroundColor: '#333',
                  cursor: 'pointer'
                }}
                onClick={() => toggleNodeExpansion(type)}
              >
                <span style={{ marginRight: '8px' }}>
                  {expandedNodes.has(type) ? '▼' : '▶'}
                </span>
                <span className="tree-item-icon">
                  {getObjectIcon(type)}
                </span>
                <span className="tree-item-label">
                  {type.charAt(0).toUpperCase() + type.slice(1)}s ({typeObjects.length})
                </span>
              </div>

              {/* Type Objects */}
              {expandedNodes.has(type) && (
                <div>
                  {typeObjects
                    .filter(obj => !obj.parent) // Only show root objects
                    .map(object => renderObjectNode(object, 1))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Context Menu would go here */}
    </div>
  );
};

export default ObjectTree;

