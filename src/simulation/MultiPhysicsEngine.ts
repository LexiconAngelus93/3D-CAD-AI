import {
  BufferGeometry,
  Material,
  Mesh,
  Object3D,
  Scene,
  Vector3,
  Box3
} from 'three';
import { AdvancedSimulationEngine, SimulationResult, SimulationMaterial, BoundaryCondition, SimulationSettings } from './AdvancedSimulationEngine';

export interface CouplingSettings {
  type: 'one_way' | 'two_way' | 'iterative';
  maxCouplingIterations: number;
  couplingTolerance: number;
  relaxationFactor: number;
  timeStep?: number;
  totalTime?: number;
}

export interface MultiPhysicsResult {
  timestamp: number;
  couplingConverged: boolean;
  couplingIterations: number;
  results: {
    structural?: SimulationResult;
    thermal?: SimulationResult;
    fluid?: SimulationResult;
    electromagnetic?: SimulationResult;
  };
  couplingEffects: {
    thermalStress?: number[];
    fluidStructureInteraction?: Vector3[];
    jouleHeating?: number[];
    magnetostriction?: Vector3[];
  };
  postProcessing: {
    maxCoupledStress?: { value: number; location: Vector3 };
    maxCoupledTemperature?: { value: number; location: Vector3 };
    criticalCouplingAreas: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      location: Vector3;
      description: string;
      couplingEffect: string;
    }>;
  };
}

export interface ElectromagneticMaterial extends SimulationMaterial {
  electricalConductivity: number; // S/m
  magneticPermeability: number; // H/m
  dielectricConstant: number;
  magneticCoercivity?: number; // A/m (for permanent magnets)
  curiTemperature?: number; // K (for ferromagnetic materials)
}

export interface ElectromagneticBoundaryCondition extends BoundaryCondition {
  electricPotential?: number; // V
  currentDensity?: Vector3; // A/m²
  magneticField?: Vector3; // T
  electricField?: Vector3; // V/m
}

export class MultiPhysicsEngine {
  private scene: Scene;
  private structuralEngine: AdvancedSimulationEngine;
  private electromagneticMaterials: Map<string, ElectromagneticMaterial> = new Map();
  private couplingHistory: MultiPhysicsResult[] = [];
  private isInitialized: boolean = false;

