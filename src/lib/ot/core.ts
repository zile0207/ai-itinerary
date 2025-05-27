import {
  Operation,
  TextInsertOp,
  TextDeleteOp,
  TextReplaceOp,
  ArrayInsertOp,
  ArrayDeleteOp,
  ArrayMoveOp,
  ObjectSetOp,
  ObjectDeleteOp,
  CompositeOp,
  DocumentState,
  ApplyResult,
  TransformResult,
  TransformContext,
  ValidationResult,
  JSONPath,
} from './types';
import { pathUtils } from './utils';

/**
 * Core Operational Transformation Engine
 * Implements the fundamental OT algorithms for collaborative editing
 */
export class OTEngine {
  
  /**
   * Transform two concurrent operations to maintain consistency
   * Implements the core transformation algorithm for different operation types
   */
  static transform(op1: Operation, op2: Operation, context: TransformContext = { concurrent: true }): TransformResult {
    // Operations on different paths don't conflict
    if (!pathUtils.pathsConflict(op1.path, op2.path)) {
      return { op1Prime: op1, op2Prime: op2 };
    }

    // Same path - need transformation based on operation types
    if (pathUtils.pathsEqual(op1.path, op2.path)) {
      return this.transformSamePath(op1, op2, context);
    }

    // Nested paths - handle parent/child relationships
    return this.transformNestedPaths(op1, op2, context);
  }

  /**
   * Transform operations on the same path
   */
  private static transformSamePath(op1: Operation, op2: Operation, context: TransformContext): TransformResult {
    // Text operations
    if (this.isTextOp(op1) && this.isTextOp(op2)) {
      return this.transformTextOps(op1, op2, context);
    }

    // Array operations
    if (this.isArrayOp(op1) && this.isArrayOp(op2)) {
      return this.transformArrayOps(op1, op2, context);
    }

    // Object operations
    if (this.isObjectOp(op1) && this.isObjectOp(op2)) {
      return this.transformObjectOps(op1, op2, context);
    }

    // Mixed types - use priority-based resolution
    return this.transformMixedTypes(op1, op2, context);
  }

  /**
   * Transform text operations (insert/delete/replace)
   */
  private static transformTextOps(op1: TextInsertOp | TextDeleteOp | TextReplaceOp, op2: TextInsertOp | TextDeleteOp | TextReplaceOp, context: TransformContext): TransformResult {
    if (op1.type === 'text-insert' && op2.type === 'text-insert') {
      return this.transformTextInserts(op1, op2, context);
    }

    if (op1.type === 'text-delete' && op2.type === 'text-delete') {
      return this.transformTextDeletes(op1, op2, context);
    }

    if (op1.type === 'text-insert' && op2.type === 'text-delete') {
      return this.transformInsertDelete(op1, op2, context);
    }

    if (op1.type === 'text-delete' && op2.type === 'text-insert') {
      const result = this.transformInsertDelete(op2, op1, context);
      return { op1Prime: result.op2Prime, op2Prime: result.op1Prime };
    }

    // Handle replace operations
    if (op1.type === 'text-replace' || op2.type === 'text-replace') {
      return this.transformWithReplace(op1, op2, context);
    }

    return { op1Prime: op1, op2Prime: op2 };
  }

  /**
   * Transform two text insert operations
   */
  private static transformTextInserts(op1: TextInsertOp, op2: TextInsertOp, context: TransformContext): TransformResult {
    if (op1.position <= op2.position) {
      // op2 needs to be shifted right by the length of op1's insertion
      const op2Prime: TextInsertOp = {
        ...op2,
        position: op2.position + op1.content.length,
      };
      return { op1Prime: op1, op2Prime };
    } else {
      // op1 needs to be shifted right by the length of op2's insertion
      const op1Prime: TextInsertOp = {
        ...op1,
        position: op1.position + op2.content.length,
      };
      return { op1Prime, op2Prime: op2 };
    }
  }

