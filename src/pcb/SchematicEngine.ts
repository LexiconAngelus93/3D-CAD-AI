import * as THREE from 'three';

export interface SchematicComponent {
  id: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'ic' | 'connector' | 'led' | 'switch' | 'diode' | 'transistor' | 'crystal' | 'power' | 'ground';
  name: string;
  value?: string;
  position: { x: number; y: number };
  rotation: number;
  pins: SchematicPin[];
  properties: Record<string, any>;
  symbol?: THREE.Object3D;
}

export interface SchematicPin {
  id: string;
  number: string;
  name: string;
  position: { x: number; y: number };
  type: 'input' | 'output' | 'power' | 'ground' | 'signal' | 'bidirectional';
  netId?: string;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface SchematicNet {
  id: string;
  name: string;
  pins: string[];
  wires: SchematicWire[];
  properties: {
    voltage?: number;
    current?: number;
    power?: number;
  };
}

export interface SchematicWire {
  id: string;
  netId: string;
  points: { x: number; y: number }[];
  junctions: SchematicJunction[];
}

export interface SchematicJunction {
  id: string;
  position: { x: number; y: number };
  netIds: string[];
}

export interface SchematicSheet {
  id: string;
  name: string;
  size: 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
  components: SchematicComponent[];
  nets: SchematicNet[];
  junctions: SchematicJunction[];
  titleBlock: {
    title: string;
    designer: string;
    date: string;
    revision: string;
    description: string;
  };
}

export interface ComponentSymbol {
  type: string;
  name: string;
  pins: {
    id: string;
    name: string;
    position: { x: number; y: number };
    direction: 'up' | 'down' | 'left' | 'right';
    type: 'input' | 'output' | 'power' | 'ground' | 'signal' | 'bidirectional';
  }[];
  graphics: {
    type: 'line' | 'rectangle' | 'circle' | 'arc' | 'text';
    points?: { x: number; y: number }[];
    center?: { x: number; y: number };
    radius?: number;
    text?: string;
    style?: {
      lineWidth?: number;
      color?: string;
      fill?: boolean;
    };
  }[];
}

export class SchematicEngine {
  private sheets: Map<string, SchematicSheet> = new Map();
  private currentSheet: SchematicSheet | null = null;
  private scene: THREE.Scene;
  private symbolLibrary: Map<string, ComponentSymbol> = new Map();
  private gridSize: number = 2.54; // Standard 0.1" grid
  private snapToGrid: boolean = true;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize symbol library
      this.initializeSymbolLibrary();
      
