import {
   Vector2 
} from 'three';

export interface Constraint {
  id: string;
  type: 'distance' | 'angle' | 'parallel' | 'perpendicular' | 'tangent' | 'coincident' | 'horizontal' | 'vertical';
  entities: string[];
  value?: number;
  tolerance: number;
  priority: number;
  satisfied: boolean;
}

export interface GeometricEntity {
  id: string;
  type: 'point' | 'line' | 'arc' | 'circle';
  parameters: number[];
  fixed: boolean;
}

export interface SolverResult {
  success: boolean;
  iterations: number;
  residual: number;
  entities: Map<string, GeometricEntity>;
  errors: string[];
}

export class ConstraintSolver {
  private entities: Map<string, GeometricEntity> = new Map();
  private constraints: Map<string, Constraint> = new Map();
  private maxIterations: number = 100;
  private tolerance: number = 1e-6;
  private dampingFactor: number = 0.5;

  constructor() {
    console.log('Constraint Solver initialized');
  }

  // Entity Management
  addEntity(entity: GeometricEntity): void {
    this.entities.set(entity.id, { ...entity });
  }

  removeEntity(id: string): boolean {
    // Remove all constraints that reference this entity
    const constraintsToRemove: string[] = [];
    this.constraints.forEach((constraint, constraintId) => {
      if (constraint.entities.includes(id)) {
        constraintsToRemove.push(constraintId);
      }
    });

    constraintsToRemove.forEach(constraintId => {
      this.constraints.delete(constraintId);
    });

    return this.entities.delete(id);
  }

  getEntity(id: string): GeometricEntity | undefined {
    return this.entities.get(id);
  }

  updateEntity(id: string, parameters: number[]): void {
    const entity = this.entities.get(id);
    if (entity && !entity.fixed) {
      entity.parameters = [...parameters];
    }
  }

  // Constraint Management
  addConstraint(constraint: Constraint): void {
    // Validate that all referenced entities exist
    for (const entityId of constraint.entities) {
      if (!this.entities.has(entityId)) {
        throw new Error(`Entity ${entityId} not found`);
      }
    }

    this.constraints.set(constraint.id, { ...constraint });
  }

  removeConstraint(id: string): boolean {
    return this.constraints.delete(id);
  }

  getConstraint(id: string): Constraint | undefined {
    return this.constraints.get(id);
  }

  getAllConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  // Solver Methods
  solve(): SolverResult {
    const result: SolverResult = {
      success: false,
      iterations: 0,
      residual: Infinity,
      entities: new Map(this.entities),
      errors: []
    };

    try {
      // Check for over-constrained system
      if (this.isOverConstrained()) {
        result.errors.push('System is over-constrained');
        return result;
      }

      // Check for under-constrained system
      if (this.isUnderConstrained()) {
        result.errors.push('System is under-constrained');
      }

      // Newton-Raphson iteration
      for (let iteration = 0; iteration < this.maxIterations; iteration++) {
        result.iterations = iteration + 1;

        const residual = this.calculateResidual();
        result.residual = residual;

        if (residual < this.tolerance) {
          result.success = true;
          break;
        }

        // Calculate Jacobian matrix
        const jacobian = this.calculateJacobian();
        const residualVector = this.calculateResidualVector();

        // Solve linear system: J * delta = -residual
        const delta = this.solveLinearSystem(jacobian, residualVector);

        if (!delta) {
          result.errors.push('Failed to solve linear system');
          break;
        }

        // Update parameters with damping
        this.updateParameters(delta);
      }

      // Update constraint satisfaction status
      this.updateConstraintStatus();

      // Copy final entity states
      result.entities = new Map(this.entities);

    } catch (error) {
      result.errors.push(`Solver error: ${error}`);
    }

    return result;
  }

  private isOverConstrained(): boolean {
    const dof = this.calculateDegreesOfFreedom();
    const constraintCount = this.constraints.size;
    return constraintCount > dof;
  }

  private isUnderConstrained(): boolean {
    const dof = this.calculateDegreesOfFreedom();
    const constraintCount = this.constraints.size;
    return constraintCount < dof;
  }

  private calculateDegreesOfFreedom(): number {
    let dof = 0;
    this.entities.forEach(entity => {
      if (!entity.fixed) {
        switch (entity.type) {
          case 'point':
            dof += 2; // x, y
            break;
          case 'line':
            dof += 4; // start point (x, y) + end point (x, y)
            break;
          case 'arc':
            dof += 5; // center (x, y) + radius + start angle + end angle
            break;
          case 'circle':
            dof += 3; // center (x, y) + radius
            break;
        }
      }
    });
    return dof;
  }