  /**
   * Transform two text delete operations
   */
  private static transformTextDeletes(op1: TextDeleteOp, op2: TextDeleteOp, context: TransformContext): TransformResult {
    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    // No overlap
    if (op1End <= op2.position) {
      // op2 is after op1, shift it left
      const op2Prime: TextDeleteOp = {
        ...op2,
        position: op2.position - op1.length,
      };
      return { op1Prime: op1, op2Prime };
    }

    if (op2End <= op1.position) {
      // op1 is after op2, shift it left
      const op1Prime: TextDeleteOp = {
        ...op1,
        position: op1.position - op2.length,
      };
      return { op1Prime, op2Prime: op2 };
    }

    // Overlapping deletes - need to handle carefully
    return this.transformOverlappingDeletes(op1, op2, context);
  }

  /**
   * Transform insert and delete operations
   */
  private static transformInsertDelete(insert: TextInsertOp, delete_: TextDeleteOp, context: TransformContext): TransformResult {
    const deleteEnd = delete_.position + delete_.length;

    if (insert.position <= delete_.position) {
      // Insert is before delete, shift delete right
      const deletePrime: TextDeleteOp = {
        ...delete_,
        position: delete_.position + insert.content.length,
      };
      return { op1Prime: insert, op2Prime: deletePrime };
    }

    if (insert.position >= deleteEnd) {
      // Insert is after delete, shift insert left
      const insertPrime: TextInsertOp = {
        ...insert,
        position: insert.position - delete_.length,
      };
      return { op1Prime: insertPrime, op2Prime: delete_ };
    }

    // Insert is within delete range - transform based on priority
    if (context.priority === 'client') {
      // Keep insert, adjust delete
      const deletePrime: TextDeleteOp = {
        ...delete_,
        length: delete_.length + insert.content.length,
      };
      return { op1Prime: insert, op2Prime: deletePrime };
    } else {
      // Keep delete, cancel insert
      return { op1Prime: null, op2Prime: delete_ };
    }
  }

  /**
   * Transform array operations (insert/delete/move)
   */
  private static transformArrayOps(op1: ArrayInsertOp | ArrayDeleteOp | ArrayMoveOp, op2: ArrayInsertOp | ArrayDeleteOp | ArrayMoveOp, context: TransformContext): TransformResult {
    if (op1.type === 'array-insert' && op2.type === 'array-insert') {
      return this.transformArrayInserts(op1, op2, context);
    }

    if (op1.type === 'array-delete' && op2.type === 'array-delete') {
      return this.transformArrayDeletes(op1, op2, context);
    }

    if (op1.type === 'array-insert' && op2.type === 'array-delete') {
      return this.transformArrayInsertDelete(op1, op2, context);
    }

    if (op1.type === 'array-delete' && op2.type === 'array-insert') {
      const result = this.transformArrayInsertDelete(op2, op1, context);
      return { op1Prime: result.op2Prime, op2Prime: result.op1Prime };
    }

    // Handle move operations
    if (op1.type === 'array-move' || op2.type === 'array-move') {
      return this.transformWithArrayMove(op1, op2, context);
    }

    return { op1Prime: op1, op2Prime: op2 };
  }

  /**
   * Transform two array insert operations
   */
  private static transformArrayInserts(op1: ArrayInsertOp, op2: ArrayInsertOp, context: TransformContext): TransformResult {
    if (op1.index <= op2.index) {
      const op2Prime: ArrayInsertOp = {
        ...op2,
        index: op2.index + op1.items.length,
      };
      return { op1Prime: op1, op2Prime };
    } else {
      const op1Prime: ArrayInsertOp = {
        ...op1,
        index: op1.index + op2.items.length,
      };
      return { op1Prime, op2Prime: op2 };
    }
  }

  /**
   * Transform two array delete operations
   */
  private static transformArrayDeletes(op1: ArrayDeleteOp, op2: ArrayDeleteOp, context: TransformContext): TransformResult {
    const op1End = op1.index + op1.count;
    const op2End = op2.index + op2.count;

    // No overlap
    if (op1End <= op2.index) {
      const op2Prime: ArrayDeleteOp = {
        ...op2,
        index: op2.index - op1.count,
      };
      return { op1Prime: op1, op2Prime };
    }

    if (op2End <= op1.index) {
      const op1Prime: ArrayDeleteOp = {
        ...op1,
        index: op1.index - op2.count,
      };
      return { op1Prime, op2Prime: op2 };
    }

    // Overlapping deletes
    return this.transformOverlappingArrayDeletes(op1, op2, context);
  }

