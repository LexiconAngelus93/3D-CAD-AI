import {
   BoxGeometry,
  BufferGeometry,
  BufferGeometryUtils,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
  TorusGeometry 
} from 'three';

export interface ModelGenerationParams {
  type: string;
  dimensions: { x: number; y: number; z: number };
  parameters?: Record<string, any>;
  style?: string;
  complexity?: 'simple' | 'medium' | 'complex';
}

export class ModelGenerator {
  
  static generateMechanicalPart(params: ModelGenerationParams): BufferGeometry {
    switch (params.type.toLowerCase()) {
      case 'gear':
        return this.generateGear(params);
      case 'bearing':
        return this.generateBearing(params);
      case 'shaft':
        return this.generateShaft(params);
      case 'bracket':
        return this.generateBracket(params);
      case 'housing':
        return this.generateHousing(params);
      case 'flange':
        return this.generateFlange(params);
      case 'coupling':
        return this.generateCoupling(params);
      case 'pulley':
        return this.generatePulley(params);
      default:
        return new BoxGeometry(params.dimensions.x, params.dimensions.y, params.dimensions.z);
    }
  }

  static generateElectronicComponent(params: ModelGenerationParams): BufferGeometry {
    switch (params.type.toLowerCase()) {
      case 'resistor':
        return this.generateResistor(params);
      case 'capacitor':
        return this.generateCapacitor(params);
      case 'inductor':
        return this.generateInductor(params);
      case 'ic':
      case 'chip':
        return this.generateIC(params);
      case 'connector':
        return this.generateConnector(params);
      case 'led':
        return this.generateLED(params);
      case 'switch':
        return this.generateSwitch(params);
      default:
        return new BoxGeometry(params.dimensions.x, params.dimensions.y, params.dimensions.z);
    }
  }

  static generateArchitecturalElement(params: ModelGenerationParams): BufferGeometry {
    switch (params.type.toLowerCase()) {
      case 'column':
        return this.generateColumn(params);
      case 'beam':
        return this.generateBeam(params);
      case 'wall':
        return this.generateWall(params);
      case 'window':
        return this.generateWindow(params);
      case 'door':
        return this.generateDoor(params);
      case 'stair':
        return this.generateStair(params);
      default:
        return new BoxGeometry(params.dimensions.x, params.dimensions.y, params.dimensions.z);
    }
  }

  // Mechanical Parts
  private static generateGear(params: ModelGenerationParams): BufferGeometry {
    const radius = params.dimensions.x / 2;
    const height = params.dimensions.z;
    const teeth = params.parameters?.teeth || Math.max(8, Math.floor(radius * 6));
    const toothHeight = params.parameters?.toothHeight || radius * 0.1;
    const pressureAngle = params.parameters?.pressureAngle || 20;

    // Create gear profile
    const shape = new Shape();
    const innerRadius = radius - toothHeight;
    const outerRadius = radius + toothHeight;

    // Generate gear tooth profile
    for (let i = 0; i <= teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const nextAngle = ((i + 1) / teeth) * Math.PI * 2;
      
      // Tooth root
      const rootAngle = angle - (Math.PI / teeth) * 0.3;
      const rootX = Math.cos(rootAngle) * innerRadius;
      const rootY = Math.sin(rootAngle) * innerRadius;
      
      // Tooth tip
      const tipAngle = angle;
      const tipX = Math.cos(tipAngle) * outerRadius;
      const tipY = Math.sin(tipAngle) * outerRadius;
      
      // Tooth trailing edge
      const trailAngle = angle + (Math.PI / teeth) * 0.3;
      const trailX = Math.cos(trailAngle) * innerRadius;
      const trailY = Math.sin(trailAngle) * innerRadius;

      if (i === 0) {
        shape.moveTo(rootX, rootY);
      } else {
        shape.lineTo(rootX, rootY);
      }
      
      shape.lineTo(tipX, tipY);
      shape.lineTo(trailX, trailY);
    }

    shape.closePath();

    // Extrude the gear profile
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false
    };

    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    
    // Center the geometry
    geometry.translate(0, 0, -height / 2);
    geometry.rotateX(Math.PI / 2);

