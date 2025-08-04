import * as THREE from 'three';

export interface PCBComponent {
  id: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'ic' | 'connector' | 'led' | 'switch' | 'diode' | 'transistor' | 'crystal';
  name: string;
  value?: string;
  package: string;
  position: { x: number; y: number };
  rotation: number;
  layer: 'top' | 'bottom';
  pins: PCBPin[];
  properties: Record<string, any>;
  footprint?: THREE.Object3D;
}

export interface PCBPin {
  id: string;
  number: string;
  position: { x: number; y: number };
  type: 'input' | 'output' | 'power' | 'ground' | 'signal';
  netId?: string;
}

export interface PCBNet {
  id: string;
  name: string;
  pins: string[];
  traces: PCBTrace[];
  properties: {
    width?: number;
    layer?: string;
    impedance?: number;
    differential?: boolean;
  };
}

export interface PCBTrace {
  id: string;
  netId: string;
  layer: string;
  width: number;
  points: { x: number; y: number }[];
  vias: PCBVia[];
}

export interface PCBVia {
  id: string;
  position: { x: number; y: number };
  drillSize: number;
  padSize: number;
  fromLayer: string;
  toLayer: string;
}

export interface PCBLayer {
  id: string;
  name: string;
  type: 'signal' | 'power' | 'ground' | 'mechanical';
  thickness: number;
  material: string;
  visible: boolean;
  locked: boolean;
}

export interface PCBBoard {
  id: string;
  name: string;
  dimensions: { width: number; height: number; thickness: number };
  layers: PCBLayer[];
  components: PCBComponent[];
  nets: PCBNet[];
  designRules: PCBDesignRules;
  stackup: PCBStackup;
}

export interface PCBDesignRules {
  minTraceWidth: number;
  minTraceSpacing: number;
  minViaSize: number;
  minViaDrill: number;
  minHoleSize: number;
  minAnnularRing: number;
  maxAspectRatio: number;
  impedanceControl: {
    singleEnded: number;
    differential: number;
  };
}

export interface PCBStackup {
  layers: {
    name: string;
    type: 'copper' | 'dielectric' | 'soldermask' | 'silkscreen';
    thickness: number;
    material: string;
    dielectricConstant?: number;
  }[];
}

export class PCBEngine {
  private boards: Map<string, PCBBoard> = new Map();
  private currentBoard: PCBBoard | null = null;
  private scene: THREE.Scene;
  private componentLibrary: Map<string, ComponentDefinition> = new Map();
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize component library
      this.initializeComponentLibrary();
      
      // Set up default design rules
      this.setupDefaultDesignRules();
      
