import * as THREE from 'three';

export interface PCBComponent {
  id: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'ic' | 'connector' | 'led' | 'switch' | 'diode' | 'transistor' | 'crystal';
  name: string;
  value?: string;
  packageType: string;
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
    impedance?: number;
    current?: number;
    voltage?: number;
  };
}

export interface PCBTrace {
  id: string;
  netId: string;
  layer: number;
  width: number;
  path: { x: number; y: number }[];
  vias: PCBVia[];
  properties: Record<string, any>;
}

export interface PCBVia {
  id: string;
  position: { x: number; y: number };
  diameter: number;
  drillSize: number;
  layers: number[];
  type: 'through' | 'blind' | 'buried';
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
  properties: Record<string, any>;
}

export interface PCBLayer {
  id: string;
  name: string;
  type: 'signal' | 'power' | 'ground' | 'mechanical' | 'solder_mask' | 'silk_screen';
  thickness: number;
  material: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface PCBDesignRules {
  minTraceWidth: number;
  minViaSize: number;
  minDrillSize: number;
  minSpacing: number;
  maxLayers: number;
  impedanceControl: boolean;
  thermalRelief: boolean;
}

export interface PCBStackup {
  layers: {
    name: string;
    type: 'copper' | 'dielectric' | 'solder_mask' | 'silk_screen';
    thickness: number;
    material: string;
    dielectricConstant?: number;
    lossTangent?: number;
  }[];
  totalThickness: number;
  copperWeight: number;
}

export class PCBEngine {
  private boards: Map<string, PCBBoard> = new Map();
  private currentBoard: PCBBoard | null = null;
  private componentLibrary: Map<string, ComponentDefinition> = new Map();
  private autoRouter: AutoRouter;
  private designRuleChecker: DesignRuleChecker;
  private scene: THREE.Scene;
  private isInitialized: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.autoRouter = new AutoRouter();
    this.designRuleChecker = new DesignRuleChecker();
    this.initializeComponentLibrary();
  }

  async initialize(): Promise<void> {
    try {
      await this.loadComponentLibraries();
      this.isInitialized = true;
      console.log('PCB Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PCB Engine:', error);
      throw error;
    }
  }

  private async loadComponentLibraries(): Promise<void> {
    // Load standard component libraries
    await this.loadStandardComponents();
    await this.loadCustomComponents();
  }

  private async loadStandardComponents(): Promise<void> {
    // Standard resistor components
    this.componentLibrary.set('resistor_0805', {
      type: 'resistor',
      packageType: '0805',
      dimensions: { width: 2.0, height: 1.25, length: 0.5 },
      pins: [
        { id: '1', number: '1', position: { x: -0.95, y: 0 }, type: 'signal' },
        { id: '2', number: '2', position: { x: 0.95, y: 0 }, type: 'signal' }
      ],
      footprint: this.createResistorFootprint('0805')
    });

    // Standard capacitor components
    this.componentLibrary.set('capacitor_0805', {
      type: 'capacitor',
      packageType: '0805',
      dimensions: { width: 2.0, height: 1.25, length: 0.5 },
      pins: [
        { id: '1', number: '1', position: { x: -0.95, y: 0 }, type: 'signal' },
        { id: '2', number: '2', position: { x: 0.95, y: 0 }, type: 'signal' }
      ],
      footprint: this.createCapacitorFootprint('0805')
    });

    // Add more standard components...
  }

  private async loadCustomComponents(): Promise<void> {
    // Load user-defined custom components
    // This would typically load from a database or file system
  }

  // Board Management
  createBoard(width: number, height: number, layers: number, name?: string): string {
    const boardId = `board_${Date.now()}`;
    const board: PCBBoard = {
      id: boardId,
      name: name || `Board_${boardId}`,
      dimensions: { width, height, thickness: 1.6 },
      layers: this.createDefaultLayers(layers),
      components: [],
      nets: [],
      designRules: this.getDefaultDesignRules(),
      stackup: this.getDefaultStackup(layers),
      properties: {}
    };

    this.boards.set(boardId, board);
    this.currentBoard = board;
    this.createBoardVisualization(board);
    
    return boardId;
  }

  private createDefaultLayers(count: number): PCBLayer[] {
    const layers: PCBLayer[] = [];
    
    for (let i = 0; i < count; i++) {
      layers.push({
        id: `layer_${i}`,
        name: i === 0 ? 'Top' : i === count - 1 ? 'Bottom' : `Inner_${i}`,
        type: 'signal',
        thickness: 0.035,
        material: 'copper',
        color: '#B87333',
        visible: true,
        locked: false
      });
    }

    return layers;
  }