    return geometry;
  }

  private static generateBearing(params: ModelGenerationParams): BufferGeometry {
    const outerRadius = params.dimensions.x / 2;
    const innerRadius = params.parameters?.innerRadius || outerRadius * 0.6;
    const height = params.dimensions.z;

    const group = new Group();

    // Outer ring
    const outerGeometry = new CylinderGeometry(outerRadius, outerRadius, height, 32);
    const outerMesh = new Mesh(outerGeometry);
    group.add(outerMesh);

    // Inner ring (would need CSG for proper hollow)
    const innerGeometry = new CylinderGeometry(innerRadius + 0.05, innerRadius + 0.05, height * 0.8, 32);
    const innerMesh = new Mesh(innerGeometry);
    group.add(innerMesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || outerGeometry;
  }

  private static generateShaft(params: ModelGenerationParams): BufferGeometry {
    const radius = Math.min(params.dimensions.x, params.dimensions.z) / 2;
    const length = params.dimensions.y;
    const keyway = params.parameters?.keyway || false;
    const steps = params.parameters?.steps || [];

    if (steps.length > 0) {
      // Stepped shaft
      const group = new Group();
      let currentPosition = -length / 2;

      steps.forEach((step: any) => {
        const stepRadius = step.radius || radius;
        const stepLength = step.length || length / steps.length;
        
        const stepGeometry = new CylinderGeometry(stepRadius, stepRadius, stepLength, 32);
        const stepMesh = new Mesh(stepGeometry);
        stepMesh.position.y = currentPosition + stepLength / 2;
        group.add(stepMesh);
        
        currentPosition += stepLength;
      });

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

      return BufferGeometryUtils.mergeGeometries(geometries) || new CylinderGeometry(radius, radius, length, 32);
    } else {
      // Simple shaft
      return new CylinderGeometry(radius, radius, length, 32);
    }
  }

  private static generateBracket(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const depth = params.dimensions.z;
    const thickness = params.parameters?.thickness || Math.min(width, height, depth) * 0.1;
    const angle = params.parameters?.angle || 90;

    const group = new Group();

    // Vertical part
    const verticalGeometry = new BoxGeometry(thickness, height, depth);
    const verticalMesh = new Mesh(verticalGeometry);
    verticalMesh.position.set(-width / 2 + thickness / 2, 0, 0);
    group.add(verticalMesh);

    // Horizontal part
    const horizontalGeometry = new BoxGeometry(width, thickness, depth);
    const horizontalMesh = new Mesh(horizontalGeometry);
    horizontalMesh.position.set(0, -height / 2 + thickness / 2, 0);
    group.add(horizontalMesh);

    // Gusset (reinforcement)
    if (params.parameters?.gusset !== false) {
      const gussetSize = Math.min(width, height) * 0.3;
      const gussetGeometry = new CylinderGeometry(0, gussetSize, gussetSize, 3);
      const gussetMesh = new Mesh(gussetGeometry);
      gussetMesh.position.set(-width / 2 + gussetSize / 2, -height / 2 + gussetSize / 2, 0);
      gussetMesh.rotateZ(Math.PI / 4);
      group.add(gussetMesh);
    }

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

    return BufferGeometryUtils.mergeGeometries(geometries) || new BoxGeometry(width, height, depth);
  }

  private static generateHousing(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const depth = params.dimensions.z;
    const wallThickness = params.parameters?.wallThickness || Math.min(width, height, depth) * 0.1;

    // For now, return solid geometry (CSG would be needed for hollow)
    const geometry = new BoxGeometry(width, height, depth);
    
    // Add mounting holes if specified
    if (params.parameters?.mountingHoles) {
      // This would require CSG operations to subtract holes
    }

    return geometry;
  }

  private static generateFlange(params: ModelGenerationParams): BufferGeometry {
    const outerRadius = params.dimensions.x / 2;
    const innerRadius = params.parameters?.innerRadius || outerRadius * 0.4;
    const thickness = params.dimensions.z;
    const boltHoles = params.parameters?.boltHoles || 4;
    const boltCircleRadius = params.parameters?.boltCircleRadius || outerRadius * 0.8;

    // Main flange body
    const geometry = new CylinderGeometry(outerRadius, outerRadius, thickness, 32);
    
    // Bolt holes would be subtracted using CSG
    
    return geometry;
  }

  private static generateCoupling(params: ModelGenerationParams): BufferGeometry {
    const outerRadius = params.dimensions.x / 2;
    const length = params.dimensions.y;
    const innerRadius = params.parameters?.innerRadius || outerRadius * 0.3;

    return new CylinderGeometry(outerRadius, outerRadius, length, 32);
  }

  private static generatePulley(params: ModelGenerationParams): BufferGeometry {
    const outerRadius = params.dimensions.x / 2;
    const thickness = params.dimensions.z;
    const grooveDepth = params.parameters?.grooveDepth || outerRadius * 0.1;
    const grooveWidth = params.parameters?.grooveWidth || thickness * 0.3;

    const group = new Group();

    // Main pulley body
    const bodyGeometry = new CylinderGeometry(outerRadius, outerRadius, thickness, 32);
    const bodyMesh = new Mesh(bodyGeometry);
    group.add(bodyMesh);

    // Groove (simplified)
    const grooveGeometry = new CylinderGeometry(
      outerRadius - grooveDepth,
      outerRadius - grooveDepth,
      grooveWidth,
      32
    );
    const grooveMesh = new Mesh(grooveGeometry);
    group.add(grooveMesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || bodyGeometry;
  }

  // Electronic Components
  private static generateResistor(params: ModelGenerationParams): BufferGeometry {
    const length = params.dimensions.x;
    const radius = params.dimensions.y / 2;
    
    const group = new Group();

    // Body
    const bodyGeometry = new CylinderGeometry(radius, radius, length * 0.8, 16);
    const bodyMesh = new Mesh(bodyGeometry);
    bodyMesh.rotateZ(Math.PI / 2);
    group.add(bodyMesh);

    // Leads
    const leadRadius = radius * 0.1;
    const leadLength = length * 0.1;
    
    const lead1Geometry = new CylinderGeometry(leadRadius, leadRadius, leadLength, 8);
    const lead1Mesh = new Mesh(lead1Geometry);
    lead1Mesh.position.set(-length / 2 + leadLength / 2, 0, 0);
    lead1Mesh.rotateZ(Math.PI / 2);
    group.add(lead1Mesh);

    const lead2Geometry = new CylinderGeometry(leadRadius, leadRadius, leadLength, 8);
    const lead2Mesh = new Mesh(lead2Geometry);
    lead2Mesh.position.set(length / 2 - leadLength / 2, 0, 0);
    lead2Mesh.rotateZ(Math.PI / 2);
    group.add(lead2Mesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || bodyGeometry;
  }

  private static generateCapacitor(params: ModelGenerationParams): BufferGeometry {
    const radius = params.dimensions.x / 2;
    const height = params.dimensions.y;
    
    return new CylinderGeometry(radius, radius, height, 16);
  }

  private static generateInductor(params: ModelGenerationParams): BufferGeometry {
    const radius = params.dimensions.x / 2;
    const height = params.dimensions.y;
    const turns = params.parameters?.turns || 10;

    // Create a toroidal inductor
    const torusRadius = radius * 0.8;
    const tubeRadius = radius * 0.2;
    
    return new TorusGeometry(torusRadius, tubeRadius, 8, 16);
  }

  private static generateIC(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const thickness = params.dimensions.z;
    const pins = params.parameters?.pins || 8;

    const group = new Group();

    // Main body
    const bodyGeometry = new BoxGeometry(width, height, thickness);
    const bodyMesh = new Mesh(bodyGeometry);
    group.add(bodyMesh);

    // Pins
    const pinWidth = width / (pins / 2 + 1);
    const pinThickness = thickness * 0.1;
    const pinLength = height * 0.2;

    for (let i = 0; i < pins / 2; i++) {
      // Left side pins
      const leftPinGeometry = new BoxGeometry(pinLength, pinWidth * 0.8, pinThickness);
      const leftPinMesh = new Mesh(leftPinGeometry);
      leftPinMesh.position.set(
        -width / 2 - pinLength / 2,
        -height / 2 + (i + 1) * (height / (pins / 2 + 1)),
        0
      );
      group.add(leftPinMesh);

      // Right side pins
      const rightPinGeometry = new BoxGeometry(pinLength, pinWidth * 0.8, pinThickness);
      const rightPinMesh = new Mesh(rightPinGeometry);
      rightPinMesh.position.set(
        width / 2 + pinLength / 2,
        -height / 2 + (i + 1) * (height / (pins / 2 + 1)),
        0
      );
      group.add(rightPinMesh);
    }

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

    return BufferGeometryUtils.mergeGeometries(geometries) || bodyGeometry;
  }

  private static generateConnector(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const depth = params.dimensions.z;
    const pins = params.parameters?.pins || 2;

    return new BoxGeometry(width, height, depth);
  }

  private static generateLED(params: ModelGenerationParams): BufferGeometry {
    const radius = params.dimensions.x / 2;
    const height = params.dimensions.y;

    const group = new Group();

    // LED dome
    const domeGeometry = new SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new Mesh(domeGeometry);
    domeMesh.position.y = height / 2;
    group.add(domeMesh);

    // LED base
    const baseGeometry = new CylinderGeometry(radius, radius, height / 2, 16);
    const baseMesh = new Mesh(baseGeometry);
    baseMesh.position.y = height / 4;
    group.add(baseMesh);

    // Leads
    const leadRadius = radius * 0.05;
    const leadLength = height;
    
    const lead1Geometry = new CylinderGeometry(leadRadius, leadRadius, leadLength, 8);
    const lead1Mesh = new Mesh(lead1Geometry);
    lead1Mesh.position.set(-radius * 0.3, -leadLength / 2, 0);
    group.add(lead1Mesh);

    const lead2Geometry = new CylinderGeometry(leadRadius, leadRadius, leadLength);
    const lead2Mesh = new Mesh(lead2Geometry);
    lead2Mesh.position.set(radius * 0.3, -leadLength / 2, 0);
    group.add(lead2Mesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || domeGeometry;
  }

  private static generateSwitch(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const depth = params.dimensions.z;

    return new BoxGeometry(width, height, depth);
  }

  // Architectural Elements
  private static generateColumn(params: ModelGenerationParams): BufferGeometry {
    const radius = params.dimensions.x / 2;
    const height = params.dimensions.y;
    const flutes = params.parameters?.flutes || 0;

    if (flutes > 0) {
      // Fluted column
      const geometry = new CylinderGeometry(radius, radius, height, flutes * 2);
      
      // Modify vertices to create flutes
      const positions = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const angle = Math.atan2(z, x);
        const fluteIndex = Math.floor((angle + Math.PI) / (2 * Math.PI) * flutes);
        const isFlute = fluteIndex % 2 === 0;
        
        if (isFlute) {
          const currentRadius = Math.sqrt(x * x + z * z);
          const newRadius = currentRadius * 0.95;
          const scale = newRadius / currentRadius;
          positions[i] = x * scale;
          positions[i + 2] = z * scale;
        }
      }
      
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      
      return geometry;
    } else {
      return new CylinderGeometry(radius, radius, height, 32);
    }
  }

  private static generateBeam(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const length = params.dimensions.z;
    const profile = params.parameters?.profile || 'rectangular';

    switch (profile) {
      case 'i-beam':
        return this.generateIBeam(width, height, length);
      case 'h-beam':
        return this.generateHBeam(width, height, length);
      case 'l-beam':
        return this.generateLBeam(width, height, length);
      default:
        return new BoxGeometry(width, height, length);
    }
  }

  private static generateIBeam(width: number, height: number, length: number): BufferGeometry {
    const flangeThickness = height * 0.15;
    const webThickness = width * 0.1;

    const group = new Group();

    // Top flange
    const topFlangeGeometry = new BoxGeometry(width, flangeThickness, length);
    const topFlangeMesh = new Mesh(topFlangeGeometry);
    topFlangeMesh.position.y = height / 2 - flangeThickness / 2;
    group.add(topFlangeMesh);

    // Bottom flange
    const bottomFlangeGeometry = new BoxGeometry(width, flangeThickness, length);
    const bottomFlangeMesh = new Mesh(bottomFlangeGeometry);
    bottomFlangeMesh.position.y = -height / 2 + flangeThickness / 2;
    group.add(bottomFlangeMesh);

    // Web
    const webGeometry = new BoxGeometry(webThickness, height - 2 * flangeThickness, length);
    const webMesh = new Mesh(webGeometry);
    group.add(webMesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || new BoxGeometry(width, height, length);
  }

  private static generateHBeam(width: number, height: number, length: number): BufferGeometry {
    // Similar to I-beam but with wider flanges
    return this.generateIBeam(width, height, length);
  }

  private static generateLBeam(width: number, height: number, length: number): BufferGeometry {
    const thickness = Math.min(width, height) * 0.2;

    const group = new Group();

    // Vertical part
    const verticalGeometry = new BoxGeometry(thickness, height, length);
    const verticalMesh = new Mesh(verticalGeometry);
    verticalMesh.position.x = -width / 2 + thickness / 2;
    group.add(verticalMesh);

    // Horizontal part
    const horizontalGeometry = new BoxGeometry(width, thickness, length);
    const horizontalMesh = new Mesh(horizontalGeometry);
    horizontalMesh.position.y = -height / 2 + thickness / 2;
    group.add(horizontalMesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || new BoxGeometry(width, height, length);
  }

  private static generateWall(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const thickness = params.dimensions.z;

    return new BoxGeometry(width, height, thickness);
  }

  private static generateWindow(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const depth = params.dimensions.z;
    const frameThickness = params.parameters?.frameThickness || Math.min(width, height) * 0.05;

    const group = new Group();

    // Frame
    const frameGeometry = new BoxGeometry(width, height, depth);
    const frameMesh = new Mesh(frameGeometry);
    group.add(frameMesh);

    // Glass (would need CSG for proper cutout)
    const glassGeometry = new BoxGeometry(
      width - 2 * frameThickness,
      height - 2 * frameThickness,
      depth * 0.1
    );
    const glassMesh = new Mesh(glassGeometry);
    group.add(glassMesh);

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

    return BufferGeometryUtils.mergeGeometries(geometries) || frameGeometry;
  }

  private static generateDoor(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const height = params.dimensions.y;
    const thickness = params.dimensions.z;

    return new BoxGeometry(width, height, thickness);
  }

  private static generateStair(params: ModelGenerationParams): BufferGeometry {
    const width = params.dimensions.x;
    const totalHeight = params.dimensions.y;
    const totalDepth = params.dimensions.z;
    const steps = params.parameters?.steps || 10;

    const group = new Group();
    const stepHeight = totalHeight / steps;
    const stepDepth = totalDepth / steps;

    for (let i = 0; i < steps; i++) {
      const stepGeometry = new BoxGeometry(
        width,
        stepHeight,
        stepDepth * (steps - i)
      );
      const stepMesh = new Mesh(stepGeometry);
      stepMesh.position.set(
        0,
        -totalHeight / 2 + stepHeight * (i + 0.5),
        -totalDepth / 2 + stepDepth * (steps - i) / 2
      );
      group.add(stepMesh);
    }

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

    return BufferGeometryUtils.mergeGeometries(geometries) || new BoxGeometry(width, totalHeight, totalDepth);
  }
}

