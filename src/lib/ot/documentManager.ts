import { EventEmitter } from 'events';
import { 
  Operation, 
  DocumentState, 
  TransformContext, 
  ApplyResult, 
  UndoableOperation,
  ConflictResolution 
} from './types';
import { OTEngine } from './core';
import { operationUtils } from './utils';

/**
 * Document Manager for Real-time Collaborative Editing
 * Coordinates operational transformation with Socket.io for live collaboration
 */
export class DocumentManager extends EventEmitter {
  private documentState: DocumentState;
  private pendingOperations: Map<string, Operation> = new Map();
  private undoStack: UndoableOperation[] = [];
  private redoStack: UndoableOperation[] = [];
  private isConnected: boolean = false;
  private conflictResolution: ConflictResolution = 'last-write-wins';

  constructor(
    initialState: DocumentState,
    conflictResolution: ConflictResolution = 'last-write-wins'
  ) {
    super();
    this.documentState = initialState;
    this.conflictResolution = conflictResolution;
  }

  /**
   * Apply a local operation (from this user)
   * Operations are applied optimistically and sent to server
   */
  applyLocalOperation(operation: Operation): boolean {
    try {
      // Store for undo functionality
      const inverse = OTEngine.invert(operation);
      if (inverse) {
        this.undoStack.push({ operation, inverse, timestamp: operation.timestamp });
        this.redoStack = []; // Clear redo stack on new operation
      }

      // Apply optimistically to local state
      const result = OTEngine.apply(this.documentState, operation);
      if (!result.success) {
        console.error('Failed to apply local operation:', result.error);
        return false;
      }

      this.documentState = result.newState!;
      
      // Add to pending operations for conflict resolution
      this.pendingOperations.set(operation.id, operation);

      // Emit local change
      this.emit('localChange', {
        operation,
        newState: this.documentState
      });

      // Send to server if connected
      if (this.isConnected) {
        this.emit('sendToServer', operation);
      }

      return true;
    } catch (error) {
      console.error('Error applying local operation:', error);
      return false;
    }
  }

  /**
   * Apply a remote operation (from another user)
   * Must be transformed against pending local operations
   */
  applyRemoteOperation(remoteOperation: Operation): boolean {
    try {
      let transformedOp = remoteOperation;

      // Transform against all pending local operations
      for (const [opId, localOp] of this.pendingOperations) {
        const context: TransformContext = {
          concurrent: true,
          priority: this.conflictResolution === 'client-wins' ? 'client' : 'server'
        };

        const result = OTEngine.transform(localOp, transformedOp, context);
        
        if (result.op2Prime) {
          transformedOp = result.op2Prime;
        } else {
          // Remote operation was cancelled by transformation
          console.log('Remote operation cancelled by transformation:', remoteOperation.id);
          return false;
        }

        // Update local operation if it was transformed
        if (result.op1Prime && result.op1Prime !== localOp) {
          this.pendingOperations.set(opId, result.op1Prime);
        } else if (!result.op1Prime) {
          // Local operation was cancelled
          this.pendingOperations.delete(opId);
        }
      }

      // Apply the transformed remote operation
      const result = OTEngine.apply(this.documentState, transformedOp);
      if (!result.success) {
        console.error('Failed to apply remote operation:', result.error);
        return false;
      }

      this.documentState = result.newState!;

      // Emit remote change
      this.emit('remoteChange', {
        operation: transformedOp,
        originalOperation: remoteOperation,
        newState: this.documentState
      });

      return true;
    } catch (error) {
      console.error('Error applying remote operation:', error);
      return false;
    }
  }

  /**
   * Acknowledge that a local operation has been accepted by the server
   */
  acknowledgeOperation(operationId: string): void {
    if (this.pendingOperations.has(operationId)) {
      this.pendingOperations.delete(operationId);
      
      this.emit('operationAcknowledged', {
        operationId,
        pendingCount: this.pendingOperations.size
      });
    }
  }