  /**
   * Apply an operation to a document state
   */
  static apply(state: DocumentState, operation: Operation): ApplyResult {
    try {
      const validation = this.validate(operation, state);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      let newData = structuredClone(state.data);
      
      switch (operation.type) {
        case 'text-insert':
          newData = this.applyTextInsert(newData, operation);
          break;
        case 'text-delete':
          newData = this.applyTextDelete(newData, operation);
          break;
        case 'text-replace':
          newData = this.applyTextReplace(newData, operation);
          break;
        case 'object-set':
          newData = this.applyObjectSet(newData, operation);
          break;
        case 'object-delete':
          newData = this.applyObjectDelete(newData, operation);
          break;
        case 'array-insert':
          newData = this.applyArrayInsert(newData, operation);
          break;
        case 'array-delete':
          newData = this.applyArrayDelete(newData, operation);
          break;
        case 'array-move':
          newData = this.applyArrayMove(newData, operation);
          break;
        case 'composite':
          newData = this.applyComposite(newData, operation);
          break;
        default:
          return {
            success: false,
            error: `Unknown operation type: ${(operation as any).type}`,
          };
      }

      const newState: DocumentState = {
        ...state,
        data: newData,
        version: state.version + 1,
        lastModified: operation.timestamp,
        lastModifiedBy: operation.userId,
      };

      return {
        success: true,
        newState,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error applying operation',
      };
    }
  }

  /**
   * Compose multiple operations into a single operation
   */
  static compose(operations: Operation[]): Operation | null {
    if (operations.length === 0) return null;
    if (operations.length === 1) return operations[0];

    // Create a composite operation
    const firstOp = operations[0];
    const compositeOp: CompositeOp = {
      id: `composite-${Date.now()}`,
      type: 'composite',
      userId: firstOp.userId,
      timestamp: firstOp.timestamp,
      path: [], // Composite can affect multiple paths
      operations: operations,
    };

    return compositeOp;
  }

  /**
   * Create the inverse of an operation for undo functionality
   */
  static invert(operation: Operation): Operation | null {
    switch (operation.type) {
      case 'text-insert':
        return {
          ...operation,
          type: 'text-delete',
          length: operation.content.length,
          deletedContent: operation.content,
        } as TextDeleteOp;

      case 'text-delete':
        if (!operation.deletedContent) return null;
        return {
          ...operation,
          type: 'text-insert',
          content: operation.deletedContent,
        } as TextInsertOp;

      case 'object-set':
        if (operation.oldValue !== undefined) {
          return {
            ...operation,
            value: operation.oldValue,
            oldValue: operation.value,
          };
        }
        return {
          ...operation,
          type: 'object-delete',
          deletedValue: operation.value,
        } as ObjectDeleteOp;

      case 'array-insert':
        return {
          ...operation,
          type: 'array-delete',
          count: operation.items.length,
          deletedItems: operation.items,
        } as ArrayDeleteOp;

      case 'array-delete':
        if (!operation.deletedItems) return null;
        return {
          ...operation,
          type: 'array-insert',
          items: operation.deletedItems,
        } as ArrayInsertOp;

      default:
        return null;
    }
  }

  // Helper methods and type guards
  private static isTextOp(op: Operation): op is TextInsertOp | TextDeleteOp | TextReplaceOp {
    return op.type.startsWith('text-');
  }

  private static isArrayOp(op: Operation): op is ArrayInsertOp | ArrayDeleteOp | ArrayMoveOp {
    return op.type.startsWith('array-');
  }

  private static isObjectOp(op: Operation): op is ObjectSetOp | ObjectDeleteOp {
    return op.type.startsWith('object-');
  }