      this.isInitialized = true;
      console.log('Schematic Engine initialized');
    } catch (error) {
      console.error('Failed to initialize Schematic Engine:', error);
      throw error;
    }
  }

  // Sheet Management
  createSheet(name: string, size: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' = 'A4'): string {
    const sheetId = `sheet_${Date.now()}`;
    
    const sheet: SchematicSheet = {
      id: sheetId,
      name,
      size,
      components: [],
      nets: [],
      junctions: [],
      titleBlock: {
        title: name,
        designer: '',
        date: new Date().toISOString().split('T')[0],
        revision: 'A',
        description: ''
      }
    };

    this.sheets.set(sheetId, sheet);
    this.currentSheet = sheet;

    // Create 2D representation (would be rendered on canvas in real implementation)
    this.create2DSheet(sheet);

    return sheetId;
  }

  setCurrentSheet(sheetId: string): boolean {
    const sheet = this.sheets.get(sheetId);
    if (sheet) {
      this.currentSheet = sheet;
      return true;
    }
    return false;
  }

  getCurrentSheet(): SchematicSheet | null {
    return this.currentSheet;
  }

  // Component Management
  addComponent(type: string, position: { x: number; y: number }, properties?: Record<string, any>): string {
    if (!this.currentSheet) {
      throw new Error('No active sheet');
    }

    const componentId = `comp_${Date.now()}`;
    const symbol = this.symbolLibrary.get(type);
    
    if (!symbol) {
      throw new Error(`Symbol ${type} not found in library`);
    }

    // Snap to grid if enabled
    const snappedPosition = this.snapToGrid ? {
      x: Math.round(position.x / this.gridSize) * this.gridSize,
      y: Math.round(position.y / this.gridSize) * this.gridSize
    } : position;

    const component: SchematicComponent = {
      id: componentId,
      type: type as any,
      name: `${type.toUpperCase()}${this.currentSheet.components.length + 1}`,
      value: properties?.value,
      position: snappedPosition,
      rotation: 0,
      pins: symbol.pins.map(pin => ({
        id: `${componentId}_${pin.id}`,
        number: pin.id,
        name: pin.name,
        position: {
          x: snappedPosition.x + pin.position.x,
          y: snappedPosition.y + pin.position.y
        },
        type: pin.type,
        direction: pin.direction
      })),
      properties: properties || {},
      symbol: this.create2DSymbol(symbol, snappedPosition)
    };

    this.currentSheet.components.push(component);

    return componentId;
  }

  removeComponent(componentId: string): boolean {
    if (!this.currentSheet) return false;

    const componentIndex = this.currentSheet.components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) return false;

    const component = this.currentSheet.components[componentIndex];
    
    // Remove from 2D scene
    if (component.symbol) {
      this.scene.remove(component.symbol);
    }

    // Remove component
    this.currentSheet.components.splice(componentIndex, 1);

    // Remove associated nets and wires
    this.removeComponentNets(componentId);

    return true;
  }

  moveComponent(componentId: string, newPosition: { x: number; y: number }): boolean {
    if (!this.currentSheet) return false;

    const component = this.currentSheet.components.find(c => c.id === componentId);
    if (!component) return false;

    // Snap to grid if enabled
    const snappedPosition = this.snapToGrid ? {
      x: Math.round(newPosition.x / this.gridSize) * this.gridSize,
      y: Math.round(newPosition.y / this.gridSize) * this.gridSize
    } : newPosition;

    const deltaX = snappedPosition.x - component.position.x;
    const deltaY = snappedPosition.y - component.position.y;

    // Update component position
    component.position = snappedPosition;

    // Update pin positions
    component.pins.forEach(pin => {
      pin.position.x += deltaX;
      pin.position.y += deltaY;
    });

    // Update 2D representation
    if (component.symbol) {
      component.symbol.position.set(snappedPosition.x, snappedPosition.y, 0);
    }

    // Update connected wires
    this.updateComponentWires(componentId);

    return true;
  }

  rotateComponent(componentId: string, angle: number = 90): boolean {
    if (!this.currentSheet) return false;

    const component = this.currentSheet.components.find(c => c.id === componentId);
    if (!component) return false;

    component.rotation = (component.rotation + angle) % 360;

    // Update 2D representation
    if (component.symbol) {
      component.symbol.rotation.z = (component.rotation * Math.PI) / 180;
    }

    // Rotate pins around component center
    const centerX = component.position.x;
    const centerY = component.position.y;
    const radians = (angle * Math.PI) / 180;

    component.pins.forEach(pin => {
      const relativeX = pin.position.x - centerX;
      const relativeY = pin.position.y - centerY;
      
      pin.position.x = centerX + relativeX * Math.cos(radians) - relativeY * Math.sin(radians);
      pin.position.y = centerY + relativeX * Math.sin(radians) + relativeY * Math.cos(radians);

      // Update pin direction
      const directionMap: Record<string, string> = {
        'up': angle === 90 ? 'right' : angle === 180 ? 'down' : angle === 270 ? 'left' : 'up',
        'right': angle === 90 ? 'down' : angle === 180 ? 'left' : angle === 270 ? 'up' : 'right',
        'down': angle === 90 ? 'left' : angle === 180 ? 'up' : angle === 270 ? 'right' : 'down',
        'left': angle === 90 ? 'up' : angle === 180 ? 'right' : angle === 270 ? 'down' : 'left'
      };
      pin.direction = directionMap[pin.direction] as any;
    });

    // Update connected wires
    this.updateComponentWires(componentId);

    return true;
  }

  // Net and Wire Management
  createNet(name: string, pinIds: string[]): string {
    if (!this.currentSheet) {
      throw new Error('No active sheet');
    }

    const netId = `net_${Date.now()}`;
    const net: SchematicNet = {
      id: netId,
      name,
      pins: pinIds,
      wires: [],
      properties: {}
    };

    this.currentSheet.nets.push(net);

    // Update pin net associations
    pinIds.forEach(pinId => {
      const pin = this.findPin(pinId);
      if (pin) {
        pin.netId = netId;
      }
    });

    return netId;
  }

  addWire(netId: string, points: { x: number; y: number }[]): string {
    if (!this.currentSheet) {
      throw new Error('No active sheet');
    }

    const net = this.currentSheet.nets.find(n => n.id === netId);
    if (!net) {
      throw new Error(`Net ${netId} not found`);
    }

    // Snap points to grid if enabled
    const snappedPoints = this.snapToGrid ? points.map(point => ({
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize
    })) : points;

    const wireId = `wire_${Date.now()}`;
    const wire: SchematicWire = {
      id: wireId,
      netId,
      points: snappedPoints,
      junctions: []
    };

    net.wires.push(wire);

    // Create 2D representation
    this.create2DWire(wire);

    return wireId;
  }

  addJunction(position: { x: number; y: number }, netIds: string[]): string {
    if (!this.currentSheet) {
      throw new Error('No active sheet');
    }

    // Snap to grid if enabled
    const snappedPosition = this.snapToGrid ? {
      x: Math.round(position.x / this.gridSize) * this.gridSize,
      y: Math.round(position.y / this.gridSize) * this.gridSize
    } : position;

    const junctionId = `junction_${Date.now()}`;
    const junction: SchematicJunction = {
      id: junctionId,
      position: snappedPosition,
      netIds
    };

    this.currentSheet.junctions.push(junction);

    // Create 2D representation
    this.create2DJunction(junction);

    return junctionId;
  }

  // Auto-wiring
  autoWire(pinId1: string, pinId2: string): string | null {
    if (!this.currentSheet) return null;

    const pin1 = this.findPin(pinId1);
    const pin2 = this.findPin(pinId2);

    if (!pin1 || !pin2) return null;

    // Create or find net
    let netId = pin1.netId || pin2.netId;
    if (!netId) {
      netId = this.createNet(`Net_${Date.now()}`, [pinId1, pinId2]);
    } else {
      // Add pin to existing net
      const net = this.currentSheet.nets.find(n => n.id === netId);
      if (net && !net.pins.includes(pinId1)) {
        net.pins.push(pinId1);
        pin1.netId = netId;
      }
      if (net && !net.pins.includes(pinId2)) {
        net.pins.push(pinId2);
        pin2.netId = netId;
      }
    }

    // Create wire path
    const path = this.calculateWirePath(pin1.position, pin2.position);
    return this.addWire(netId, path);
  }

  private calculateWirePath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    // Simple L-shaped routing
    const midX = start.x;
    const midY = end.y;

    if (Math.abs(start.x - end.x) > Math.abs(start.y - end.y)) {
      // Horizontal first
      return [
        start,
        { x: end.x, y: start.y },
        end
      ];
    } else {
      // Vertical first
      return [
        start,
        { x: start.x, y: end.y },
        end
      ];
    }
  }

  // Electrical Rule Checking
  runElectricalRuleCheck(): { errors: string[]; warnings: string[] } {
    if (!this.currentSheet) {
      return { errors: ['No active sheet'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unconnected pins
    this.checkUnconnectedPins(warnings);

    // Check for power connections
    this.checkPowerConnections(errors, warnings);

    // Check for floating nets
    this.checkFloatingNets(warnings);

    return { errors, warnings };
  }

  private checkUnconnectedPins(warnings: string[]): void {
    if (!this.currentSheet) return;

    this.currentSheet.components.forEach(component => {
      component.pins.forEach(pin => {
        if (!pin.netId && pin.type !== 'power' && pin.type !== 'ground') {
          warnings.push(`Pin ${pin.name} of ${component.name} is not connected`);
        }
      });
    });
  }

  private checkPowerConnections(errors: string[], warnings: string[]): void {
    if (!this.currentSheet) return;

    const powerNets = this.currentSheet.nets.filter(net => 
      net.pins.some(pinId => {
        const pin = this.findPin(pinId);
        return pin && (pin.type === 'power' || pin.type === 'ground');
      })
    );

    powerNets.forEach(net => {
      const powerPins = net.pins.filter(pinId => {
        const pin = this.findPin(pinId);
        return pin && pin.type === 'power';
      });

      const groundPins = net.pins.filter(pinId => {
        const pin = this.findPin(pinId);
        return pin && pin.type === 'ground';
      });

      if (powerPins.length > 0 && groundPins.length > 0) {
        errors.push(`Net ${net.name} connects power and ground pins`);
      }
    });
  }

  private checkFloatingNets(warnings: string[]): void {
    if (!this.currentSheet) return;

    this.currentSheet.nets.forEach(net => {
      if (net.pins.length < 2) {
        warnings.push(`Net ${net.name} has only one connection`);
      }
    });
  }

  // 2D Visualization (simplified - would use canvas in real implementation)
  private create2DSheet(sheet: SchematicSheet): void {
    // Create sheet background
    const sheetDimensions = this.getSheetDimensions(sheet.size);
    const geometry = new THREE.PlaneGeometry(sheetDimensions.width, sheetDimensions.height);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    
    const sheetMesh = new THREE.Mesh(geometry, material);
    sheetMesh.name = `sheet_${sheet.id}`;
    sheetMesh.userData = { type: 'schematic_sheet', sheetId: sheet.id };
    
    this.scene.add(sheetMesh);
  }

  private create2DSymbol(symbol: ComponentSymbol, position: { x: number; y: number }): THREE.Object3D {
    const group = new THREE.Object3D();

    // Create symbol graphics
    symbol.graphics.forEach(graphic => {
      switch (graphic.type) {
        case 'rectangle':
          if (graphic.points && graphic.points.length >= 2) {
            const width = Math.abs(graphic.points[1].x - graphic.points[0].x);
            const height = Math.abs(graphic.points[1].y - graphic.points[0].y);
            const geometry = new THREE.PlaneGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({ 
              color: 0x000000, 
              transparent: true, 
              opacity: 0.1,
              side: THREE.DoubleSide 
            });
            const mesh = new THREE.Mesh(geometry, material);
            group.add(mesh);
          }
          break;
        case 'circle':
          if (graphic.center && graphic.radius) {
            const geometry = new THREE.CircleGeometry(graphic.radius, 32);
            const material = new THREE.MeshBasicMaterial({ 
              color: 0x000000, 
              transparent: true, 
              opacity: 0.1,
              side: THREE.DoubleSide 
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(graphic.center.x, graphic.center.y, 0);
            group.add(mesh);
          }
          break;
        case 'line':
          if (graphic.points && graphic.points.length >= 2) {
            const points = graphic.points.map(p => new THREE.Vector3(p.x, p.y, 0));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x000000 });
            const line = new THREE.Line(geometry, material);
            group.add(line);
          }
          break;
      }
    });

    group.position.set(position.x, position.y, 0);
    group.userData = { type: 'schematic_symbol' };

    return group;
  }

  private create2DWire(wire: SchematicWire): void {
    if (wire.points.length < 2) return;

    const points = wire.points.map(p => new THREE.Vector3(p.x, p.y, 0.01)); // Slightly above sheet
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });

    const line = new THREE.Line(geometry, material);
    line.name = `wire_${wire.id}`;
    line.userData = { type: 'schematic_wire', wireId: wire.id };

    this.scene.add(line);
  }

  private create2DJunction(junction: SchematicJunction): void {
    const geometry = new THREE.CircleGeometry(0.5, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const junctionMesh = new THREE.Mesh(geometry, material);
    junctionMesh.position.set(junction.position.x, junction.position.y, 0.02);
    junctionMesh.name = `junction_${junction.id}`;
    junctionMesh.userData = { type: 'schematic_junction', junctionId: junction.id };

    this.scene.add(junctionMesh);
  }

  // Utility Methods
  private findPin(pinId: string): SchematicPin | null {
    if (!this.currentSheet) return null;

    for (const component of this.currentSheet.components) {
      const pin = component.pins.find(p => p.id === pinId);
      if (pin) return pin;
    }
    return null;
  }

  private removeComponentNets(componentId: string): void {
    if (!this.currentSheet) return;

    const component = this.currentSheet.components.find(c => c.id === componentId);
    if (!component) return;

    const pinIds = component.pins.map(p => p.id);
    
    // Remove nets that only contain pins from this component
    this.currentSheet.nets = this.currentSheet.nets.filter(net => {
      const remainingPins = net.pins.filter(pinId => !pinIds.includes(pinId));
      if (remainingPins.length === 0) {
        // Remove wires from scene
        net.wires.forEach(wire => {
          const wireMesh = this.scene.getObjectByName(`wire_${wire.id}`);
          if (wireMesh) {
            this.scene.remove(wireMesh);
          }
        });
        return false;
      } else {
        net.pins = remainingPins;
        return true;
      }
    });
  }

  private updateComponentWires(componentId: string): void {
    // Update wires connected to moved/rotated component
    // This would recalculate wire paths in a real implementation
  }

  private getSheetDimensions(size: string): { width: number; height: number } {
    const dimensions = {
      'A4': { width: 210, height: 297 },
      'A3': { width: 297, height: 420 },
      'A2': { width: 420, height: 594 },
      'A1': { width: 594, height: 841 },
      'A0': { width: 841, height: 1189 }
    };
    return dimensions[size as keyof typeof dimensions] || dimensions.A4;
  }

  private initializeSymbolLibrary(): void {
    // Initialize standard symbol library
    this.symbolLibrary.set('resistor', {
      type: 'resistor',
      name: 'Resistor',
      pins: [
        { id: '1', name: '1', position: { x: -5, y: 0 }, direction: 'left', type: 'signal' },
        { id: '2', name: '2', position: { x: 5, y: 0 }, direction: 'right', type: 'signal' }
      ],
      graphics: [
        {
          type: 'rectangle',
          points: [{ x: -2.5, y: -1 }, { x: 2.5, y: 1 }]
        },
        {
          type: 'line',
          points: [{ x: -5, y: 0 }, { x: -2.5, y: 0 }]
        },
        {
          type: 'line',
          points: [{ x: 2.5, y: 0 }, { x: 5, y: 0 }]
        }
      ]
    });

    this.symbolLibrary.set('capacitor', {
      type: 'capacitor',
      name: 'Capacitor',
      pins: [
        { id: '1', name: '1', position: { x: -2.5, y: 0 }, direction: 'left', type: 'signal' },
        { id: '2', name: '2', position: { x: 2.5, y: 0 }, direction: 'right', type: 'signal' }
      ],
      graphics: [
        {
          type: 'line',
          points: [{ x: -0.5, y: -2 }, { x: -0.5, y: 2 }]
        },
        {
          type: 'line',
          points: [{ x: 0.5, y: -2 }, { x: 0.5, y: 2 }]
        },
        {
          type: 'line',
          points: [{ x: -2.5, y: 0 }, { x: -0.5, y: 0 }]
        },
        {
          type: 'line',
          points: [{ x: 0.5, y: 0 }, { x: 2.5, y: 0 }]
        }
      ]
    });

    // Add more symbols...
  }

  // Export/Import
  exportNetlist(): string {
    if (!this.currentSheet) {
      throw new Error('No active sheet');
    }

    let netlist = `* Netlist for ${this.currentSheet.name}\n`;
    netlist += `* Generated on ${new Date().toISOString()}\n\n`;

    // Export components
    this.currentSheet.components.forEach(component => {
      const pinConnections = component.pins.map(pin => {
        const net = this.currentSheet!.nets.find(n => n.pins.includes(pin.id));
        return net ? net.name : 'NC';
      }).join(' ');

      netlist += `${component.name} ${pinConnections} ${component.type}`;
      if (component.value) {
        netlist += ` ${component.value}`;
      }
      netlist += '\n';
    });

    netlist += '\n.END\n';
    return netlist;
  }

  // Grid and Snap
  setGridSize(size: number): void {
    this.gridSize = size;
  }

  setSnapToGrid(enabled: boolean): void {
    this.snapToGrid = enabled;
  }

  // Cleanup
  dispose(): void {
    this.sheets.clear();
    this.currentSheet = null;
    this.symbolLibrary.clear();
    this.isInitialized = false;
    console.log('Schematic Engine disposed');
  }
}

