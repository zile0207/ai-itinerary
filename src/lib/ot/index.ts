/**
 * Operational Transformation Library
 * Complete OT system for real-time collaborative editing
 */

// Core types
export * from './types';

// Core OT engine
export { OTEngine } from './core';

// Document manager for coordination
export { DocumentManager, createDocumentManager } from './documentManager';

// Utilities
export { 
  pathUtils, 
  operationUtils, 
  textUtils, 
  arrayUtils, 
  validationUtils 
} from './utils';

// Re-export commonly used types for convenience
export type {
  Operation,
  DocumentState,
  ApplyResult,
  TransformResult,
  TransformContext,
  TextInsertOp,
  TextDeleteOp,
  TextReplaceOp,
  ObjectSetOp,
  ObjectDeleteOp,
  ArrayInsertOp,
  ArrayDeleteOp,
  ArrayMoveOp,
  CompositeOp,
  UndoableOperation,
  ConflictResolution
} from './types'; 