  // Apply operation methods
  private static applyTextInsert(data: any, op: TextInsertOp): any {
    const target = pathUtils.getValue(data, op.path);
    if (typeof target !== 'string') {
      throw new Error(`Cannot apply text insert to non-string value at path ${op.path.join('.')}`);
    }
    
    const newValue = target.slice(0, op.position) + op.content + target.slice(op.position);
    return pathUtils.setValue(data, op.path, newValue);
  }

  private static applyTextDelete(data: any, op: TextDeleteOp): any {
    const target = pathUtils.getValue(data, op.path);
    if (typeof target !== 'string') {
      throw new Error(`Cannot apply text delete to non-string value at path ${op.path.join('.')}`);
    }
    
    const newValue = target.slice(0, op.position) + target.slice(op.position + op.length);
    return pathUtils.setValue(data, op.path, newValue);
  }

  private static applyObjectSet(data: any, op: ObjectSetOp): any {
    const targetPath = [...op.path, op.key];
    return pathUtils.setValue(data, targetPath, op.value);
  }

  private static applyArrayInsert(data: any, op: ArrayInsertOp): any {
    const target = pathUtils.getValue(data, op.path);
    if (!Array.isArray(target)) {
      throw new Error(`Cannot apply array insert to non-array value at path ${op.path.join('.')}`);
    }
    
    const newArray = [...target];
    newArray.splice(op.index, 0, ...op.items);
    return pathUtils.setValue(data, op.path, newArray);
  }