  private getDefaultDesignRules(): PCBDesignRules {
    return {
      minTraceWidth: 0.1,
      minViaSize: 0.2,
      minDrillSize: 0.1,
      minSpacing: 0.1,
      maxLayers: 16,
      impedanceControl: false,
      thermalRelief: true
    };
  }

  private getDefaultStackup(layers: number): PCBStackup {
    return {
      layers: [
        { name: 'Top Copper', type: 'copper', thickness: 0.035, material: 'copper' },
        { name: 'Core', type: 'dielectric', thickness: 1.53, material: 'FR4', dielectricConstant: 4.5, lossTangent: 0.02 },
        { name: 'Bottom Copper', type: 'copper', thickness: 0.035, material: 'copper' }
      ],
      totalThickness: 1.6,
      copperWeight: 1
    };
  }

  getCurrentBoard(): PCBBoard | null {
    return this.currentBoard;
  }

  // Component Management
  addComponent(type: string, packageType: string, position: { x: number; y: number }, properties?: Record<string, any>): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    const componentId = `comp_${Date.now()}`;
    const componentDef = this.componentLibrary.get(`${type}_${packageType}`);
    
    if (!componentDef) {
      throw new Error(`Component ${type} with package ${packageType} not found in library`);
    }

    const component: PCBComponent = {
      id: componentId,
      type: type as any,
      name: `${type.toUpperCase()}${this.currentBoard.components.length + 1}`,
      value: properties?.value,
      packageType: packageType,
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
      footprint: componentDef.footprint
    };

    this.currentBoard.components.push(component);
    this.createComponentVisualization(component);
    