      this.isInitialized = true;
      console.log('PCB Engine initialized');
    } catch (error) {
      console.error('Failed to initialize PCB Engine:', error);
      throw error;
    }
  }

  // Board Management
  createBoard(name: string, dimensions: { width: number; height: number; thickness: number }): string {
    const boardId = `board_${Date.now()}`;
    
    const defaultLayers: PCBLayer[] = [
      { id: 'top_copper', name: 'Top Copper', type: 'signal', thickness: 0.035, material: 'Copper', visible: true, locked: false },
      { id: 'top_soldermask', name: 'Top Soldermask', type: 'mechanical', thickness: 0.025, material: 'Soldermask', visible: true, locked: false },
      { id: 'top_silkscreen', name: 'Top Silkscreen', type: 'mechanical', thickness: 0.025, material: 'Silkscreen', visible: true, locked: false },
      { id: 'dielectric', name: 'Dielectric', type: 'mechanical', thickness: dimensions.thickness - 0.07, material: 'FR4', visible: true, locked: false },
      { id: 'bottom_copper', name: 'Bottom Copper', type: 'signal', thickness: 0.035, material: 'Copper', visible: true, locked: false },
      { id: 'bottom_soldermask', name: 'Bottom Soldermask', type: 'mechanical', thickness: 0.025, material: 'Soldermask', visible: true, locked: false },
      { id: 'bottom_silkscreen', name: 'Bottom Silkscreen', type: 'mechanical', thickness: 0.025, material: 'Silkscreen', visible: true, locked: false },
    ];

    const board: PCBBoard = {
      id: boardId,
      name,
      dimensions,
      layers: defaultLayers,
      components: [],
      nets: [],
      designRules: this.getDefaultDesignRules(),
      stackup: this.getDefaultStackup(dimensions.thickness)
    };

    this.boards.set(boardId, board);
    this.currentBoard = board;

    // Create 3D representation
    this.create3DBoard(board);

    return boardId;
  }

  setCurrentBoard(boardId: string): boolean {
    const board = this.boards.get(boardId);
    if (board) {
      this.currentBoard = board;
      return true;
    }
    return false;
  }

  getCurrentBoard(): PCBBoard | null {
    return this.currentBoard;
  }

  // Component Management
  addComponent(type: string, package: string, position: { x: number; y: number }, properties?: Record<string, any>): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    const componentId = `comp_${Date.now()}`;
    const componentDef = this.componentLibrary.get(`${type}_${package}`);
    
    if (!componentDef) {
      throw new Error(`Component ${type} with package ${package} not found in library`);
    }

    const component: PCBComponent = {
      id: componentId,
      type: type as any,
      name: `${type.toUpperCase()}${this.currentBoard.components.length + 1}`,
      value: properties?.value,
      package,
      position,
      rotation: 0,
      layer: 'top',
      pins: componentDef.pins.map(pin => ({
        ...pin,
        id: `${componentId}_${pin.id}`,
        position: {
          x: position.x + pin.position.x,
          y: position.y + pin.position.y
        }
      })),
      properties: properties || {},
      footprint: this.create3DComponent(componentDef, position)
    };

    this.currentBoard.components.push(component);
    
    // Add to 3D scene
    if (component.footprint) {
      this.scene.add(component.footprint);
    }

    return componentId;
  }

  removeComponent(componentId: string): boolean {
    if (!this.currentBoard) return false;

    const componentIndex = this.currentBoard.components.findIndex(c => c.id === componentId);
    if (componentIndex === -1) return false;

    const component = this.currentBoard.components[componentIndex];
    
    // Remove from 3D scene
    if (component.footprint) {
      this.scene.remove(component.footprint);
    }

    // Remove component
    this.currentBoard.components.splice(componentIndex, 1);

    // Remove associated nets and traces
    this.removeComponentNets(componentId);

    return true;
  }

  moveComponent(componentId: string, newPosition: { x: number; y: number }): boolean {
    if (!this.currentBoard) return false;

    const component = this.currentBoard.components.find(c => c.id === componentId);
    if (!component) return false;

    const deltaX = newPosition.x - component.position.x;
    const deltaY = newPosition.y - component.position.y;

    // Update component position
    component.position = newPosition;

    // Update pin positions
    component.pins.forEach(pin => {
      pin.position.x += deltaX;
      pin.position.y += deltaY;
    });

    // Update 3D representation
    if (component.footprint) {
      component.footprint.position.set(newPosition.x, 0, newPosition.y);
    }

    // Update connected traces
    this.updateComponentTraces(componentId);

    return true;
  }

  rotateComponent(componentId: string, angle: number): boolean {
    if (!this.currentBoard) return false;

    const component = this.currentBoard.components.find(c => c.id === componentId);
    if (!component) return false;

    component.rotation = (component.rotation + angle) % 360;

    // Update 3D representation
    if (component.footprint) {
      component.footprint.rotation.y = (component.rotation * Math.PI) / 180;
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
    });

    // Update connected traces
    this.updateComponentTraces(componentId);

    return true;
  }

  // Net and Routing Management
  createNet(name: string, pinIds: string[]): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    const netId = `net_${Date.now()}`;
    const net: PCBNet = {
      id: netId,
      name,
      pins: pinIds,
      traces: [],
      properties: {
        width: 0.2, // Default trace width in mm
        layer: 'top_copper'
      }
    };

    this.currentBoard.nets.push(net);

    // Update pin net associations
    pinIds.forEach(pinId => {
      const pin = this.findPin(pinId);
      if (pin) {
        pin.netId = netId;
      }
    });

    return netId;
  }

  routeNet(netId: string, algorithm: 'manual' | 'auto' = 'auto'): boolean {
    if (!this.currentBoard) return false;

    const net = this.currentBoard.nets.find(n => n.id === netId);
    if (!net) return false;

    if (algorithm === 'auto') {
      return this.autoRouteNet(net);
    } else {
      // Manual routing would be handled by user interaction
      return true;
    }
  }

  addTrace(netId: string, points: { x: number; y: number }[], layer: string, width: number): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    const net = this.currentBoard.nets.find(n => n.id === netId);
    if (!net) {
      throw new Error(`Net ${netId} not found`);
    }

    const traceId = `trace_${Date.now()}`;
    const trace: PCBTrace = {
      id: traceId,
      netId,
      layer,
      width,
      points,
      vias: []
    };

    net.traces.push(trace);

    // Create 3D representation
    this.create3DTrace(trace);

    return traceId;
  }

  addVia(position: { x: number; y: number }, fromLayer: string, toLayer: string, drillSize: number = 0.2, padSize: number = 0.4): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    const viaId = `via_${Date.now()}`;
    const via: PCBVia = {
      id: viaId,
      position,
      drillSize,
      padSize,
      fromLayer,
      toLayer
    };

    // Create 3D representation
    this.create3DVia(via);

    return viaId;
  }

  // Design Rule Checking
  runDesignRuleCheck(): { errors: string[]; warnings: string[] } {
    if (!this.currentBoard) {
      return { errors: ['No active board'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check trace width violations
    this.currentBoard.nets.forEach(net => {
      net.traces.forEach(trace => {
        if (trace.width < this.currentBoard!.designRules.minTraceWidth) {
          errors.push(`Trace ${trace.id} width ${trace.width}mm is below minimum ${this.currentBoard!.designRules.minTraceWidth}mm`);
        }
      });
    });

    // Check component spacing
    this.checkComponentSpacing(errors, warnings);

    // Check via sizes
    this.checkViaSizes(errors, warnings);

    return { errors, warnings };
  }

  // 3D Visualization
  private create3DBoard(board: PCBBoard): void {
    const geometry = new THREE.BoxGeometry(
      board.dimensions.width,
      board.dimensions.thickness,
      board.dimensions.height
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0x2d5016, // PCB green
      roughness: 0.8,
      metalness: 0.1
    });

    const boardMesh = new THREE.Mesh(geometry, material);
    boardMesh.name = `board_${board.id}`;
    boardMesh.userData = { type: 'pcb_board', boardId: board.id };

    this.scene.add(boardMesh);
  }

  private create3DComponent(componentDef: ComponentDefinition, position: { x: number; y: number }): THREE.Object3D {
    const group = new THREE.Object3D();

    // Create component body
    const bodyGeometry = new THREE.BoxGeometry(
      componentDef.dimensions.width,
      componentDef.dimensions.height,
      componentDef.dimensions.length
    );

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: componentDef.color || 0x333333,
      roughness: 0.7,
      metalness: 0.1
    });

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = componentDef.dimensions.height / 2;
    group.add(bodyMesh);

    // Create pins
    componentDef.pins.forEach(pin => {
      const pinGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.2);
      const pinMaterial = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0, // Silver
        metalness: 0.9,
        roughness: 0.1
      });

      const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
      pinMesh.position.set(pin.position.x, 0.05, pin.position.y);
      group.add(pinMesh);
    });

    group.position.set(position.x, 0, position.y);
    group.userData = { type: 'pcb_component' };

    return group;
  }

  private create3DTrace(trace: PCBTrace): void {
    if (trace.points.length < 2) return;

    const points = trace.points.map(p => new THREE.Vector3(p.x, 0.036, p.y)); // Slightly above board
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffd700, // Copper color
      linewidth: trace.width * 10 // Scale for visibility
    });

    const line = new THREE.Line(geometry, material);
    line.name = `trace_${trace.id}`;
    line.userData = { type: 'pcb_trace', traceId: trace.id };

    this.scene.add(line);
  }

  private create3DVia(via: PCBVia): void {
    const geometry = new THREE.CylinderGeometry(
      via.padSize / 2,
      via.padSize / 2,
      0.1, // Via height
      16
    );

    const material = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0, // Silver
      metalness: 0.9,
      roughness: 0.1
    });

    const viaMesh = new THREE.Mesh(geometry, material);
    viaMesh.position.set(via.position.x, 0.05, via.position.y);
    viaMesh.name = `via_${via.id}`;
    viaMesh.userData = { type: 'pcb_via', viaId: via.id };

    this.scene.add(viaMesh);
  }

  // Auto-routing
  private autoRouteNet(net: PCBNet): boolean {
    // Simplified auto-routing algorithm
    if (net.pins.length < 2) return false;

    const pins = net.pins.map(pinId => this.findPin(pinId)).filter(pin => pin !== null) as PCBPin[];
    if (pins.length < 2) return false;

    // Create traces between consecutive pins (simplified)
    for (let i = 0; i < pins.length - 1; i++) {
      const startPin = pins[i];
      const endPin = pins[i + 1];

      const points = [
        { x: startPin.position.x, y: startPin.position.y },
        { x: endPin.position.x, y: endPin.position.y }
      ];

      this.addTrace(net.id, points, net.properties.layer || 'top_copper', net.properties.width || 0.2);
    }

    return true;
  }

  // Utility Methods
  private findPin(pinId: string): PCBPin | null {
    if (!this.currentBoard) return null;

    for (const component of this.currentBoard.components) {
      const pin = component.pins.find(p => p.id === pinId);
      if (pin) return pin;
    }
    return null;
  }

  private removeComponentNets(componentId: string): void {
    if (!this.currentBoard) return;

    const component = this.currentBoard.components.find(c => c.id === componentId);
    if (!component) return;

    const pinIds = component.pins.map(p => p.id);
    
    // Remove nets that only contain pins from this component
    this.currentBoard.nets = this.currentBoard.nets.filter(net => {
      const remainingPins = net.pins.filter(pinId => !pinIds.includes(pinId));
      if (remainingPins.length === 0) {
        // Remove traces from scene
        net.traces.forEach(trace => {
          const traceMesh = this.scene.getObjectByName(`trace_${trace.id}`);
          if (traceMesh) {
            this.scene.remove(traceMesh);
          }
        });
        return false;
      } else {
        net.pins = remainingPins;
        return true;
      }
    });
  }

  private updateComponentTraces(componentId: string): void {
    // Update traces connected to moved/rotated component
    // This would recalculate trace paths in a real implementation
  }

  private checkComponentSpacing(errors: string[], warnings: string[]): void {
    if (!this.currentBoard) return;

    const components = this.currentBoard.components;
    const minSpacing = 0.5; // Minimum spacing in mm

    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const comp1 = components[i];
        const comp2 = components[j];

        const distance = Math.sqrt(
          Math.pow(comp1.position.x - comp2.position.x, 2) +
          Math.pow(comp1.position.y - comp2.position.y, 2)
        );

        if (distance < minSpacing) {
          warnings.push(`Components ${comp1.name} and ${comp2.name} are too close (${distance.toFixed(2)}mm)`);
        }
      }
    }
  }

  private checkViaSizes(errors: string[], warnings: string[]): void {
    // Via size checking would be implemented here
  }

  private initializeComponentLibrary(): void {
    // Initialize standard component library
    this.componentLibrary.set('resistor_0805', {
      type: 'resistor',
      package: '0805',
      dimensions: { width: 2.0, height: 1.25, length: 0.5 },
      pins: [
        { id: '1', number: '1', position: { x: -0.95, y: 0 }, type: 'signal' },
        { id: '2', number: '2', position: { x: 0.95, y: 0 }, type: 'signal' }
      ],
      color: 0x8b4513
    });

    this.componentLibrary.set('capacitor_0805', {
      type: 'capacitor',
      package: '0805',
      dimensions: { width: 2.0, height: 1.25, length: 0.5 },
      pins: [
        { id: '1', number: '1', position: { x: -0.95, y: 0 }, type: 'signal' },
        { id: '2', number: '2', position: { x: 0.95, y: 0 }, type: 'signal' }
      ],
      color: 0x654321
    });

    // Add more components...
  }

  private setupDefaultDesignRules(): void {
    // Set up default design rules
  }

  private getDefaultDesignRules(): PCBDesignRules {
    return {
      minTraceWidth: 0.1,
      minTraceSpacing: 0.1,
      minViaSize: 0.2,
      minViaDrill: 0.1,
      minHoleSize: 0.1,
      minAnnularRing: 0.05,
      maxAspectRatio: 10,
      impedanceControl: {
        singleEnded: 50,
        differential: 100
      }
    };
  }

  private getDefaultStackup(thickness: number): PCBStackup {
    return {
      layers: [
        { name: 'Top Copper', type: 'copper', thickness: 0.035, material: 'Copper' },
        { name: 'Dielectric', type: 'dielectric', thickness: thickness - 0.07, material: 'FR4', dielectricConstant: 4.5 },
        { name: 'Bottom Copper', type: 'copper', thickness: 0.035, material: 'Copper' }
      ]
    };
  }

  // Export/Import
  exportGerber(): { files: Map<string, string>; drillFile: string } {
    // Generate Gerber files for manufacturing
    const files = new Map<string, string>();
    
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    // Generate layer files
    this.currentBoard.layers.forEach(layer => {
      if (layer.type === 'signal') {
        files.set(`${layer.name}.gbr`, this.generateGerberLayer(layer));
      }
    });

    // Generate drill file
    const drillFile = this.generateDrillFile();

    return { files, drillFile };
  }

  private generateGerberLayer(layer: PCBLayer): string {
    // Generate Gerber data for layer
    return `%FSLAX26Y26*%\n%MOMM*%\n%TA.AperFunction,Conductor*%\nM02*\n`;
  }

  private generateDrillFile(): string {
    // Generate Excellon drill file
    return `M48\nFMAT,2\nMETRIC\nM30\n`;
  }

  // Cleanup
  dispose(): void {
    this.boards.clear();
    this.currentBoard = null;
    this.componentLibrary.clear();
    this.isInitialized = false;
    console.log('PCB Engine disposed');
  }
}

interface ComponentDefinition {
  type: string;
  package: string;
  dimensions: { width: number; height: number; length: number };
  pins: {
    id: string;
    number: string;
    position: { x: number; y: number };
    type: 'input' | 'output' | 'power' | 'ground' | 'signal';
  }[];
  color?: number;
}