  private calculateResidual(): number {
    let totalResidual = 0;
    
    this.constraints.forEach(constraint => {
      const residual = this.evaluateConstraint(constraint);
      totalResidual += residual * residual;
    });

    return Math.sqrt(totalResidual);
  }

  private evaluateConstraint(constraint: Constraint): number {
    switch (constraint.type) {
      case 'distance':
        return this.evaluateDistanceConstraint(constraint);
      case 'angle':
        return this.evaluateAngleConstraint(constraint);
      case 'parallel':
        return this.evaluateParallelConstraint(constraint);
      case 'perpendicular':
        return this.evaluatePerpendicularConstraint(constraint);
      case 'coincident':
        return this.evaluateCoincidentConstraint(constraint);
      case 'horizontal':
        return this.evaluateHorizontalConstraint(constraint);
      case 'vertical':
        return this.evaluateVerticalConstraint(constraint);
      default:
        return 0;
    }
  }

  private evaluateDistanceConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 2 || constraint.value === undefined) {
      return 0;
    }

    const entity1 = this.entities.get(constraint.entities[0]);
    const entity2 = this.entities.get(constraint.entities[1]);

    if (!entity1 || !entity2) return 0;

    const point1 = this.getEntityPoint(entity1);
    const point2 = this.getEntityPoint(entity2);

    const actualDistance = point1.distanceTo(point2);
    return actualDistance - constraint.value;
  }

  private evaluateAngleConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 2 || constraint.value === undefined) {
      return 0;
    }

    const entity1 = this.entities.get(constraint.entities[0]);
    const entity2 = this.entities.get(constraint.entities[1]);

    if (!entity1 || !entity2) return 0;

    const direction1 = this.getEntityDirection(entity1);
    const direction2 = this.getEntityDirection(entity2);

    const actualAngle = direction1.angleTo(direction2);
    const targetAngle = (constraint.value * Math.PI) / 180; // Convert to radians

    return actualAngle - targetAngle;
  }

  private evaluateParallelConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 2) return 0;

    const entity1 = this.entities.get(constraint.entities[0]);
    const entity2 = this.entities.get(constraint.entities[1]);

    if (!entity1 || !entity2) return 0;

    const direction1 = this.getEntityDirection(entity1);
    const direction2 = this.getEntityDirection(entity2);

    // For parallel lines, cross product should be zero
    const cross = direction1.cross(direction2);
    return cross.length();
  }

  private evaluatePerpendicularConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 2) return 0;

    const entity1 = this.entities.get(constraint.entities[0]);
    const entity2 = this.entities.get(constraint.entities[1]);

    if (!entity1 || !entity2) return 0;

    const direction1 = this.getEntityDirection(entity1);
    const direction2 = this.getEntityDirection(entity2);

    // For perpendicular lines, dot product should be zero
    return direction1.dot(direction2);
  }

  private evaluateCoincidentConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 2) return 0;

    const entity1 = this.entities.get(constraint.entities[0]);
    const entity2 = this.entities.get(constraint.entities[1]);

    if (!entity1 || !entity2) return 0;

    const point1 = this.getEntityPoint(entity1);
    const point2 = this.getEntityPoint(entity2);

    return point1.distanceTo(point2);
  }

  private evaluateHorizontalConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 1) return 0;

    const entity = this.entities.get(constraint.entities[0]);
    if (!entity) return 0;

    const direction = this.getEntityDirection(entity);
    return direction.y; // Y component should be zero for horizontal
  }

  private evaluateVerticalConstraint(constraint: Constraint): number {
    if (constraint.entities.length !== 1) return 0;

    const entity = this.entities.get(constraint.entities[0]);
    if (!entity) return 0;

    const direction = this.getEntityDirection(entity);
    return direction.x; // X component should be zero for vertical
  }

  private getEntityPoint(entity: GeometricEntity): Vector2 {
    switch (entity.type) {
      case 'point':
        return new Vector2(entity.parameters[0], entity.parameters[1]);
      case 'line':
        // Return start point
        return new Vector2(entity.parameters[0], entity.parameters[1]);
      case 'circle':
      case 'arc':
        // Return center point
        return new Vector2(entity.parameters[0], entity.parameters[1]);
      default:
        return new Vector2(0, 0);
    }
  }

  private getEntityDirection(entity: GeometricEntity): Vector2 {
    switch (entity.type) {
      case 'line':
        const start = new Vector2(entity.parameters[0], entity.parameters[1]);
        const end = new Vector2(entity.parameters[2], entity.parameters[3]);
        return end.sub(start).normalize();
      default:
        return new Vector2(1, 0);
    }
  }

  private calculateJacobian(): number[][] {
    const variableCount = this.getVariableCount();
    const constraintCount = this.constraints.size;
    const jacobian: number[][] = [];

    // Initialize jacobian matrix
    for (let i = 0; i < constraintCount; i++) {
      jacobian[i] = new Array(variableCount).fill(0);
    }

    let constraintIndex = 0;
    this.constraints.forEach(constraint => {
      const derivatives = this.calculateConstraintDerivatives(constraint);
      let variableIndex = 0;

      this.entities.forEach(entity => {
        if (!entity.fixed) {
          const entityDerivatives = derivatives.get(entity.id) || [];
          for (let i = 0; i < entityDerivatives.length; i++) {
            jacobian[constraintIndex][variableIndex + i] = entityDerivatives[i];
          }
          variableIndex += this.getEntityParameterCount(entity);
        }
      });

      constraintIndex++;
    });

    return jacobian;
  }

  private calculateConstraintDerivatives(constraint: Constraint): Map<string, number[]> {
    const derivatives = new Map<string, number[]>();
    const epsilon = 1e-8;

    constraint.entities.forEach(entityId => {
      const entity = this.entities.get(entityId);
      if (!entity || entity.fixed) return;

      const entityDerivatives: number[] = [];
      const originalValue = this.evaluateConstraint(constraint);

      for (let i = 0; i < entity.parameters.length; i++) {
        // Finite difference approximation
        entity.parameters[i] += epsilon;
        const perturbedValue = this.evaluateConstraint(constraint);
        entity.parameters[i] -= epsilon;

        const derivative = (perturbedValue - originalValue) / epsilon;
        entityDerivatives.push(derivative);
      }

      derivatives.set(entityId, entityDerivatives);
    });

    return derivatives;
  }

  private calculateResidualVector(): number[] {
    const residuals: number[] = [];
    this.constraints.forEach(constraint => {
      residuals.push(this.evaluateConstraint(constraint));
    });
    return residuals;
  }

  private solveLinearSystem(jacobian: number[][], residual: number[]): number[] | null {
    // Simple Gaussian elimination (would use more robust method in production)
    const n = jacobian.length;
    const m = jacobian[0].length;

    if (n === 0 || m === 0) return null;

    // Create augmented matrix
    const augmented: number[][] = [];
    for (let i = 0; i < n; i++) {
      augmented[i] = [...jacobian[i], -residual[i]];
    }

    // Forward elimination
    for (let i = 0; i < Math.min(n, m); i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Check for zero pivot
      if (Math.abs(augmented[i][i]) < 1e-12) {
        continue;
      }

      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= m; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const solution = new Array(m).fill(0);
    for (let i = Math.min(n, m) - 1; i >= 0; i--) {
      if (Math.abs(augmented[i][i]) < 1e-12) continue;

      solution[i] = augmented[i][m];
      for (let j = i + 1; j < m; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }

    return solution;
  }

  private updateParameters(delta: number[]): void {
    let deltaIndex = 0;

    this.entities.forEach(entity => {
      if (!entity.fixed) {
        const paramCount = this.getEntityParameterCount(entity);
        for (let i = 0; i < paramCount; i++) {
          entity.parameters[i] += this.dampingFactor * delta[deltaIndex + i];
        }
        deltaIndex += paramCount;
      }
    });
  }

  private updateConstraintStatus(): void {
    this.constraints.forEach(constraint => {
      const residual = Math.abs(this.evaluateConstraint(constraint));
      constraint.satisfied = residual < constraint.tolerance;
    });
  }

  private getVariableCount(): number {
    let count = 0;
    this.entities.forEach(entity => {
      if (!entity.fixed) {
        count += this.getEntityParameterCount(entity);
      }
    });
    return count;
  }

  private getEntityParameterCount(entity: GeometricEntity): number {
    switch (entity.type) {
      case 'point':
        return 2; // x, y
      case 'line':
        return 4; // start x, start y, end x, end y
      case 'circle':
        return 3; // center x, center y, radius
      case 'arc':
        return 5; // center x, center y, radius, start angle, end angle
      default:
        return 0;
    }
  }

  // Utility Methods
  clear(): void {
    this.entities.clear();
    this.constraints.clear();
  }

  getStatistics(): { entityCount: number; constraintCount: number; dof: number } {
    return {
      entityCount: this.entities.size,
      constraintCount: this.constraints.size,
      dof: this.calculateDegreesOfFreedom()
    };
  }

  // Configuration
  setMaxIterations(iterations: number): void {
    this.maxIterations = Math.max(1, iterations);
  }

  setTolerance(tolerance: number): void {
    this.tolerance = Math.max(1e-12, tolerance);
  }

  setDampingFactor(factor: number): void {
    this.dampingFactor = Math.max(0.1, Math.min(1.0, factor));
  }
}

