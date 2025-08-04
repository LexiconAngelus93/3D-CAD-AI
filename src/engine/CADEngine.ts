import { 
  Scene, 
  PerspectiveCamera, 
  WebGLRenderer, 
  BufferGeometry, 
  Material, 
  Mesh, 
  Vector3, 
  Vector2, 
  Plane,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshLambertMaterial,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  AxesHelper
} from 'three';
import { GeometryEngine } from './GeometryEngine';
import { RenderEngine } from './RenderEngine';
import { ConstraintSolver } from './ConstraintSolver';
import { HistoryManager } from './HistoryManager';

export interface CADObject {
  id: string;
  name: string;
  type: 'sketch' | 'solid' | 'surface' | 'assembly';
  geometry: BufferGeometry;
  material: Material;
  mesh: Mesh;
  visible: boolean;
  locked: boolean;
  parent?: string;
  children: string[];
  properties: Record<string, any>;
  constraints: any[];
}

export interface Sketch {
  id: string;
  name: string;
  plane: Plane;
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  closed: boolean;
}

export interface SketchEntity {
  id: string;
  type: 'line' | 'arc' | 'circle' | 'spline' | 'point';
  points: Vector2[];
  properties: Record<string, any>;
}

export interface SketchConstraint {
  id: string;
  type: 'distance' | 'angle' | 'parallel' | 'perpendicular' | 'tangent' | 'coincident';
  entities: string[];
  value?: number;
  properties: Record<string, any>;
}

export class CADEngine {
  private geometryEngine: GeometryEngine;
  private renderEngine: RenderEngine;
  private constraintSolver: ConstraintSolver;
  private historyManager: HistoryManager;
  
  private objects: Map<string, CADObject> = new Map();
  private sketches: Map<string, Sketch> = new Map();
  private selectedObjects: Set<string> = new Set();
  private activeTool: string = 'select';
  private viewMode: 'modeling' | 'pcb' | 'simulation' = 'modeling';
  
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer | null = null;
  private container: HTMLElement | null = null;

  constructor() {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    
    this.geometryEngine = new GeometryEngine();
    this.renderEngine = new RenderEngine(this.scene, this.camera);
    this.constraintSolver = new ConstraintSolver();
    this.historyManager = new HistoryManager();
    
    this.setupScene();
  }

  async initialize(): Promise<void> {
    try {
      await this.geometryEngine.initialize();
      await this.renderEngine.initialize();
      console.log('CAD Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CAD Engine:', error);
      throw error;
    }
  }

  private setupScene(): void {
    // Set up lighting
    const ambientLight = new AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Set up camera
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // Add grid
    const gridHelper = new GridHelper(20, 20, 0x444444, 0x444444);
    this.scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new AxesHelper(5);
    this.scene.add(axesHelper);
  }