  // Validation
  private static validate(operation: Operation, state: DocumentState): ValidationResult {
    // Basic validation - ensure path exists and types match
    try {
      const target = pathUtils.getValue(state.data, operation.path);
      
      if (this.isTextOp(operation) && typeof target !== 'string') {
        return { valid: false, error: 'Text operation on non-string field' };
      }
      
      if (this.isArrayOp(operation) && !Array.isArray(target)) {
        return { valid: false, error: 'Array operation on non-array field' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid path' };
    }
  }

  /**
   * Transform object operations (set/delete)
   */
  private static transformObjectOps(op1: ObjectSetOp | ObjectDeleteOp, op2: ObjectSetOp | ObjectDeleteOp, context: TransformContext): TransformResult {
    // Same key operations
    if (op1.type === 'object-set' && op2.type === 'object-set' && op1.key === op2.key) {
      // Both setting same key - use timestamp priority
      return op1.timestamp > op2.timestamp 
        ? { op1Prime: op1, op2Prime: null }
        : { op1Prime: null, op2Prime: op2 };
    }

    if (op1.type === 'object-delete' && op2.type === 'object-delete' && op1.key === op2.key) {
      // Both deleting same key - first one wins
      return op1.timestamp < op2.timestamp 
        ? { op1Prime: op1, op2Prime: null }
        : { op1Prime: null, op2Prime: op2 };
    }

    if (op1.type === 'object-set' && op2.type === 'object-delete' && op1.key === op2.key) {
      // Set vs delete on same key - use priority
      return context.priority === 'client' 
        ? { op1Prime: op1, op2Prime: null }
        : { op1Prime: null, op2Prime: op2 };
    }

    if (op1.type === 'object-delete' && op2.type === 'object-set' && op1.key === op2.key) {
      // Delete vs set on same key - use priority
      return context.priority === 'client' 
        ? { op1Prime: op1, op2Prime: null }
        : { op1Prime: null, op2Prime: op2 };
    }

    // Different keys - operations don't conflict
    return { op1Prime: op1, op2Prime: op2 };
  }

  // Placeholder methods for complex transformations
  private static transformNestedPaths(op1: Operation, op2: Operation, context: TransformContext): TransformResult {
    // For now, assume operations on nested paths don't conflict
    return { op1Prime: op1, op2Prime: op2 };
  }

  private static transformMixedTypes(op1: Operation, op2: Operation, context: TransformContext): TransformResult {
    // Use timestamp-based priority for mixed types
    if (op1.timestamp < op2.timestamp) {
      return { op1Prime: op1, op2Prime: null };
    } else {
      return { op1Prime: null, op2Prime: op2 };
    }
  }

  // Additional placeholder methods for complex operations
  private static transformOverlappingDeletes(op1: TextDeleteOp, op2: TextDeleteOp, context: TransformContext): TransformResult {
    // Simplified: merge overlapping deletes
    const start = Math.min(op1.position, op2.position);
    const end = Math.max(op1.position + op1.length, op2.position + op2.length);
    
    const mergedOp: TextDeleteOp = {
      ...op1,
      position: start,
      length: end - start,
    };
    
    return { op1Prime: mergedOp, op2Prime: null };
  }

  private static transformWithReplace(op1: Operation, op2: Operation, context: TransformContext): TransformResult {
    // Simplified: later operation wins
    return op1.timestamp > op2.timestamp 
      ? { op1Prime: op1, op2Prime: null }
      : { op1Prime: null, op2Prime: op2 };
  }

  private static transformArrayInsertDelete(insert: ArrayInsertOp, delete_: ArrayDeleteOp, context: TransformContext): TransformResult {
    // Similar logic to text operations but for arrays
    return { op1Prime: insert, op2Prime: delete_ };
  }

  private static transformWithArrayMove(op1: Operation, op2: Operation, context: TransformContext): TransformResult {
    // Simplified: first operation wins
    return { op1Prime: op1, op2Prime: null };
  }

  private static transformOverlappingArrayDeletes(op1: ArrayDeleteOp, op2: ArrayDeleteOp, context: TransformContext): TransformResult {
    // Merge overlapping array deletes
    const start = Math.min(op1.index, op2.index);
    const end = Math.max(op1.index + op1.count, op2.index + op2.count);
    
    const mergedOp: ArrayDeleteOp = {
      ...op1,
      index: start,
      count: end - start,
    };
    
    return { op1Prime: mergedOp, op2Prime: null };
  }

  private static applyTextReplace(data: any, op: TextReplaceOp): any {
    const target = pathUtils.getValue(data, op.path);
    if (typeof target !== 'string') {
      throw new Error(`Cannot apply text replace to non-string value at path ${op.path.join('.')}`);
    }
    
    const newValue = target.slice(0, op.position) + op.content + target.slice(op.position + op.length);
    return pathUtils.setValue(data, op.path, newValue);
  }

  private static applyObjectDelete(data: any, op: ObjectDeleteOp): any {
    const targetPath = [...op.path];
    const parent = pathUtils.getValue(data, targetPath);
    
    if (typeof parent !== 'object' || parent === null) {
      throw new Error(`Cannot delete property from non-object at path ${op.path.join('.')}`);
    }
    
    const newParent = { ...parent };
    delete newParent[op.key];
    return pathUtils.setValue(data, targetPath, newParent);
  }

  private static applyArrayDelete(data: any, op: ArrayDeleteOp): any {
    const target = pathUtils.getValue(data, op.path);
    if (!Array.isArray(target)) {
      throw new Error(`Cannot apply array delete to non-array value at path ${op.path.join('.')}`);
    }
    
    const newArray = [...target];
    newArray.splice(op.index, op.count);
    return pathUtils.setValue(data, op.path, newArray);
  }

  private static applyArrayMove(data: any, op: ArrayMoveOp): any {
    const target = pathUtils.getValue(data, op.path);
    if (!Array.isArray(target)) {
      throw new Error(`Cannot apply array move to non-array value at path ${op.path.join('.')}`);
    }
    
    const newArray = [...target];
    const items = newArray.splice(op.fromIndex, op.count);
    newArray.splice(op.toIndex, 0, ...items);
    return pathUtils.setValue(data, op.path, newArray);
  }

  private static applyComposite(data: any, op: CompositeOp): any {
    let result = data;
    for (const subOp of op.operations) {
      const applyResult = this.apply({ id: '', version: 0, data: result, lastModified: 0, lastModifiedBy: '' }, subOp);
      if (!applyResult.success) {
        throw new Error(`Failed to apply composite operation: ${applyResult.error}`);
      }
      result = applyResult.newState!.data;
    }
    return result;
  }
} 