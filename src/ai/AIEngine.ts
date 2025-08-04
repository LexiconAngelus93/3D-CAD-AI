import {
   Box3,
  BoxGeometry,
  BufferGeometry,
  BufferGeometryUtils,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Triangle,
  Vector3 
} from 'three';
import { CADEngine, CADObject } from '../engine/CADEngine';

export interface AIModelRequest {
  prompt: string;
  style?: 'mechanical' | 'organic' | 'architectural' | 'electronic';
  complexity?: 'simple' | 'medium' | 'complex';
  size?: 'small' | 'medium' | 'large';
  material?: string;
  constraints?: {
    maxDimensions?: { x: number; y: number; z: number };
    minDimensions?: { x: number; y: number; z: number };
    symmetry?: 'none' | 'bilateral' | 'radial' | 'full';
    functionality?: string[];
  };
}

export interface AIModelResponse {
  success: boolean;
  objectId?: string;
  geometry?: BufferGeometry;
  material?: Material;
  metadata?: {
    description: string;
    confidence: number;
    processingTime: number;
    suggestions?: string[];
  };
  error?: string;
}

export interface AIOptimizationRequest {
  objectId: string;
  goals: ('weight' | 'strength' | 'cost' | 'manufacturability' | 'aesthetics')[];
  constraints?: {
    materialType?: string;
    manufacturingMethod?: string;
    maxWeight?: number;
    maxCost?: number;
  };
}

export interface AIOptimizationResponse {
  success: boolean;
  optimizedObjectId?: string;
  improvements?: {
    weightReduction?: number;
    strengthIncrease?: number;
    costReduction?: number;
    manufacturabilityScore?: number;
  };
  suggestions?: string[];
  error?: string;
}

export class AIEngine {
  private cadEngine: CADEngine;
  private apiKey: string;
  private apiEndpoint: string;
  private isInitialized: boolean = false;

  constructor(cadEngine: CADEngine) {
    this.cadEngine = cadEngine;
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiEndpoint = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  }

  async initialize(): Promise<void> {
    try {
      // Initialize AI services
      if (!this.apiKey) {
        console.warn('OpenAI API key not found. AI features will use mock responses.');
      }
      
      this.isInitialized = true;
      console.log('AI Engine initialized');
    } catch (error) {
      console.error('Failed to initialize AI Engine:', error);
      throw error;
    }
  }