    return componentId;
  }

  removeComponent(componentId: string): boolean {
    if (!this.currentBoard) return false;

    const index = this.currentBoard.components.findIndex(c => c.id === componentId);
    if (index === -1) return false;

    // Remove component from nets
    this.currentBoard.nets.forEach(net => {
      net.pins = net.pins.filter(pinId => !pinId.startsWith(componentId));
    });

    this.currentBoard.components.splice(index, 1);
    this.removeComponentVisualization(componentId);
    
    return true;
  }

  moveComponent(componentId: string, newPosition: { x: number; y: number }): boolean {
    if (!this.currentBoard) return false;

    const component = this.currentBoard.components.find(c => c.id === componentId);
    if (!component) return false;

    const deltaX = newPosition.x - component.position.x;
    const deltaY = newPosition.y - component.position.y;

    component.position = newPosition;
    
    // Update pin positions
    component.pins.forEach(pin => {
      pin.position.x += deltaX;
      pin.position.y += deltaY;
    });

    this.updateComponentVisualization(component);
    return true;
  }

  rotateComponent(componentId: string, angle: number): boolean {
    if (!this.currentBoard) return false;

    const component = this.currentBoard.components.find(c => c.id === componentId);
    if (!component) return false;

    component.rotation = (component.rotation + angle) % 360;
    
    // Rotate pin positions around component center
    const cos = Math.cos(angle * Math.PI / 180);
    const sin = Math.sin(angle * Math.PI / 180);
    
    component.pins.forEach(pin => {
      const relX = pin.position.x - component.position.x;
      const relY = pin.position.y - component.position.y;
      
      pin.position.x = component.position.x + (relX * cos - relY * sin);
      pin.position.y = component.position.y + (relX * sin + relY * cos);
    });

    this.updateComponentVisualization(component);
    return true;
  }

  // Net Management
  createNet(name: string): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    const netId = `net_${Date.now()}`;
    const net: PCBNet = {
      id: netId,
      name,
      pins: [],
      traces: [],
      properties: {}
    };

    this.currentBoard.nets.push(net);
    return netId;
  }

  addPinToNet(netId: string, pinId: string): boolean {
    if (!this.currentBoard) return false;

    const net = this.currentBoard.nets.find(n => n.id === netId);
    if (!net) return false;

    if (!net.pins.includes(pinId)) {
      net.pins.push(pinId);
    }

    return true;
  }

  // Routing
  autoRoute(): Promise<boolean> {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    return this.autoRouter.route(this.currentBoard);
  }

  addTrace(netId: string, layer: number, width: number, path: { x: number; y: number }[]): string {
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
      path,
      vias: [],
      properties: {}
    };

    net.traces.push(trace);
    this.createTraceVisualization(trace);
    
    return traceId;
  }

  // Design Rule Checking
  checkDesignRules(): DesignRuleViolation[] {
    if (!this.currentBoard) return [];

    return this.designRuleChecker.check(this.currentBoard);
  }

  // Export Functions
  exportGerber(): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    return this.generateGerberFiles(this.currentBoard);
  }

  exportDrill(): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    return this.generateDrillFiles(this.currentBoard);
  }

  exportPickAndPlace(): string {
    if (!this.currentBoard) {
      throw new Error('No active board');
    }

    return this.generatePickAndPlaceFiles(this.currentBoard);
  }

  // Visualization Methods
  private createBoardVisualization(board: PCBBoard): void {
    const geometry = new THREE.PlaneGeometry(board.dimensions.width, board.dimensions.height);
    const material = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.userData = { type: 'pcb_board', id: board.id };
    this.scene.add(mesh);
  }

  private createComponentVisualization(component: PCBComponent): void {
    if (component.footprint) {
      component.footprint.position.set(component.position.x, component.position.y, 0.1);
      component.footprint.rotation.z = component.rotation * Math.PI / 180;
      component.footprint.userData = { type: 'pcb_component', id: component.id };
      this.scene.add(component.footprint);
    }
  }

  private updateComponentVisualization(component: PCBComponent): void {
    if (component.footprint) {
      component.footprint.position.set(component.position.x, component.position.y, 0.1);
      component.footprint.rotation.z = component.rotation * Math.PI / 180;
    }
  }

  private removeComponentVisualization(componentId: string): void {
    const object = this.scene.children.find(child => 
      child.userData.type === 'pcb_component' && child.userData.id === componentId
    );
    
    if (object) {
      this.scene.remove(object);
    }
  }

  private createTraceVisualization(trace: PCBTrace): void {
    if (trace.path.length < 2) return;

    const points = trace.path.map(p => new THREE.Vector3(p.x, p.y, trace.layer * 0.035));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xB87333, linewidth: trace.width });
    const line = new THREE.Line(geometry, material);
    
    line.userData = { type: 'pcb_trace', id: trace.id };
    this.scene.add(line);
  }

  // Footprint Creation Methods
  private createResistorFootprint(packageType: string): THREE.Object3D {
    const group = new THREE.Group();
    
    // Create body
    const bodyGeometry = new THREE.BoxGeometry(2.0, 1.25, 0.5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Create pads
    const padGeometry = new THREE.BoxGeometry(0.6, 1.25, 0.1);
    const padMaterial = new THREE.MeshLambertMaterial({ color: 0xB87333 });
    
    const pad1 = new THREE.Mesh(padGeometry, padMaterial);
    pad1.position.set(-0.95, 0, -0.25);
    group.add(pad1);
    
    const pad2 = new THREE.Mesh(padGeometry, padMaterial);
    pad2.position.set(0.95, 0, -0.25);
    group.add(pad2);
    
    return group;
  }

  private createCapacitorFootprint(packageType: string): THREE.Object3D {
    const group = new THREE.Group();
    
    // Create body
    const bodyGeometry = new THREE.BoxGeometry(2.0, 1.25, 0.8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Create pads
    const padGeometry = new THREE.BoxGeometry(0.6, 1.25, 0.1);
    const padMaterial = new THREE.MeshLambertMaterial({ color: 0xB87333 });
    
    const pad1 = new THREE.Mesh(padGeometry, padMaterial);
    pad1.position.set(-0.95, 0, -0.45);
    group.add(pad1);
    
    const pad2 = new THREE.Mesh(padGeometry, padMaterial);
    pad2.position.set(0.95, 0, -0.45);
    group.add(pad2);
    
    return group;
  }

  private generateGerberFiles(board: PCBBoard): string {
    // Generate Gerber files for manufacturing
    let gerberData = '';
    
    // Add Gerber header
    gerberData += 'G04 Generated by 3D CAD AI*\n';
    gerberData += 'G04 PCB: ' + board.name + '*\n';
    gerberData += '%FSLAX36Y36*%\n';
    gerberData += '%MOMM*%\n';
    
    // Add aperture definitions
    gerberData += '%ADD10C,0.1*%\n';
    gerberData += '%ADD11R,2.0X1.25*%\n';
    
    // Add traces and pads
    board.nets.forEach(net => {
      net.traces.forEach(trace => {
        gerberData += 'G01*\n';
        trace.path.forEach((point, index) => {
          const x = Math.round(point.x * 1000000);
          const y = Math.round(point.y * 1000000);
          if (index === 0) {
            gerberData += `M02*\nX${x}Y${y}D02*\n`;
          } else {
            gerberData += `X${x}Y${y}D01*\n`;
          }
        });
      });
    });
    
    gerberData += 'M02*\n';
    return gerberData;
  }

  private generateDrillFiles(board: PCBBoard): string {
    let drillData = '';
    
    // Add drill header
    drillData += 'M48\n';
    drillData += 'METRIC\n';
    drillData += 'T1C0.2\n';
    drillData += '%\n';
    
    // Add drill coordinates
    board.components.forEach(component => {
      component.pins.forEach(pin => {
        const x = Math.round(pin.position.x * 1000) / 1000;
        const y = Math.round(pin.position.y * 1000) / 1000;
        drillData += `T1\nX${x}Y${y}\n`;
      });
    });
    
    drillData += 'M30\n';
    return drillData;
  }

  private generatePickAndPlaceFiles(board: PCBBoard): string {
    let pickPlaceData = '';
    
    // Add header
    pickPlaceData += 'Designator,Val,Package,Mid X,Mid Y,Rotation,Layer\n';
    
    // Add component data
    board.components.forEach(component => {
      pickPlaceData += `${component.name},${component.value || ''},${component.packageType},`;
      pickPlaceData += `${component.position.x},${component.position.y},${component.rotation},${component.layer}\n`;
    });
    
    return pickPlaceData;
  }

  private initializeComponentLibrary(): void {
    // Initialize with basic components
    // This will be expanded with the loadStandardComponents method
  }
}

// Supporting Classes
class AutoRouter {
  async route(board: PCBBoard): Promise<boolean> {
    // Implement auto-routing algorithm
    console.log('Auto-routing board:', board.name);
    
    // Simple routing implementation
    board.nets.forEach(net => {
      if (net.pins.length >= 2) {
        // Create simple point-to-point connections
        for (let i = 0; i < net.pins.length - 1; i++) {
          const pin1 = this.findPin(board, net.pins[i]);
          const pin2 = this.findPin(board, net.pins[i + 1]);
          
          if (pin1 && pin2) {
            const trace: PCBTrace = {
              id: `trace_${Date.now()}_${i}`,
              netId: net.id,
              layer: 0,
              width: 0.2,
              path: [pin1.position, pin2.position],
              vias: [],
              properties: {}
            };
            
            net.traces.push(trace);
          }
        }
      }
    });
    
    return true;
  }

  private findPin(board: PCBBoard, pinId: string): PCBPin | null {
    for (const component of board.components) {
      const pin = component.pins.find(p => p.id === pinId);
      if (pin) return pin;
    }
    return null;
  }
}

class DesignRuleChecker {
  check(board: PCBBoard): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    
    // Check minimum trace width
    board.nets.forEach(net => {
      net.traces.forEach(trace => {
        if (trace.width < board.designRules.minTraceWidth) {
          violations.push({
            type: 'trace_width',
            severity: 'error',
            message: `Trace width ${trace.width}mm is below minimum ${board.designRules.minTraceWidth}mm`,
            objectId: trace.id
          });
        }
      });
    });
    
    // Check component spacing
    for (let i = 0; i < board.components.length; i++) {
      for (let j = i + 1; j < board.components.length; j++) {
        const comp1 = board.components[i];
        const comp2 = board.components[j];
        
        const distance = Math.sqrt(
          Math.pow(comp1.position.x - comp2.position.x, 2) +
          Math.pow(comp1.position.y - comp2.position.y, 2)
        );
        
        if (distance < board.designRules.minSpacing) {
          violations.push({
            type: 'component_spacing',
            severity: 'warning',
            message: `Components ${comp1.name} and ${comp2.name} are too close`,
            objectId: comp1.id
          });
        }
      }
    }
    
    return violations;
  }
}

interface DesignRuleViolation {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  objectId: string;
}

interface ComponentDefinition {
  type: string;
  packageType: string;
  dimensions: { width: number; height: number; length: number };
  pins: {
    id: string;
    number: string;
    position: { x: number; y: number };
    type: 'input' | 'output' | 'power' | 'ground' | 'signal';
  }[];
  footprint: THREE.Object3D;
}

