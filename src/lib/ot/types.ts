/**
 * Operational Transformation Types
 * Defines the core types for handling concurrent edits in collaborative documents
 */

// Base operation interface
export interface BaseOperation {
  id: string;
  userId: string;
  timestamp: number;
  path: string[]; // JSON path to the field being modified
}

// Text operations for string fields
export interface TextInsertOp extends BaseOperation {
  type: 'text-insert';
  position: number;
  content: string;
}

export interface TextDeleteOp extends BaseOperation {
  type: 'text-delete';
  position: number;
  length: number;
  deletedContent?: string; // For inverse operations
}

export interface TextReplaceOp extends BaseOperation {
  type: 'text-replace';
  position: number;
  length: number;
  content: string;
  replacedContent?: string; // For inverse operations
}

// Object operations for adding/removing/updating properties
export interface ObjectSetOp extends BaseOperation {
  type: 'object-set';
  key: string;
  value: any;
  oldValue?: any; // For inverse operations
}

export interface ObjectDeleteOp extends BaseOperation {
  type: 'object-delete';
  key: string;
  deletedValue?: any; // For inverse operations
}

// Array operations for lists (activities, accommodations, etc.)
export interface ArrayInsertOp extends BaseOperation {
  type: 'array-insert';
  index: number;
  items: any[];
}

export interface ArrayDeleteOp extends BaseOperation {
  type: 'array-delete';
  index: number;
  count: number;
  deletedItems?: any[]; // For inverse operations
}

export interface ArrayMoveOp extends BaseOperation {
  type: 'array-move';
  fromIndex: number;
  toIndex: number;
  count: number;
}

export interface ArrayReplaceOp extends BaseOperation {
  type: 'array-replace';
  index: number;
  items: any[];
  replacedItems?: any[]; // For inverse operations
}

// Composite operation for complex changes
export interface CompositeOp extends BaseOperation {
  type: 'composite';
  operations: Operation[];
}

// Union type for all operations
export type Operation = 
  | TextInsertOp 
  | TextDeleteOp 
  | TextReplaceOp
  | ObjectSetOp 
  | ObjectDeleteOp
  | ArrayInsertOp 
  | ArrayDeleteOp 
  | ArrayMoveOp
  | ArrayReplaceOp
  | CompositeOp;

// Document state representation
export interface DocumentState {
  id: string;
  version: number;
  data: any;
  lastModified: number;
  lastModifiedBy: string;
}

// Operation context for transformation
export interface TransformContext {
  concurrent: boolean;
  priority?: 'client' | 'server';
  metadata?: Record<string, any>;
}

// Result of applying an operation
export interface ApplyResult {
  success: boolean;
  newState?: DocumentState;
  error?: string;
  transformedOp?: Operation;
}

// Transform result for OT algorithms
export interface TransformResult {
  op1Prime: Operation | null;
  op2Prime: Operation | null;
}

// Undo/redo support
export interface UndoableOperation {
  operation: Operation;
  inverse: Operation;
  timestamp: number;
}

// Operation validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// Path utilities type
export type JSONPath = (string | number)[];

// Helper types for itinerary-specific operations
export interface ItineraryField {
  path: JSONPath;
  type: 'text' | 'object' | 'array' | 'primitive';
  schema?: any;
}

// Conflict resolution strategies
export type ConflictResolution = 'client-wins' | 'server-wins' | 'last-write-wins' | 'merge';

// Operation priority for conflict resolution
export interface OperationPriority {
  userId: string;
  timestamp: number;
  sessionId?: string;
  weight?: number;
} 