  async generateModel(request: AIModelRequest): Promise<AIModelResponse> {
    if (!this.isInitialized) {
      throw new Error('AI Engine not initialized');
    }

    try {
      const startTime = Date.now();

      // Parse the prompt to understand what to create
      const modelType = this.parseModelType(request.prompt);
      const dimensions = this.parseDimensions(request.prompt, request.size);
      
      // Generate geometry based on prompt analysis
      const geometry = await this.createGeometryFromPrompt(modelType, dimensions, request);
      const material = this.createMaterialFromPrompt(request.prompt, request.material);

      // Add the object to the CAD engine
      const objectId = this.cadEngine.addObject({
        type: 'solid',
        geometry,
        material,
        name: this.generateObjectName(request.prompt),
        properties: {
          aiGenerated: true,
          originalPrompt: request.prompt,
          style: request.style || 'mechanical',
          complexity: request.complexity || 'medium'
        }
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        objectId,
        geometry,
        material,
        metadata: {
          description: this.generateDescription(request.prompt, modelType),
          confidence: this.calculateConfidence(request.prompt),
          processingTime,
          suggestions: this.generateSuggestions(request.prompt)
        }
      };
    } catch (error) {
      console.error('AI model generation failed:', error);
      return {
        success: false,
        error: `Failed to generate model: ${error}`
      };
    }
  }

  async optimizeModel(request: AIOptimizationRequest): Promise<AIOptimizationResponse> {
    if (!this.isInitialized) {
      throw new Error('AI Engine not initialized');
    }

    try {
      const object = this.cadEngine.getObject(request.objectId);
      if (!object) {
        throw new Error(`Object ${request.objectId} not found`);
      }

      // Analyze current object
      const currentMetrics = this.analyzeObject(object);
      
      // Apply optimization algorithms
      const optimizedGeometry = await this.applyOptimizations(
        object.geometry,
        request.goals,
        request.constraints
      );

      // Create optimized object
      const optimizedObjectId = this.cadEngine.addObject({
        type: 'solid',
        geometry: optimizedGeometry,
        material: object.material.clone(),
        name: `${object.name}_optimized`,
        properties: {
          ...object.properties,
          aiOptimized: true,
          optimizationGoals: request.goals,
          originalObjectId: request.objectId
        }
      });

      // Calculate improvements
      const optimizedObject = this.cadEngine.getObject(optimizedObjectId)!;
      const optimizedMetrics = this.analyzeObject(optimizedObject);
      const improvements = this.calculateImprovements(currentMetrics, optimizedMetrics);

      return {
        success: true,
        optimizedObjectId,
        improvements,
        suggestions: this.generateOptimizationSuggestions(request.goals, improvements)
      };
    } catch (error) {
      console.error('AI optimization failed:', error);
      return {
        success: false,
        error: `Failed to optimize model: ${error}`
      };
    }
  }

  private parseModelType(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Mechanical parts
    if (lowerPrompt.includes('gear') || lowerPrompt.includes('cog')) return 'gear';
    if (lowerPrompt.includes('bracket') || lowerPrompt.includes('mount')) return 'bracket';
    if (lowerPrompt.includes('housing') || lowerPrompt.includes('case') || lowerPrompt.includes('enclosure')) return 'housing';
    if (lowerPrompt.includes('shaft') || lowerPrompt.includes('rod') || lowerPrompt.includes('axle')) return 'shaft';
    if (lowerPrompt.includes('bearing') || lowerPrompt.includes('bushing')) return 'bearing';
    if (lowerPrompt.includes('screw') || lowerPrompt.includes('bolt') || lowerPrompt.includes('fastener')) return 'fastener';
    if (lowerPrompt.includes('plate') || lowerPrompt.includes('panel')) return 'plate';
    if (lowerPrompt.includes('pipe') || lowerPrompt.includes('tube') || lowerPrompt.includes('cylinder')) return 'pipe';
    
    // Basic shapes
    if (lowerPrompt.includes('box') || lowerPrompt.includes('cube') || lowerPrompt.includes('rectangular')) return 'box';
    if (lowerPrompt.includes('sphere') || lowerPrompt.includes('ball') || lowerPrompt.includes('round')) return 'sphere';
    if (lowerPrompt.includes('cone') || lowerPrompt.includes('conical')) return 'cone';
    if (lowerPrompt.includes('torus') || lowerPrompt.includes('donut') || lowerPrompt.includes('ring')) return 'torus';
    
    // Default to box
    return 'box';
  }

  private parseDimensions(prompt: string, size?: string): { x: number; y: number; z: number } {
    // Extract dimensions from prompt if specified
    const dimensionRegex = /(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i;
    const match = prompt.match(dimensionRegex);
    
    if (match) {
      return {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        z: parseFloat(match[3])
      };
    }

    // Use size parameter
    switch (size) {
      case 'small':
        return { x: 1, y: 1, z: 1 };
      case 'large':
        return { x: 5, y: 5, z: 5 };
      default: // medium
        return { x: 2, y: 2, z: 2 };
    }
  }

  private async createGeometryFromPrompt(
    modelType: string,
    dimensions: { x: number; y: number; z: number },
    request: AIModelRequest
  ): Promise<BufferGeometry> {
    switch (modelType) {
      case 'gear':
        return this.createGearGeometry(dimensions);
      case 'bracket':
        return this.createBracketGeometry(dimensions);
      case 'housing':
        return this.createHousingGeometry(dimensions);
      case 'shaft':
        return this.createShaftGeometry(dimensions);
      case 'bearing':
        return this.createBearingGeometry(dimensions);
      case 'fastener':
        return this.createFastenerGeometry(dimensions);
      case 'plate':
        return this.createPlateGeometry(dimensions);
      case 'pipe':
        return this.createPipeGeometry(dimensions);
      case 'sphere':
        return new SphereGeometry(dimensions.x / 2, 32, 32);
      case 'cone':
        return new ConeGeometry(dimensions.x / 2, dimensions.y, 32);
      case 'torus':
        return new TorusGeometry(dimensions.x / 2, dimensions.x / 8, 16, 100);
      default: // box
        return new BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
    }
  }

  private createGearGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    // Create a simplified gear using cylinder with notches
    const radius = dimensions.x / 2;
    const height = dimensions.z;
    const teeth = Math.max(8, Math.floor(radius * 4));
    
    const geometry = new CylinderGeometry(radius, radius, height, teeth * 2);
    
    // Modify vertices to create gear teeth (simplified)
    const positions = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      const angle = Math.atan2(z, x);
      const toothIndex = Math.floor((angle + Math.PI) / (2 * Math.PI) * teeth);
      const isToothTip = toothIndex % 2 === 0;
      
      if (Math.abs(y) < height / 2 - 0.1) { // Not on top/bottom faces
        const currentRadius = Math.sqrt(x * x + z * z);
        const newRadius = isToothTip ? radius : radius * 0.8;
        const scale = newRadius / currentRadius;
        positions[i] = x * scale;
        positions[i + 2] = z * scale;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return geometry;
  }

  private createBracketGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    // Create an L-shaped bracket
    const group = new Group();
    
    // Vertical part
    const vertical = new BoxGeometry(dimensions.x * 0.2, dimensions.y, dimensions.z * 0.2);
    const verticalMesh = new Mesh(vertical);
    verticalMesh.position.set(-dimensions.x * 0.4, 0, 0);
    group.add(verticalMesh);
    
    // Horizontal part
    const horizontal = new BoxGeometry(dimensions.x, dimensions.y * 0.2, dimensions.z * 0.2);
    const horizontalMesh = new Mesh(horizontal);
    horizontalMesh.position.set(0, -dimensions.y * 0.4, 0);
    group.add(horizontalMesh);
    
    // Merge geometries
    group.updateMatrixWorld();
    const mergedGeometry = new BufferGeometry();
    const geometries: BufferGeometry[] = [];
    
    group.children.forEach(child => {
      if (child instanceof Mesh) {
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        geometries.push(geo);
      }
    });
    
    return BufferGeometryUtils.mergeGeometries(geometries) || new BoxGeometry(1, 1, 1);
  }

  private createHousingGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    // Create a hollow box (housing)
    const outerGeometry = new BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
    const innerGeometry = new BoxGeometry(
      dimensions.x * 0.8,
      dimensions.y * 0.8,
      dimensions.z * 0.8
    );
    
    // For now, return outer geometry (CSG subtraction would be needed for hollow)
    return outerGeometry;
  }