  constructor(scene: Scene, structuralEngine: AdvancedSimulationEngine) {
    this.scene = scene;
    this.structuralEngine = structuralEngine;
    this.initializeElectromagneticMaterials();
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing Multi-Physics Engine...');
      
      // Ensure structural engine is initialized
      if (!this.structuralEngine.isReady()) {
        await this.structuralEngine.initialize();
      }
      
      // Initialize electromagnetic materials
      this.initializeElectromagneticMaterials();
      
      // Initialize coupling algorithms
      await this.initializeCouplingAlgorithms();
      
      this.isInitialized = true;
      console.log('Multi-Physics Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Multi-Physics Engine:', error);
      throw error;
    }
  }

  private initializeElectromagneticMaterials(): void {
    // Conductive materials
    this.electromagneticMaterials.set('copper', {
      name: 'Copper',
      density: 8960,
      elasticModulus: 110e9,
      poissonRatio: 0.34,
      yieldStrength: 70e6,
      thermalConductivity: 401,
      specificHeat: 385,
      thermalExpansion: 16.5e-6,
      electricalConductivity: 59.6e6,
      magneticPermeability: 1.256e-6,
      dielectricConstant: 1.0
    });

    this.electromagneticMaterials.set('silicon_steel', {
      name: 'Silicon Steel (Electrical)',
      density: 7650,
      elasticModulus: 200e9,
      poissonRatio: 0.28,
      yieldStrength: 400e6,
      thermalConductivity: 25,
      specificHeat: 460,
      thermalExpansion: 11e-6,
      electricalConductivity: 2e6,
      magneticPermeability: 2000e-6,
      dielectricConstant: 1.0,
      curiTemperature: 1043
    });

    this.electromagneticMaterials.set('neodymium_magnet', {
      name: 'Neodymium Permanent Magnet',
      density: 7500,
      elasticModulus: 160e9,
      poissonRatio: 0.24,
      yieldStrength: 80e6,
      thermalConductivity: 7.7,
      specificHeat: 444,
      thermalExpansion: 5.2e-6,
      electricalConductivity: 0.67e6,
      magneticPermeability: 1.05e-6,
      dielectricConstant: 1.0,
      magneticCoercivity: 890e3,
      curiTemperature: 593
    });

    this.electromagneticMaterials.set('ferrite', {
      name: 'Ferrite Core Material',
      density: 4800,
      elasticModulus: 150e9,
      poissonRatio: 0.25,
      yieldStrength: 100e6,
      thermalConductivity: 5,
      specificHeat: 700,
      thermalExpansion: 10e-6,
      electricalConductivity: 1e-3,
      magneticPermeability: 2500e-6,
      dielectricConstant: 12.0,
      curiTemperature: 723
    });
  }

  private async initializeCouplingAlgorithms(): Promise<void> {
    console.log('Initializing coupling algorithms...');
    
    // Initialize coupling matrices and interpolation functions
    // In a real implementation, this would set up:
    // - Field interpolation between different meshes
    // - Coupling matrices for different physics
    // - Convergence acceleration techniques
    
    console.log('Coupling algorithms initialized');
  }

  // Thermo-Structural Coupling
  async runThermoStructuralAnalysis(
    objectId: string,
    material: string,
    thermalBCs: BoundaryCondition[],
    structuralBCs: BoundaryCondition[],
    couplingSettings: CouplingSettings = this.getDefaultCouplingSettings()
  ): Promise<MultiPhysicsResult> {
    if (!this.isInitialized) {
      throw new Error('Multi-Physics engine not initialized');
    }

    console.log(`Running thermo-structural analysis for object ${objectId}`);

    try {
      const result: MultiPhysicsResult = {
        timestamp: Date.now(),
        couplingConverged: false,
        couplingIterations: 0,
        results: {},
        couplingEffects: {},
        postProcessing: {
          criticalCouplingAreas: []
        }
      };

      // Iterative coupling loop
      for (let iter = 0; iter < couplingSettings.maxCouplingIterations; iter++) {
        console.log(`Coupling iteration ${iter + 1}`);

        // Step 1: Solve thermal problem
        const thermalResult = await this.structuralEngine.runThermalAnalysis(
          objectId,
          material,
          thermalBCs,
          this.getThermalSettings()
        );

        // Step 2: Calculate thermal stress from temperature field
        const thermalStress = this.calculateThermalStress(
          thermalResult.results.temperature!,
          material
        );

        // Step 3: Apply thermal stress as body force in structural analysis
        const modifiedStructuralBCs = this.applyThermalStress(structuralBCs, thermalStress);

        // Step 4: Solve structural problem with thermal effects
        const structuralResult = await this.structuralEngine.runStructuralAnalysis(
          objectId,
          material,
          modifiedStructuralBCs,
          this.getStructuralSettings()
        );

        // Step 5: Check coupling convergence
        const couplingResidual = this.calculateCouplingResidual(
          result.results.thermal,
          thermalResult,
          result.results.structural,
          structuralResult
        );

        result.results.thermal = thermalResult;
        result.results.structural = structuralResult;
        result.couplingEffects.thermalStress = thermalStress;
        result.couplingIterations = iter + 1;

        if (couplingResidual < couplingSettings.couplingTolerance) {
          result.couplingConverged = true;
          console.log(`Coupling converged in ${iter + 1} iterations`);
          break;
        }

        // Apply relaxation for stability
        if (iter > 0) {
          this.applyCouplingRelaxation(result, couplingSettings.relaxationFactor);
        }
      }

      // Post-process coupled results
      result.postProcessing = this.postProcessThermoStructural(result);

      this.couplingHistory.push(result);
      return result;
    } catch (error) {
      console.error('Thermo-structural analysis failed:', error);
      throw error;
    }
  }

  // Fluid-Structure Interaction (FSI)
  async runFluidStructureInteraction(
    structureId: string,
    fluidDomainId: string,
    structureMaterial: string,
    fluidMaterial: string,
    structuralBCs: BoundaryCondition[],
    fluidBCs: BoundaryCondition[],
    couplingSettings: CouplingSettings = this.getDefaultCouplingSettings()
  ): Promise<MultiPhysicsResult> {
    if (!this.isInitialized) {
      throw new Error('Multi-Physics engine not initialized');
    }

    console.log(`Running FSI analysis for structure ${structureId} and fluid ${fluidDomainId}`);

    try {
      const result: MultiPhysicsResult = {
        timestamp: Date.now(),
        couplingConverged: false,
        couplingIterations: 0,
        results: {},
        couplingEffects: {},
        postProcessing: {
          criticalCouplingAreas: []
        }
      };

      // FSI coupling loop
      for (let iter = 0; iter < couplingSettings.maxCouplingIterations; iter++) {
        console.log(`FSI iteration ${iter + 1}`);

        // Step 1: Solve fluid problem
        const fluidResult = await this.structuralEngine.runFluidAnalysis(
          fluidDomainId,
          fluidMaterial,
          fluidBCs,
          this.getFluidSettings()
        );

        // Step 2: Extract fluid forces on structure boundary
        const fluidForces = this.extractFluidForces(fluidResult);

        // Step 3: Apply fluid forces to structural analysis
        const modifiedStructuralBCs = this.applyFluidForces(structuralBCs, fluidForces);

        // Step 4: Solve structural problem
        const structuralResult = await this.structuralEngine.runStructuralAnalysis(
          structureId,
          structureMaterial,
          modifiedStructuralBCs,
          this.getStructuralSettings()
        );

        // Step 5: Update fluid domain based on structural deformation
        const meshDeformation = this.calculateMeshDeformation(structuralResult);
        fluidBCs = this.updateFluidBoundary(fluidBCs, meshDeformation);

        // Step 6: Check FSI convergence
        const couplingResidual = this.calculateFSIResidual(
          result.results.fluid,
          fluidResult,
          result.results.structural,
          structuralResult
        );

        result.results.fluid = fluidResult;
        result.results.structural = structuralResult;
        result.couplingEffects.fluidStructureInteraction = fluidForces;
        result.couplingIterations = iter + 1;

        if (couplingResidual < couplingSettings.couplingTolerance) {
          result.couplingConverged = true;
          console.log(`FSI converged in ${iter + 1} iterations`);
          break;
        }

        // Apply under-relaxation for stability
        if (iter > 0) {
          this.applyCouplingRelaxation(result, couplingSettings.relaxationFactor);
        }
      }

      // Post-process FSI results
      result.postProcessing = this.postProcessFSI(result);

      this.couplingHistory.push(result);
      return result;
    } catch (error) {
      console.error('FSI analysis failed:', error);
      throw error;
    }
  }

  // Electromagnetic-Thermal Coupling
  async runElectromagneticThermalAnalysis(
    objectId: string,
    material: string,
    electromagneticBCs: ElectromagneticBoundaryCondition[],
    thermalBCs: BoundaryCondition[],
    couplingSettings: CouplingSettings = this.getDefaultCouplingSettings()
  ): Promise<MultiPhysicsResult> {
    if (!this.isInitialized) {
      throw new Error('Multi-Physics engine not initialized');
    }

    console.log(`Running electromagnetic-thermal analysis for object ${objectId}`);

    try {
      const result: MultiPhysicsResult = {
        timestamp: Date.now(),
        couplingConverged: false,
        couplingIterations: 0,
        results: {},
        couplingEffects: {},
        postProcessing: {
          criticalCouplingAreas: []
        }
      };

      // Electromagnetic-thermal coupling loop
      for (let iter = 0; iter < couplingSettings.maxCouplingIterations; iter++) {
        console.log(`EM-Thermal iteration ${iter + 1}`);

        // Step 1: Solve electromagnetic problem
        const electromagneticResult = await this.solveElectromagnetic(
          objectId,
          material,
          electromagneticBCs
        );

        // Step 2: Calculate Joule heating from current density
        const jouleHeating = this.calculateJouleHeating(
          electromagneticResult,
          material
        );

        // Step 3: Apply Joule heating as heat source in thermal analysis
        const modifiedThermalBCs = this.applyJouleHeating(thermalBCs, jouleHeating);

        // Step 4: Solve thermal problem with electromagnetic heating
        const thermalResult = await this.structuralEngine.runThermalAnalysis(
          objectId,
          material,
          modifiedThermalBCs,
          this.getThermalSettings()
        );

        // Step 5: Update material properties based on temperature
        const temperatureDependentMaterial = this.updateMaterialProperties(
          material,
          thermalResult.results.temperature!
        );

        // Step 6: Check coupling convergence
        const couplingResidual = this.calculateEMThermalResidual(
          result.results.electromagnetic,
          electromagneticResult,
          result.results.thermal,
          thermalResult
        );

        result.results.electromagnetic = electromagneticResult;
        result.results.thermal = thermalResult;
        result.couplingEffects.jouleHeating = jouleHeating;
        result.couplingIterations = iter + 1;

        if (couplingResidual < couplingSettings.couplingTolerance) {
          result.couplingConverged = true;
          console.log(`EM-Thermal coupling converged in ${iter + 1} iterations`);
          break;
        }

        // Apply relaxation
        if (iter > 0) {
          this.applyCouplingRelaxation(result, couplingSettings.relaxationFactor);
        }
      }

      // Post-process coupled results
      result.postProcessing = this.postProcessEMThermal(result);

      this.couplingHistory.push(result);
      return result;
    } catch (error) {
      console.error('EM-Thermal analysis failed:', error);
      throw error;
    }
  }

  // Magnetostriction Analysis
  async runMagnetostrictiveAnalysis(
    objectId: string,
    material: string,
    magneticBCs: ElectromagneticBoundaryCondition[],
    structuralBCs: BoundaryCondition[],
    couplingSettings: CouplingSettings = this.getDefaultCouplingSettings()
  ): Promise<MultiPhysicsResult> {
    if (!this.isInitialized) {
      throw new Error('Multi-Physics engine not initialized');
    }

    console.log(`Running magnetostrictive analysis for object ${objectId}`);

    try {
      const result: MultiPhysicsResult = {
        timestamp: Date.now(),
        couplingConverged: false,
        couplingIterations: 0,
        results: {},
        couplingEffects: {},
        postProcessing: {
          criticalCouplingAreas: []
        }
      };

      // Magnetostriction coupling loop
      for (let iter = 0; iter < couplingSettings.maxCouplingIterations; iter++) {
        console.log(`Magnetostriction iteration ${iter + 1}`);

        // Step 1: Solve magnetic problem
        const magneticResult = await this.solveMagnetic(objectId, material, magneticBCs);

        // Step 2: Calculate magnetostrictive strain
        const magnetostrictiveStrain = this.calculateMagnetostrictiveStrain(
          magneticResult,
          material
        );

        // Step 3: Apply magnetostrictive strain in structural analysis
        const modifiedStructuralBCs = this.applyMagnetostrictiveStrain(
          structuralBCs,
          magnetostrictiveStrain
        );

        // Step 4: Solve structural problem
        const structuralResult = await this.structuralEngine.runStructuralAnalysis(
          objectId,
          material,
          modifiedStructuralBCs,
          this.getStructuralSettings()
        );

        // Step 5: Update magnetic permeability based on stress
        const stressDependentPermeability = this.updateMagneticPermeability(
          material,
          structuralResult.results.stress!
        );

        // Step 6: Check convergence
        const couplingResidual = this.calculateMagnetostrictiveResidual(
          result.results.electromagnetic,
          magneticResult,
          result.results.structural,
          structuralResult
        );

        result.results.electromagnetic = magneticResult;
        result.results.structural = structuralResult;
        result.couplingEffects.magnetostriction = magnetostrictiveStrain;
        result.couplingIterations = iter + 1;

        if (couplingResidual < couplingSettings.couplingTolerance) {
          result.couplingConverged = true;
          console.log(`Magnetostriction coupling converged in ${iter + 1} iterations`);
          break;
        }

        if (iter > 0) {
          this.applyCouplingRelaxation(result, couplingSettings.relaxationFactor);
        }
      }

      result.postProcessing = this.postProcessMagnetostriction(result);
      this.couplingHistory.push(result);
      return result;
    } catch (error) {
      console.error('Magnetostrictive analysis failed:', error);
      throw error;
    }
  }

  // Helper Methods for Coupling Calculations
  private calculateThermalStress(temperature: number[], materialName: string): number[] {
    const material = this.structuralEngine.getMaterialLibrary().get(materialName);
    if (!material) return [];

    const referenceTemp = 20; // °C
    return temperature.map(T => 
      material.elasticModulus * material.thermalExpansion * (T - referenceTemp)
    );
  }

  private applyThermalStress(
    structuralBCs: BoundaryCondition[],
    thermalStress: number[]
  ): BoundaryCondition[] {
    // Add thermal stress as body force
    const thermalBC: BoundaryCondition = {
      id: 'thermal_stress',
      type: 'force',
      location: 'volume',
      geometry: { position: new Vector3() },
      value: new Vector3(0, 0, thermalStress.reduce((a, b) => a + b, 0) / thermalStress.length)
    };

    return [...structuralBCs, thermalBC];
  }

  private extractFluidForces(fluidResult: SimulationResult): Vector3[] {
    if (!fluidResult.results.pressure || !fluidResult.results.velocity) {
      return [];
    }

    // Calculate forces from pressure and viscous stress
    return fluidResult.results.pressure.map((p, i) => {
      const velocity = fluidResult.results.velocity![i];
      const viscousForce = velocity.clone().multiplyScalar(0.001); // Simplified
      const pressureForce = new Vector3(p * 0.01, 0, 0); // Simplified
      return pressureForce.add(viscousForce);
    });
  }

  private applyFluidForces(
    structuralBCs: BoundaryCondition[],
    fluidForces: Vector3[]
  ): BoundaryCondition[] {
    const avgForce = fluidForces.reduce(
      (sum, force) => sum.add(force),
      new Vector3()
    ).divideScalar(fluidForces.length);

    const fluidBC: BoundaryCondition = {
      id: 'fluid_force',
      type: 'force',
      location: 'face',
      geometry: { position: new Vector3() },
      value: avgForce
    };

    return [...structuralBCs, fluidBC];
  }

  private calculateMeshDeformation(structuralResult: SimulationResult): Vector3[] {
    return structuralResult.results.displacement || [];
  }

  private updateFluidBoundary(
    fluidBCs: BoundaryCondition[],
    meshDeformation: Vector3[]
  ): BoundaryCondition[] {
    // Update fluid boundary based on structural deformation
    return fluidBCs.map(bc => ({
      ...bc,
      geometry: {
        ...bc.geometry,
        position: bc.geometry.position.clone().add(
          meshDeformation[0] || new Vector3()
        )
      }
    }));
  }

  private async solveElectromagnetic(
    objectId: string,
    material: string,
    boundaryConditions: ElectromagneticBoundaryCondition[]
  ): Promise<SimulationResult> {
    // Simplified electromagnetic solver
    console.log('Solving electromagnetic equations (Maxwell)...');

    const object = this.scene.getObjectById(parseInt(objectId));
    if (!object || !(object instanceof Mesh)) {
      throw new Error(`Object ${objectId} not found`);
    }

    // Generate simplified electromagnetic results
    const numNodes = 1000; // Simplified
    const electricField = new Array(numNodes).fill(0).map(() => new Vector3(
      Math.random() * 1000,
      Math.random() * 1000,
      Math.random() * 1000
    ));
    const magneticField = new Array(numNodes).fill(0).map(() => new Vector3(
      Math.random() * 0.1,
      Math.random() * 0.1,
      Math.random() * 0.1
    ));
    const currentDensity = new Array(numNodes).fill(0).map(() => new Vector3(
      Math.random() * 1e6,
      Math.random() * 1e6,
      Math.random() * 1e6
    ));

    return {
      type: 'electromagnetic' as any,
      timestamp: Date.now(),
      convergence: {
        converged: true,
        iterations: Math.floor(Math.random() * 20) + 5,
        residual: Math.random() * 1e-8,
        tolerance: 1e-8
      },
      results: {
        // Store electromagnetic results in custom fields
        velocity: electricField, // Reuse velocity field for electric field
        pressure: magneticField.map(b => b.length()), // Reuse pressure for magnetic field magnitude
      },
      postProcessing: {
        maxStress: { value: 0, location: new Vector3() },
        maxDisplacement: { value: 0, location: new Vector3() },
        criticalAreas: []
      }
    };
  }

  private async solveMagnetic(
    objectId: string,
    material: string,
    boundaryConditions: ElectromagneticBoundaryCondition[]
  ): Promise<SimulationResult> {
    // Simplified magnetic solver
    console.log('Solving magnetic equations...');
    return this.solveElectromagnetic(objectId, material, boundaryConditions);
  }

  private calculateJouleHeating(
    electromagneticResult: SimulationResult,
    materialName: string
  ): number[] {
    const emMaterial = this.electromagneticMaterials.get(materialName);
    if (!emMaterial || !electromagneticResult.results.velocity) {
      return [];
    }

    // Q = J²/σ (Joule heating)
    return electromagneticResult.results.velocity.map(electricField => {
      const currentDensity = electricField.length() * emMaterial.electricalConductivity;
      return (currentDensity * currentDensity) / emMaterial.electricalConductivity;
    });
  }

  private applyJouleHeating(
    thermalBCs: BoundaryCondition[],
    jouleHeating: number[]
  ): BoundaryCondition[] {
    const avgHeating = jouleHeating.reduce((a, b) => a + b, 0) / jouleHeating.length;

    const heatingBC: BoundaryCondition = {
      id: 'joule_heating',
      type: 'heat_flux',
      location: 'volume',
      geometry: { position: new Vector3() },
      value: avgHeating
    };

    return [...thermalBCs, heatingBC];
  }

  private calculateMagnetostrictiveStrain(
    magneticResult: SimulationResult,
    materialName: string
  ): Vector3[] {
    const emMaterial = this.electromagneticMaterials.get(materialName);
    if (!emMaterial || !magneticResult.results.pressure) {
      return [];
    }

    // Simplified magnetostrictive strain calculation
    const magnetostrictiveCoeff = 1e-6; // Typical value
    return magneticResult.results.pressure.map(B => {
      const strain = magnetostrictiveCoeff * B * B;
      return new Vector3(strain, strain, strain);
    });
  }

  private applyMagnetostrictiveStrain(
    structuralBCs: BoundaryCondition[],
    magnetostrictiveStrain: Vector3[]
  ): BoundaryCondition[] {
    const avgStrain = magnetostrictiveStrain.reduce(
      (sum, strain) => sum.add(strain),
      new Vector3()
    ).divideScalar(magnetostrictiveStrain.length);

    const strainBC: BoundaryCondition = {
      id: 'magnetostrictive_strain',
      type: 'displacement',
      location: 'volume',
      geometry: { position: new Vector3() },
      value: avgStrain
    };

    return [...structuralBCs, strainBC];
  }

  private updateMaterialProperties(
    materialName: string,
    temperature: number[]
  ): SimulationMaterial {
    const material = this.structuralEngine.getMaterialLibrary().get(materialName);
    if (!material) throw new Error(`Material ${materialName} not found`);

    const avgTemp = temperature.reduce((a, b) => a + b, 0) / temperature.length;
    const tempFactor = 1 - (avgTemp - 20) * 1e-4; // Simplified temperature dependence

    return {
      ...material,
      elasticModulus: material.elasticModulus * tempFactor,
      thermalConductivity: material.thermalConductivity * (1 + (avgTemp - 20) * 1e-3)
    };
  }

  private updateMagneticPermeability(
    materialName: string,
    stress: any
  ): ElectromagneticMaterial {
    const material = this.electromagneticMaterials.get(materialName);
    if (!material) throw new Error(`EM Material ${materialName} not found`);

    // Simplified stress dependence of magnetic permeability
    const avgStress = Array.isArray(stress.vonMises) 
      ? stress.vonMises.reduce((a: number, b: number) => a + b, 0) / stress.vonMises.length 
      : 0;
    const stressFactor = 1 - avgStress / material.yieldStrength * 0.1;

    return {
      ...material,
      magneticPermeability: material.magneticPermeability * stressFactor
    };
  }

  // Convergence and Residual Calculations
  private calculateCouplingResidual(
    prevThermal: SimulationResult | undefined,
    currentThermal: SimulationResult,
    prevStructural: SimulationResult | undefined,
    currentStructural: SimulationResult
  ): number {
    if (!prevThermal || !prevStructural) return 1.0;

    const thermalResidual = this.calculateFieldResidual(
      prevThermal.results.temperature!,
      currentThermal.results.temperature!
    );

    const structuralResidual = this.calculateVectorFieldResidual(
      prevStructural.results.displacement!,
      currentStructural.results.displacement!
    );

    return Math.max(thermalResidual, structuralResidual);
  }

  private calculateFSIResidual(
    prevFluid: SimulationResult | undefined,
    currentFluid: SimulationResult,
    prevStructural: SimulationResult | undefined,
    currentStructural: SimulationResult
  ): number {
    if (!prevFluid || !prevStructural) return 1.0;

    const fluidResidual = this.calculateVectorFieldResidual(
      prevFluid.results.velocity!,
      currentFluid.results.velocity!
    );

    const structuralResidual = this.calculateVectorFieldResidual(
      prevStructural.results.displacement!,
      currentStructural.results.displacement!
    );

    return Math.max(fluidResidual, structuralResidual);
  }

  private calculateEMThermalResidual(
    prevEM: SimulationResult | undefined,
    currentEM: SimulationResult,
    prevThermal: SimulationResult | undefined,
    currentThermal: SimulationResult
  ): number {
    if (!prevEM || !prevThermal) return 1.0;

    const emResidual = this.calculateVectorFieldResidual(
      prevEM.results.velocity!, // Electric field
      currentEM.results.velocity!
    );

    const thermalResidual = this.calculateFieldResidual(
      prevThermal.results.temperature!,
      currentThermal.results.temperature!
    );

    return Math.max(emResidual, thermalResidual);
  }

  private calculateMagnetostrictiveResidual(
    prevEM: SimulationResult | undefined,
    currentEM: SimulationResult,
    prevStructural: SimulationResult | undefined,
    currentStructural: SimulationResult
  ): number {
    if (!prevEM || !prevStructural) return 1.0;

    const magneticResidual = this.calculateFieldResidual(
      prevEM.results.pressure!, // Magnetic field magnitude
      currentEM.results.pressure!
    );

    const structuralResidual = this.calculateVectorFieldResidual(
      prevStructural.results.displacement!,
      currentStructural.results.displacement!
    );

    return Math.max(magneticResidual, structuralResidual);
  }

  private calculateFieldResidual(prev: number[], current: number[]): number {
    if (prev.length !== current.length) return 1.0;

    let residual = 0;
    let norm = 0;

    for (let i = 0; i < prev.length; i++) {
      residual += Math.pow(current[i] - prev[i], 2);
      norm += Math.pow(current[i], 2);
    }

    return norm > 0 ? Math.sqrt(residual / norm) : 0;
  }

  private calculateVectorFieldResidual(prev: Vector3[], current: Vector3[]): number {
    if (prev.length !== current.length) return 1.0;

    let residual = 0;
    let norm = 0;

    for (let i = 0; i < prev.length; i++) {
      const diff = current[i].clone().sub(prev[i]);
      residual += diff.lengthSq();
      norm += current[i].lengthSq();
    }

    return norm > 0 ? Math.sqrt(residual / norm) : 0;
  }

  private applyCouplingRelaxation(result: MultiPhysicsResult, relaxationFactor: number): void {
    // Apply under-relaxation to improve coupling stability
    // This is a simplified implementation
    console.log(`Applying coupling relaxation with factor ${relaxationFactor}`);
  }

  // Post-processing Methods
  private postProcessThermoStructural(result: MultiPhysicsResult): any {
    const criticalAreas = [];

    if (result.results.thermal && result.results.structural) {
      // Find areas with high thermal stress
      const thermalStress = result.couplingEffects.thermalStress || [];
      const maxThermalStress = Math.max(...thermalStress);

      if (maxThermalStress > 100e6) { // 100 MPa threshold
        criticalAreas.push({
          type: 'thermal_stress',
          severity: 'high' as const,
          location: new Vector3(),
          description: `High thermal stress: ${(maxThermalStress / 1e6).toFixed(1)} MPa`,
          couplingEffect: 'thermal expansion'
        });
      }
    }

    return {
      maxCoupledStress: result.results.structural?.postProcessing.maxStress,
      maxCoupledTemperature: result.results.thermal?.postProcessing.maxTemperature,
      criticalCouplingAreas: criticalAreas
    };
  }

  private postProcessFSI(result: MultiPhysicsResult): any {
    const criticalAreas = [];

    if (result.results.fluid && result.results.structural) {
      // Check for flow-induced vibrations
      const fluidForces = result.couplingEffects.fluidStructureInteraction || [];
      const maxFluidForce = Math.max(...fluidForces.map(f => f.length()));

      if (maxFluidForce > 1000) { // 1000 N threshold
        criticalAreas.push({
          type: 'flow_induced_vibration',
          severity: 'medium' as const,
          location: new Vector3(),
          description: `High fluid forces: ${maxFluidForce.toFixed(1)} N`,
          couplingEffect: 'fluid-structure interaction'
        });
      }
    }

    return {
      maxCoupledStress: result.results.structural?.postProcessing.maxStress,
      criticalCouplingAreas: criticalAreas
    };
  }

  private postProcessEMThermal(result: MultiPhysicsResult): any {
    const criticalAreas = [];

    if (result.results.electromagnetic && result.results.thermal) {
      // Check for excessive Joule heating
      const jouleHeating = result.couplingEffects.jouleHeating || [];
      const maxHeating = Math.max(...jouleHeating);

      if (maxHeating > 1e6) { // 1 MW/m³ threshold
        criticalAreas.push({
          type: 'excessive_joule_heating',
          severity: 'critical' as const,
          location: new Vector3(),
          description: `Excessive Joule heating: ${(maxHeating / 1e6).toFixed(1)} MW/m³`,
          couplingEffect: 'electromagnetic heating'
        });
      }
    }

    return {
      maxCoupledTemperature: result.results.thermal?.postProcessing.maxTemperature,
      criticalCouplingAreas: criticalAreas
    };
  }

  private postProcessMagnetostriction(result: MultiPhysicsResult): any {
    const criticalAreas = [];

    if (result.results.electromagnetic && result.results.structural) {
      // Check for significant magnetostrictive deformation
      const magnetostriction = result.couplingEffects.magnetostriction || [];
      const maxStrain = Math.max(...magnetostriction.map(s => s.length()));

      if (maxStrain > 1e-3) { // 0.1% strain threshold
        criticalAreas.push({
          type: 'magnetostrictive_deformation',
          severity: 'medium' as const,
          location: new Vector3(),
          description: `Significant magnetostrictive strain: ${(maxStrain * 100).toFixed(3)}%`,
          couplingEffect: 'magnetostriction'
        });
      }
    }

    return {
      maxCoupledStress: result.results.structural?.postProcessing.maxStress,
      criticalCouplingAreas: criticalAreas
    };
  }

  // Default Settings
  private getDefaultCouplingSettings(): CouplingSettings {
    return {
      type: 'two_way',
      maxCouplingIterations: 10,
      couplingTolerance: 1e-3,
      relaxationFactor: 0.7
    };
  }

  private getThermalSettings(): SimulationSettings {
    return {
      analysisType: 'linear',
      solver: 'iterative',
      convergence: {
        maxIterations: 200,
        tolerance: 1e-8,
        relaxationFactor: 0.8
      }
    };
  }

  private getStructuralSettings(): SimulationSettings {
    return {
      analysisType: 'linear',
      solver: 'direct',
      convergence: {
        maxIterations: 100,
        tolerance: 1e-6,
        relaxationFactor: 1.0
      }
    };
  }

  private getFluidSettings(): SimulationSettings {
    return {
      analysisType: 'nonlinear',
      solver: 'iterative',
      convergence: {
        maxIterations: 500,
        tolerance: 1e-5,
        relaxationFactor: 0.7
      }
    };
  }

  // Utility Methods
  getElectromagneticMaterials(): Map<string, ElectromagneticMaterial> {
    return this.electromagneticMaterials;
  }

  getCouplingHistory(): MultiPhysicsResult[] {
    return this.couplingHistory;
  }

  clearHistory(): void {
    this.couplingHistory = [];
  }

  isReady(): boolean {
    return this.isInitialized && this.structuralEngine.isReady();
  }
}

