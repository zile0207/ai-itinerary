import { JSONPath } from './types';

/**
 * Path manipulation utilities for operational transformation
 */
export const pathUtils = {
  /**
   * Check if two paths are equal
   */
  pathsEqual(path1: JSONPath, path2: JSONPath): boolean {
    if (path1.length !== path2.length) return false;
    return path1.every((segment, index) => segment === path2[index]);
  },

  /**
   * Check if two paths conflict (one is ancestor of the other or they're equal)
   */
  pathsConflict(path1: JSONPath, path2: JSONPath): boolean {
    if (this.pathsEqual(path1, path2)) return true;
    
    const shorter = path1.length < path2.length ? path1 : path2;
    const longer = path1.length < path2.length ? path2 : path1;
    
    // Check if shorter path is prefix of longer path
    return shorter.every((segment, index) => segment === longer[index]);
  },

  /**
   * Check if path1 is an ancestor of path2
   */
  isAncestor(ancestorPath: JSONPath, childPath: JSONPath): boolean {
    if (ancestorPath.length >= childPath.length) return false;
    return ancestorPath.every((segment, index) => segment === childPath[index]);
  },

  /**
   * Check if path1 is a descendant of path2
   */
  isDescendant(childPath: JSONPath, ancestorPath: JSONPath): boolean {
    return this.isAncestor(ancestorPath, childPath);
  },

  /**
   * Get value at path in object
   */
  getValue(obj: any, path: JSONPath): any {
    let current = obj;
    for (const segment of path) {
      if (current === null || current === undefined) {
        throw new Error(`Cannot access property '${segment}' of ${current} at path ${path.join('.')}`);
      }
      current = current[segment];
    }
    return current;
  },

  /**
   * Set value at path in object (immutably)
   */
  setValue(obj: any, path: JSONPath, value: any): any {
    if (path.length === 0) return value;
    
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const [head, ...tail] = path;
    
    if (tail.length === 0) {
      result[head] = value;
    } else {
      result[head] = this.setValue(result[head] || {}, tail, value);
    }
    
    return result;
  },

  /**
   * Delete value at path in object (immutably)
   */
  deleteValue(obj: any, path: JSONPath): any {
    if (path.length === 0) return undefined;
    if (path.length === 1) {
      const result = Array.isArray(obj) ? [...obj] : { ...obj };
      delete result[path[0]];
      return result;
    }
    
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const [head, ...tail] = path;
    
    if (result[head] !== undefined) {
      result[head] = this.deleteValue(result[head], tail);
    }
    
    return result;
  },

  /**
   * Check if path exists in object
   */
  pathExists(obj: any, path: JSONPath): boolean {
    try {
      this.getValue(obj, path);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get the parent path (all segments except the last)
   */
  getParentPath(path: JSONPath): JSONPath {
    return path.slice(0, -1);
  },

  /**
   * Get the last segment of a path
   */
  getLastSegment(path: JSONPath): string | number | undefined {
    return path[path.length - 1];
  },

  /**
   * Join two paths
   */
  joinPaths(path1: JSONPath, path2: JSONPath): JSONPath {
    return [...path1, ...path2];
  },

  /**
   * Create a relative path from base to target
   */
  relativePath(basePath: JSONPath, targetPath: JSONPath): JSONPath | null {
    if (!this.isAncestor(basePath, targetPath)) return null;
    return targetPath.slice(basePath.length);
  },

  /**
   * Normalize path by converting string segments to appropriate types
   */
  normalizePath(path: JSONPath): JSONPath {
    return path.map(segment => {
      if (typeof segment === 'string') {
        // Try to convert to number if it's a valid array index
        const num = Number(segment);
        if (!isNaN(num) && Number.isInteger(num) && num >= 0) {
          return num;
        }
      }
      return segment;
    });
  }
};

/**
 * Operation utilities
 */
export const operationUtils = {
  /**
   * Generate a unique operation ID
   */
  generateId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Get current timestamp
   */
  timestamp(): number {
    return Date.now();
  },

  /**
   * Clone an operation
   */
  cloneOperation<T extends object>(operation: T): T {
    return structuredClone(operation);
  },

  /**
   * Check if two operations have the same ID
   */
  sameOperation(op1: { id: string }, op2: { id: string }): boolean {
    return op1.id === op2.id;
  },

  /**
   * Compare operation timestamps
   */
  compareTimestamps(op1: { timestamp: number }, op2: { timestamp: number }): number {
    return op1.timestamp - op2.timestamp;
  },

  /**
   * Check if operation is within time window
   */
  isRecent(operation: { timestamp: number }, windowMs: number = 60000): boolean {
    return Date.now() - operation.timestamp < windowMs;
  }
};

/**
 * Text manipulation utilities for text operations
 */
export const textUtils = {
  /**
   * Insert text at position
   */
  insert(text: string, position: number, content: string): string {
    return text.slice(0, position) + content + text.slice(position);
  },

  /**
   * Delete text at position
   */
  delete(text: string, position: number, length: number): { result: string; deleted: string } {
    const deleted = text.slice(position, position + length);
    const result = text.slice(0, position) + text.slice(position + length);
    return { result, deleted };
  },

  /**
   * Replace text at position
   */
  replace(text: string, position: number, length: number, content: string): { result: string; replaced: string } {
    const replaced = text.slice(position, position + length);
    const result = text.slice(0, position) + content + text.slice(position + length);
    return { result, replaced };
  },

  /**
   * Validate position is within text bounds
   */
  validPosition(text: string, position: number): boolean {
    return position >= 0 && position <= text.length;
  },

  /**
   * Validate range is within text bounds
   */
  validRange(text: string, position: number, length: number): boolean {
    return position >= 0 && position + length <= text.length && length >= 0;
  }
};

/**
 * Array manipulation utilities for array operations
 */
export const arrayUtils = {
  /**
   * Insert items at index
   */
  insert<T>(array: T[], index: number, items: T[]): T[] {
    const result = [...array];
    result.splice(index, 0, ...items);
    return result;
  },

  /**
   * Delete items at index
   */
  delete<T>(array: T[], index: number, count: number): { result: T[]; deleted: T[] } {
    const result = [...array];
    const deleted = result.splice(index, count);
    return { result, deleted };
  },

  /**
   * Move items from one index to another
   */
  move<T>(array: T[], fromIndex: number, toIndex: number, count: number): T[] {
    const result = [...array];
    const items = result.splice(fromIndex, count);
    result.splice(toIndex, 0, ...items);
    return result;
  },

  /**
   * Replace items at index
   */
  replace<T>(array: T[], index: number, count: number, items: T[]): { result: T[]; replaced: T[] } {
    const result = [...array];
    const replaced = result.splice(index, count, ...items);
    return { result, replaced };
  },

  /**
   * Validate index is within array bounds
   */
  validIndex<T>(array: T[], index: number): boolean {
    return index >= 0 && index <= array.length;
  },

  /**
   * Validate range is within array bounds
   */
  validRange<T>(array: T[], index: number, count: number): boolean {
    return index >= 0 && index + count <= array.length && count >= 0;
  }
};

/**
 * Validation utilities
 */
export const validationUtils = {
  /**
   * Check if value is a valid JSON path segment
   */
  isValidPathSegment(segment: any): segment is string | number {
    return typeof segment === 'string' || (typeof segment === 'number' && Number.isInteger(segment) && segment >= 0);
  },

  /**
   * Check if array of segments forms a valid path
   */
  isValidPath(path: any[]): path is JSONPath {
    return Array.isArray(path) && path.every(segment => this.isValidPathSegment(segment));
  },

  /**
   * Check if value can be safely cloned
   */
  isCloneable(value: any): boolean {
    try {
      structuredClone(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if object is plain object (not array, not null, not function, etc.)
   */
  isPlainObject(obj: any): boolean {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date);
  }
}; 