  /**
   * Handle server rejection of a local operation
   */
  rejectOperation(operationId: string, reason?: string): void {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) return;

    this.pendingOperations.delete(operationId);

    // Try to revert the operation
    const inverse = OTEngine.invert(operation);
    if (inverse) {
      const result = OTEngine.apply(this.documentState, inverse);
      if (result.success) {
        this.documentState = result.newState!;
      }
    }

    this.emit('operationRejected', {
      operationId,
      operation,
      reason: reason || 'Unknown rejection reason'
    });
  }

  /**
   * Undo the last operation
   */
  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    const undoable = this.undoStack.pop()!;
    const result = OTEngine.apply(this.documentState, undoable.inverse);
    
    if (!result.success) {
      console.error('Failed to undo operation:', result.error);
      // Put it back
      this.undoStack.push(undoable);
      return false;
    }

    this.documentState = result.newState!;
    this.redoStack.push(undoable);

    this.emit('undoOperation', {
      undoable,
      newState: this.documentState
    });

    return true;
  }

  /**
   * Redo the last undone operation
   */
  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const redoable = this.redoStack.pop()!;
    const result = OTEngine.apply(this.documentState, redoable.operation);
    
    if (!result.success) {
      console.error('Failed to redo operation:', result.error);
      // Put it back
      this.redoStack.push(redoable);
      return false;
    }

    this.documentState = result.newState!;
    this.undoStack.push(redoable);

    this.emit('redoOperation', {
      redoable,
      newState: this.documentState
    });

    return true;
  }

  /**
   * Force synchronization with server state
   * Used when there are unresolvable conflicts
   */
  syncWithServer(serverState: DocumentState): void {
    this.documentState = serverState;
    this.pendingOperations.clear();
    
    this.emit('forcedSync', {
      newState: this.documentState
    });
  }

  /**
   * Get current document state
   */
  getState(): DocumentState {
    return { ...this.documentState };
  }

  /**
   * Get current document data
   */
  getData(): any {
    return this.documentState.data;
  }

  /**
   * Set connection status
   */
  setConnected(connected: boolean): void {
    const wasConnected = this.isConnected;
    this.isConnected = connected;

    if (connected && !wasConnected) {
      this.emit('connected');
      
      // Send any pending operations
      for (const operation of this.pendingOperations.values()) {
        this.emit('sendToServer', operation);
      }
    } else if (!connected && wasConnected) {
      this.emit('disconnected');
    }
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.pendingOperations.size;
  }

  /**
   * Check if operation is pending
   */
  isPending(operationId: string): boolean {
    return this.pendingOperations.has(operationId);
  }

  /**
   * Clear all pending operations (use with caution)
   */
  clearPending(): void {
    this.pendingOperations.clear();
    this.emit('pendingCleared');
  }

  /**
   * Get undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(strategy: ConflictResolution): void {
    this.conflictResolution = strategy;
  }

  /**
   * Create a new operation with current user and timestamp
   */
  createOperation(
    type: Operation['type'],
    path: string[],
    operationData: Partial<Operation>,
    userId: string
  ): Operation {
    return {
      id: operationUtils.generateId(),
      userId,
      timestamp: operationUtils.timestamp(),
      path,
      type,
      ...operationData
    } as Operation;
  }

  /**
   * Dispose of the document manager
   */
  dispose(): void {
    this.removeAllListeners();
    this.pendingOperations.clear();
    this.undoStack = [];
    this.redoStack = [];
  }
}

/**
 * Factory function to create a DocumentManager instance
 */
export function createDocumentManager(
  documentId: string,
  initialData: any,
  userId: string,
  conflictResolution: ConflictResolution = 'last-write-wins'
): DocumentManager {
  const initialState: DocumentState = {
    id: documentId,
    version: 1,
    data: initialData,
    lastModified: Date.now(),
    lastModifiedBy: userId
  };

  return new DocumentManager(initialState, conflictResolution);
} 