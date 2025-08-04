import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CADObject } from '../engine/CADEngine';

const PropertiesPanel: React.FC = () => {
  const { cadEngine, appState } = useApp();
  const [selectedObject, setSelectedObject] = useState<CADObject | null>(null);

  useEffect(() => {
    if (appState.selectedObjects.length === 1) {
      const object = cadEngine.getObject(appState.selectedObjects[0]);
      setSelectedObject(object || null);
    } else {
      setSelectedObject(null);
    }
  }, [appState.selectedObjects, cadEngine]);

  const handlePropertyChange = (property: string, value: any) => {
    if (!selectedObject) return;

    // Update object properties
    selectedObject.properties[property] = value;

    // Regenerate geometry if needed
    if (['width', 'height', 'depth', 'radius', 'radiusTop', 'radiusBottom'].includes(property)) {
      regenerateGeometry(selectedObject);
    }

    // Update material properties
    if (property === 'color' && selectedObject.material) {
      (selectedObject.material as any).color.setHex(parseInt(value.replace('#', ''), 16));
    }

    // Force re-render
    cadEngine.render();
  };

  const regenerateGeometry = (object: CADObject) => {
    const props = object.properties;
    let newGeometry;

    switch (props.operation) {
      case 'box':
        newGeometry = cadEngine.geometryEngine?.createBox(
          props.width || 1,
          props.height || 1,
          props.depth || 1
        );
        break;
      case 'sphere':
        newGeometry = cadEngine.geometryEngine?.createSphere(props.radius || 1);
        break;
      case 'cylinder':
        newGeometry = cadEngine.geometryEngine?.createCylinder(
          props.radiusTop || 1,
          props.radiusBottom || 1,
          props.height || 1
        );
        break;
    }

    if (newGeometry) {
      object.geometry.dispose();
      object.geometry = newGeometry;
      object.mesh.geometry = newGeometry;
    }
  };

  const renderBasicProperties = () => {
    if (!selectedObject) return null;

    return (
      <div className="property-group">
        <div className="panel-header">Basic Properties</div>
        
        <div className="mb-2">
          <label className="property-label">Name</label>
          <input
            className="property-value input"
            type="text"
            value={selectedObject.name}
            onChange={(e) => {
              selectedObject.name = e.target.value;
              setSelectedObject({ ...selectedObject });
            }}
          />
        </div>

        <div className="mb-2">
          <label className="property-label">Type</label>
          <input
            className="property-value input"
            type="text"
            value={selectedObject.type}
            readOnly
            style={{ backgroundColor: '#1a1a1a', color: '#888' }}
          />
        </div>

        <div className="mb-2">
          <label className="property-label">Visible</label>
          <input
            type="checkbox"
            checked={selectedObject.visible}
            onChange={(e) => {
              selectedObject.visible = e.target.checked;
              selectedObject.mesh.visible = e.target.checked;
              setSelectedObject({ ...selectedObject });
            }}
          />
        </div>

        <div className="mb-2">
          <label className="property-label">Locked</label>
          <input
            type="checkbox"
            checked={selectedObject.locked}
            onChange={(e) => {
              selectedObject.locked = e.target.checked;
              setSelectedObject({ ...selectedObject });
            }}
          />
        </div>
      </div>
    );
  };

  const renderGeometryProperties = () => {
    if (!selectedObject || !selectedObject.properties.operation) return null;

    const props = selectedObject.properties;

    return (
      <div className="property-group">
        <div className="panel-header">Geometry</div>

        {props.operation === 'box' && (
          <>
            <div className="mb-2">
              <label className="property-label">Width</label>
              <input
                className="property-value input"
                type="number"
                step="0.1"
                value={props.width || 1}
                onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
              />
            </div>
            <div className="mb-2">
              <label className="property-label">Height</label>
              <input
                className="property-value input"
                type="number"
                step="0.1"
                value={props.height || 1}
                onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
              />
            </div>
            <div className="mb-2">
              <label className="property-label">Depth</label>
              <input
                className="property-value input"
                type="number"
                step="0.1"
                value={props.depth || 1}
                onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}

        {props.operation === 'sphere' && (
          <div className="mb-2">
            <label className="property-label">Radius</label>
            <input
              className="property-value input"
              type="number"
              step="0.1"
              value={props.radius || 1}
              onChange={(e) => handlePropertyChange('radius', parseFloat(e.target.value))}
            />
          </div>
        )}

        {props.operation === 'cylinder' && (
          <>
            <div className="mb-2">
              <label className="property-label">Top Radius</label>
              <input
                className="property-value input"
                type="number"
                step="0.1"
                value={props.radiusTop || 1}
                onChange={(e) => handlePropertyChange('radiusTop', parseFloat(e.target.value))}
              />
            </div>
            <div className="mb-2">
              <label className="property-label">Bottom Radius</label>
              <input
                className="property-value input"
                type="number"
                step="0.1"
                value={props.radiusBottom || 1}
                onChange={(e) => handlePropertyChange('radiusBottom', parseFloat(e.target.value))}
              />
            </div>
            <div className="mb-2">
              <label className="property-label">Height</label>
              <input
                className="property-value input"
                type="number"
                step="0.1"
                value={props.height || 1}
                onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMaterialProperties = () => {
    if (!selectedObject) return null;

    const material = selectedObject.material as any;
    const currentColor = material.color ? `#${material.color.getHexString()}` : '#00ff00';

    return (
      <div className="property-group">
        <div className="panel-header">Material</div>

        <div className="mb-2">
          <label className="property-label">Color</label>
          <input
            className="property-value"
            type="color"
            value={currentColor}
            onChange={(e) => handlePropertyChange('color', e.target.value)}
          />
        </div>

        <div className="mb-2">
          <label className="property-label">Opacity</label>
          <input
            className="property-value input"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={material.opacity || 1}
            onChange={(e) => {
              material.opacity = parseFloat(e.target.value);
              material.transparent = material.opacity < 1;
              cadEngine.render();
            }}
          />
          <span style={{ marginLeft: '8px', fontSize: '12px' }}>
            {Math.round((material.opacity || 1) * 100)}%
          </span>
        </div>

        <div className="mb-2">
          <label className="property-label">Wireframe</label>
          <input
            type="checkbox"
            checked={material.wireframe || false}
            onChange={(e) => {
              material.wireframe = e.target.checked;
              cadEngine.render();
            }}
          />
        </div>
      </div>
    );
  };

  const renderTransformProperties = () => {
    if (!selectedObject) return null;

    const position = selectedObject.mesh.position;
    const rotation = selectedObject.mesh.rotation;
    const scale = selectedObject.mesh.scale;

    return (
      <div className="property-group">
        <div className="panel-header">Transform</div>

        {/* Position */}
        <div className="mb-2">
          <label className="property-label">Position</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="X"
              value={position.x.toFixed(2)}
              onChange={(e) => {
                position.x = parseFloat(e.target.value) || 0;
                cadEngine.render();
              }}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Y"
              value={position.y.toFixed(2)}
              onChange={(e) => {
                position.y = parseFloat(e.target.value) || 0;
                cadEngine.render();
              }}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Z"
              value={position.z.toFixed(2)}
              onChange={(e) => {
                position.z = parseFloat(e.target.value) || 0;
                cadEngine.render();
              }}
            />
          </div>
        </div>

        {/* Rotation */}
        <div className="mb-2">
          <label className="property-label">Rotation (degrees)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            <input
              className="input"
              type="number"
              step="1"
              placeholder="X"
              value={Math.round((rotation.x * 180) / Math.PI)}
              onChange={(e) => {
                rotation.x = ((parseFloat(e.target.value) || 0) * Math.PI) / 180;
                cadEngine.render();
              }}
            />
            <input
              className="input"
              type="number"
              step="1"
              placeholder="Y"
              value={Math.round((rotation.y * 180) / Math.PI)}
              onChange={(e) => {
                rotation.y = ((parseFloat(e.target.value) || 0) * Math.PI) / 180;
                cadEngine.render();
              }}
            />
            <input
              className="input"
              type="number"
              step="1"
              placeholder="Z"
              value={Math.round((rotation.z * 180) / Math.PI)}
              onChange={(e) => {
                rotation.z = ((parseFloat(e.target.value) || 0) * Math.PI) / 180;
                cadEngine.render();
              }}
            />
          </div>
        </div>

        {/* Scale */}
        <div className="mb-2">
          <label className="property-label">Scale</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="X"
              value={scale.x.toFixed(2)}
              onChange={(e) => {
                scale.x = parseFloat(e.target.value) || 1;
                cadEngine.render();
              }}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Y"
              value={scale.y.toFixed(2)}
              onChange={(e) => {
                scale.y = parseFloat(e.target.value) || 1;
                cadEngine.render();
              }}
            />
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="Z"
              value={scale.z.toFixed(2)}
              onChange={(e) => {
                scale.z = parseFloat(e.target.value) || 1;
                cadEngine.render();
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px' }}>
      {selectedObject ? (
        <>
          {renderBasicProperties()}
          {renderGeometryProperties()}
          {renderMaterialProperties()}
          {renderTransformProperties()}
        </>
      ) : (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: '#888',
          fontSize: '14px'
        }}>
          {appState.selectedObjects.length === 0 ? (
            'No object selected'
          ) : (
            `${appState.selectedObjects.length} objects selected`
          )}
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;

