export interface Command {
  type: string;
  objectId?: string;
  execute: () => void;
  undo: () => void;
  data?: any;
  timestamp: number;
  description?: string;
}

export interface HistoryState {
  commands: Command[];
  currentIndex: number;
  maxHistorySize: number;
}

export class HistoryManager {
  private commands: Command[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 100;
  private isExecuting: boolean = false;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  addCommand(command: Omit<Command, 'timestamp'>): void {
    if (this.isExecuting) return;

    const fullCommand: Command = {
      ...command,
      timestamp: Date.now()
    };

    // Remove any commands after current index (when adding new command after undo)
    if (this.currentIndex < this.commands.length - 1) {
      this.commands = this.commands.slice(0, this.currentIndex + 1);
    }

    // Add new command
    this.commands.push(fullCommand);
    this.currentIndex++;

    // Maintain history size limit
    if (this.commands.length > this.maxHistorySize) {
      this.commands.shift();
      this.currentIndex--;
    }

    // Execute the command
    this.isExecuting = true;
    try {
      fullCommand.execute();
    } catch (error) {
      console.error('Failed to execute command:', error);
      // Remove the failed command
      this.commands.pop();
      this.currentIndex--;
    } finally {
      this.isExecuting = false;
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const command = this.commands[this.currentIndex];
    this.isExecuting = true;

    try {
      command.undo();
      this.currentIndex--;
      return true;
    } catch (error) {
      console.error('Failed to undo command:', error);
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    const command = this.commands[this.currentIndex];
    this.isExecuting = true;

    try {
      command.execute();
      return true;
    } catch (error) {
      console.error('Failed to redo command:', error);
      this.currentIndex--;
      return false;
    } finally {
      this.isExecuting = false;
    }
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  getUndoCommand(): Command | null {
    if (!this.canUndo()) return null;
    return this.commands[this.currentIndex];
  }

  getRedoCommand(): Command | null {
    if (!this.canRedo()) return null;
    return this.commands[this.currentIndex + 1];
  }

  getHistory(): Command[] {
    return [...this.commands];
  }

  getHistoryState(): HistoryState {
    return {
      commands: [...this.commands],
      currentIndex: this.currentIndex,
      maxHistorySize: this.maxHistorySize
    };
  }

  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);
    
    // Trim history if necessary
    if (this.commands.length > this.maxHistorySize) {
      const trimCount = this.commands.length - this.maxHistorySize;
      this.commands = this.commands.slice(trimCount);
      this.currentIndex = Math.max(-1, this.currentIndex - trimCount);
    }
  }

  // Batch operations
  startBatch(description?: string): void {
    // Implementation for batching multiple commands into one
    // This would be useful for complex operations that should be undone as a single unit
  }

  endBatch(): void {
    // End batch operation
  }

  // Statistics
  getStatistics(): {
    totalCommands: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    memoryUsage: number;
  } {
    return {
      totalCommands: this.commands.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in bytes
    return this.commands.length * 1000; // Assume ~1KB per command
  }
}