  setContainer(container: HTMLElement): void {
    this.container = container;
    this.renderEngine.setContainer(container);
    this.renderer = this.renderEngine.getRenderer();
    
    if (this.renderer) {
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  render(): void {
    if (this.renderer && this.container) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  // Object Management
  addObject(object: Partial<CADObject>): string {
    const id = this.generateId();
    const cadObject: CADObject = {
      id,
      name: object.name || `Object_${id}`,
      type: object.type || 'solid',
      geometry: object.geometry || new BoxGeometry(1, 1, 1),
      material: object.material || new MeshLambertMaterial({ color: 0x00ff00 }),
      mesh: new Mesh(),
      visible: object.visible !== undefined ? object.visible : true,
      locked: object.locked || false,
      children: object.children || [],
      properties: object.properties || {},
      constraints: object.constraints || [],
      ...object
    };

    cadObject.mesh = new Mesh(cadObject.geometry, cadObject.material);
    cadObject.mesh.userData = { id };
    
    this.objects.set(id, cadObject);
    this.scene.add(cadObject.mesh);
    
    this.historyManager.addCommand({
      type: 'add_object',
      objectId: id,
      execute: () => this.scene.add(cadObject.mesh),
      undo: () => this.scene.remove(cadObject.mesh)
    });

    return id;
  }

  removeObject(id: string): boolean {
    const object = this.objects.get(id);
    if (!object) return false;

    this.scene.remove(object.mesh);
    this.objects.delete(id);
    this.selectedObjects.delete(id);

    this.historyManager.addCommand({
      type: 'remove_object',
      objectId: id,
      execute: () => {
        this.scene.remove(object.mesh);
        this.objects.delete(id);
      },
      undo: () => {
        this.objects.set(id, object);
        this.scene.add(object.mesh);
      }
    });

    return true;
  }

  getObject(id: string): CADObject | undefined {
    return this.objects.get(id);
  }

  getAllObjects(): CADObject[] {
    return Array.from(this.objects.values());
  }

  // Selection Management
  selectObjects(objectIds: string[]): void {
    this.clearSelection();
    objectIds.forEach(id => {
      if (this.objects.has(id)) {
        this.selectedObjects.add(id);
        const object = this.objects.get(id)!;
        // Add selection highlight
        if (object.material instanceof MeshLambertMaterial) {
          object.material.emissive.setHex(0x444444);
        }
      }
    });
  }

  clearSelection(): void {
    this.selectedObjects.forEach(id => {
      const object = this.objects.get(id);
      if (object && object.material instanceof MeshLambertMaterial) {
        object.material.emissive.setHex(0x000000);
      }
    });
    this.selectedObjects.clear();
  }

  getSelectedObjects(): string[] {
    return Array.from(this.selectedObjects);
  }

  // Tool Management
  setActiveTool(tool: string): void {
    this.activeTool = tool;
  }

  getActiveTool(): string {
    return this.activeTool;
  }

  // View Mode Management
  setViewMode(mode: 'modeling' | 'pcb' | 'simulation'): void {
    this.viewMode = mode;
    // Update scene based on view mode
    this.updateSceneForViewMode();
  }

  private updateSceneForViewMode(): void {
    // Hide/show objects based on view mode
    this.objects.forEach(object => {
      switch (this.viewMode) {
        case 'modeling':
          object.mesh.visible = object.visible;
          break;
        case 'pcb':
          // Show only PCB-related objects
          object.mesh.visible = object.type === 'pcb' && object.visible;
          break;
        case 'simulation':
          // Show simulation results
          object.mesh.visible = object.visible;
          break;
      }
    });
  }

  // Sketch Management
  createSketch(plane?: Plane): string {
    const id = this.generateId();
    const sketch: Sketch = {
      id,
      name: `Sketch_${id}`,
      plane: plane || new Plane(new Vector3(0, 0, 1), 0),
      entities: [],
      constraints: [],
      closed: false
    };

    this.sketches.set(id, sketch);
    return id;
  }

  addSketchEntity(sketchId: string, entity: Partial<SketchEntity>): string {
    const sketch = this.sketches.get(sketchId);
    if (!sketch) throw new Error(`Sketch ${sketchId} not found`);

    const entityId = this.generateId();
    const sketchEntity: SketchEntity = {
      id: entityId,
      type: entity.type || 'line',
      points: entity.points || [],
      properties: entity.properties || {},
      ...entity
    };

    sketch.entities.push(sketchEntity);
    return entityId;
  }

  // Geometry Operations
  createBox(width: number, height: number, depth: number): string {
    const geometry = new BoxGeometry(width, height, depth);
    const material = new MeshLambertMaterial({ color: 0x00ff00 });
    
    return this.addObject({
      type: 'solid',
      geometry,
      material,
      properties: { width, height, depth, operation: 'box' }
    });
  }

  createSphere(radius: number): string {
    const geometry = new SphereGeometry(radius, 32, 32);
    const material = new MeshLambertMaterial({ color: 0x0000ff });
    
    return this.addObject({
      type: 'solid',
      geometry,
      material,
      properties: { radius, operation: 'sphere' }
    });
  }

  createCylinder(radiusTop: number, radiusBottom: number, height: number): string {
    const geometry = new CylinderGeometry(radiusTop, radiusBottom, height, 32);
    const material = new MeshLambertMaterial({ color: 0xff0000 });
    
    return this.addObject({
      type: 'solid',
      geometry,
      material,
      properties: { radiusTop, radiusBottom, height, operation: 'cylinder' }
    });
  }

  // Boolean Operations
  union(objectId1: string, objectId2: string): string {
    // This would use a CSG library in a real implementation
    const obj1 = this.objects.get(objectId1);
    const obj2 = this.objects.get(objectId2);
    
    if (!obj1 || !obj2) {
      throw new Error('Objects not found for union operation');
    }

    // For now, just create a new object at the midpoint
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshLambertMaterial({ color: 0xffff00 });
    
    return this.addObject({
      type: 'solid',
      geometry,
      material,
      properties: { operation: 'union', operands: [objectId1, objectId2] }
    });
  }

  subtract(objectId1: string, objectId2: string): string {
    // This would use a CSG library in a real implementation
    const obj1 = this.objects.get(objectId1);
    const obj2 = this.objects.get(objectId2);
    
    if (!obj1 || !obj2) {
      throw new Error('Objects not found for subtract operation');
    }

    const geometry = new BoxGeometry(1.5, 1.5, 1.5);
    const material = new MeshLambertMaterial({ color: 0xff00ff });
    
    return this.addObject({
      type: 'solid',
      geometry,
      material,
      properties: { operation: 'subtract', operands: [objectId1, objectId2] }
    });
  }

  intersect(objectId1: string, objectId2: string): string {
    // This would use a CSG library in a real implementation
    const obj1 = this.objects.get(objectId1);
    const obj2 = this.objects.get(objectId2);
    
    if (!obj1 || !obj2) {
      throw new Error('Objects not found for intersect operation');
    }

    const geometry = new BoxGeometry(0.8, 0.8, 0.8);
    const material = new MeshLambertMaterial({ color: 0x00ffff });
    
    return this.addObject({
      type: 'solid',
      geometry,
      material,
      properties: { operation: 'intersect', operands: [objectId1, objectId2] }
    });
  }

  // History Management
  undo(): boolean {
    return this.historyManager.undo();
  }

  redo(): boolean {
    return this.historyManager.redo();
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Export/Import
  exportToJSON(): string {
    const data = {
      objects: Array.from(this.objects.entries()),
      sketches: Array.from(this.sketches.entries()),
      viewMode: this.viewMode
    };
    return JSON.stringify(data, null, 2);
  }

  importFromJSON(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      // Clear existing objects
      this.objects.clear();
      this.sketches.clear();
      this.scene.clear();
      this.setupScene();

      // Import objects
      if (data.objects) {
        data.objects.forEach(([id, objectData]: [string, any]) => {
          // Reconstruct geometry and material
          const geometry = this.reconstructGeometry(objectData.properties);
          const material = this.reconstructMaterial(objectData.material);
          
          this.addObject({
            ...objectData,
            geometry,
            material
          });
        });
      }

      // Import sketches
      if (data.sketches) {
        data.sketches.forEach(([id, sketchData]: [string, any]) => {
          this.sketches.set(id, sketchData);
        });
      }

      // Set view mode
      if (data.viewMode) {
        this.setViewMode(data.viewMode);
      }
    } catch (error) {
      console.error('Failed to import JSON data:', error);
      throw error;
    }
  }

  private reconstructGeometry(properties: any): BufferGeometry {
    switch (properties.operation) {
      case 'box':
        return new BoxGeometry(
          properties.width,
          properties.height,
          properties.depth
        );
      case 'sphere':
        return new SphereGeometry(properties.radius, 32, 32);
      case 'cylinder':
        return new CylinderGeometry(
          properties.radiusTop,
          properties.radiusBottom,
          properties.height,
          32
        );
      default:
        return new BoxGeometry(1, 1, 1);
    }
  }

  private reconstructMaterial(materialData: any): Material {
    return new MeshLambertMaterial({
      color: materialData.color || 0x00ff00
    });
  }

  // Cleanup
  dispose(): void {
    this.objects.forEach(object => {
      object.geometry.dispose();
      if (object.material instanceof Material) {
        object.material.dispose();
      }
    });
    
    this.objects.clear();
    this.sketches.clear();
    this.selectedObjects.clear();
    
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