  private createShaftGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    const radius = Math.min(dimensions.x, dimensions.z) / 2;
    const height = dimensions.y;
    return new CylinderGeometry(radius, radius, height, 32);
  }

  private createBearingGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    const outerRadius = dimensions.x / 2;
    const innerRadius = outerRadius * 0.6;
    const height = dimensions.z;
    
    // Create outer ring
    const outerGeometry = new CylinderGeometry(outerRadius, outerRadius, height, 32);
    
    // For now, return outer geometry (CSG subtraction would be needed for inner hole)
    return outerGeometry;
  }

  private createFastenerGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    // Create a simple screw/bolt
    const headRadius = dimensions.x / 2;
    const shaftRadius = headRadius * 0.6;
    const headHeight = dimensions.z * 0.3;
    const shaftHeight = dimensions.y - headHeight;
    
    const group = new Group();
    
    // Head
    const head = new CylinderGeometry(headRadius, headRadius, headHeight, 6);
    const headMesh = new Mesh(head);
    headMesh.position.set(0, shaftHeight / 2 + headHeight / 2, 0);
    group.add(headMesh);
    
    // Shaft
    const shaft = new CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 16);
    const shaftMesh = new Mesh(shaft);
    shaftMesh.position.set(0, -headHeight / 2, 0);
    group.add(shaftMesh);
    
    // Merge geometries
    group.updateMatrixWorld();
    const geometries: BufferGeometry[] = [];
    
    group.children.forEach(child => {
      if (child instanceof Mesh) {
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        geometries.push(geo);
      }
    });
    
    return BufferGeometryUtils.mergeGeometries(geometries) || new CylinderGeometry(0.5, 0.5, 2, 16);
  }

  private createPlateGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    // Create a thin plate
    const thickness = Math.min(dimensions.y, dimensions.z) * 0.1;
    return new BoxGeometry(dimensions.x, thickness, dimensions.z);
  }

  private createPipeGeometry(dimensions: { x: number; y: number; z: number }): BufferGeometry {
    const outerRadius = dimensions.x / 2;
    const innerRadius = outerRadius * 0.7;
    const height = dimensions.y;
    
    // For now, return outer cylinder (CSG subtraction would be needed for hollow)
    return new CylinderGeometry(outerRadius, outerRadius, height, 32);
  }

  private createMaterialFromPrompt(prompt: string, materialType?: string): Material {
    const lowerPrompt = prompt.toLowerCase();
    
    let color = 0x888888; // Default gray
    let metalness = 0.5;
    let roughness = 0.5;
    
    // Determine material properties from prompt
    if (lowerPrompt.includes('metal') || lowerPrompt.includes('steel') || lowerPrompt.includes('aluminum')) {
      color = 0xc0c0c0;
      metalness = 0.9;
      roughness = 0.1;
    } else if (lowerPrompt.includes('plastic') || lowerPrompt.includes('polymer')) {
      color = 0x4a90e2;
      metalness = 0.0;
      roughness = 0.8;
    } else if (lowerPrompt.includes('wood')) {
      color = 0x8b4513;
      metalness = 0.0;
      roughness = 0.9;
    } else if (lowerPrompt.includes('glass')) {
      color = 0xffffff;
      metalness = 0.0;
      roughness = 0.0;
    }
    
    // Color keywords
    if (lowerPrompt.includes('red')) color = 0xff0000;
    else if (lowerPrompt.includes('blue')) color = 0x0000ff;
    else if (lowerPrompt.includes('green')) color = 0x00ff00;
    else if (lowerPrompt.includes('yellow')) color = 0xffff00;
    else if (lowerPrompt.includes('black')) color = 0x000000;
    else if (lowerPrompt.includes('white')) color = 0xffffff;
    
    return new MeshStandardMaterial({
      color,
      metalness,
      roughness
    });
  }

  private generateObjectName(prompt: string): string {
    const words = prompt.split(' ').slice(0, 3);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('_');
  }

  private generateDescription(prompt: string, modelType: string): string {
    return `AI-generated ${modelType} based on prompt: "${prompt}"`;
  }

  private calculateConfidence(prompt: string): number {
    // Simple confidence calculation based on prompt clarity
    const keywords = ['create', 'make', 'design', 'build', 'generate'];
    const hasKeywords = keywords.some(keyword => prompt.toLowerCase().includes(keyword));
    const wordCount = prompt.split(' ').length;
    
    let confidence = 0.5;
    if (hasKeywords) confidence += 0.2;
    if (wordCount >= 3) confidence += 0.2;
    if (wordCount >= 6) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateSuggestions(prompt: string): string[] {
    const suggestions = [
      'Try adding material specifications for better results',
      'Consider specifying dimensions for more accurate sizing',
      'Add functional requirements for optimized design',
      'Include manufacturing constraints for practical designs'
    ];
    
    return suggestions.slice(0, 2);
  }

  private analyzeObject(object: CADObject): any {
    const geometry = object.geometry;
    
    // Calculate basic metrics
    const boundingBox = new Box3().setFromObject(object.mesh);
    const size = boundingBox.getSize(new Vector3());
    const volume = size.x * size.y * size.z; // Simplified volume calculation
    
    return {
      volume,
      surfaceArea: this.calculateSurfaceArea(geometry),
      boundingBox: size,
      vertexCount: geometry.attributes.position.count,
      faceCount: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3
    };
  }

  private calculateSurfaceArea(geometry: BufferGeometry): number {
    // Simplified surface area calculation
    const position = geometry.attributes.position;
    const index = geometry.index;
    
    if (!position || !index) return 0;
    
    let area = 0;
    const triangle = new Triangle();
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    
    for (let i = 0; i < index.count; i += 3) {
      const i1 = index.getX(i);
      const i2 = index.getX(i + 1);
      const i3 = index.getX(i + 2);
      
      a.fromBufferAttribute(position, i1);
      b.fromBufferAttribute(position, i2);
      c.fromBufferAttribute(position, i3);
      
      triangle.set(a, b, c);
      area += triangle.getArea();
    }
    
    return area;
  }

  private async applyOptimizations(
    geometry: BufferGeometry,
    goals: string[],
    constraints?: any
  ): Promise<BufferGeometry> {
    // Simplified optimization - in reality this would use complex algorithms
    const optimizedGeometry = geometry.clone();
    
    if (goals.includes('weight')) {
      // Reduce material by scaling down slightly
      optimizedGeometry.scale(0.95, 0.95, 0.95);
    }
    
    if (goals.includes('manufacturability')) {
      // Simplify geometry by reducing vertex count
      // This would use mesh decimation algorithms in practice
    }
    
    return optimizedGeometry;
  }

  private calculateImprovements(currentMetrics: any, optimizedMetrics: any): any {
    return {
      weightReduction: ((currentMetrics.volume - optimizedMetrics.volume) / currentMetrics.volume) * 100,
      strengthIncrease: 5, // Placeholder
      costReduction: 10, // Placeholder
      manufacturabilityScore: 85 // Placeholder
    };
  }

  private generateOptimizationSuggestions(goals: string[], improvements: any): string[] {
    const suggestions = [];
    
    if (goals.includes('weight') && improvements.weightReduction > 0) {
      suggestions.push(`Weight reduced by ${improvements.weightReduction.toFixed(1)}%`);
    }
    
    if (goals.includes('manufacturability')) {
      suggestions.push('Consider adding draft angles for better moldability');
    }
    
    return suggestions;
  }

  // Text-to-3D API Integration (placeholder for future implementation)
  async generateFromText(prompt: string): Promise<BufferGeometry | null> {
    try {
      // This would integrate with services like OpenAI's text-to-3D or similar
      console.log('Text-to-3D generation not yet implemented');
      return null;
    } catch (error) {
      console.error('Text-to-3D generation failed:', error);
      return null;
    }
  }

  // Cleanup
  dispose(): void {
    this.isInitialized = false;
    console.log('AI Engine disposed');
  }
}

