import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DocumentManager, 
  createDocumentManager,
  Operation,
  DocumentState,
  ConflictResolution 
} from '@/lib/ot';
import { getSocket } from '@/lib/socket/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UseCollaborativeDocumentOptions {
  documentId: string;
  initialData: any;
  conflictResolution?: ConflictResolution;
  enabled?: boolean;
}

export interface UseCollaborativeDocumentReturn {
  // Document state
  data: any;
  version: number;
  isConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  
  // Operations
  applyOperation: (operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>) => boolean;
  createTextOperation: (path: string[], type: 'insert' | 'delete' | 'replace', params: any) => boolean;
  createObjectOperation: (path: string[], type: 'set' | 'delete', params: any) => boolean;
  createArrayOperation: (path: string[], type: 'insert' | 'delete' | 'move', params: any) => boolean;
  
  // Undo/redo
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  
  // Manual sync
  forceSync: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Status
  lastError: string | null;
  lastModifiedBy: string | null;
  lastModifiedAt: Date | null;
}

/**
 * Hook for managing real-time collaborative document editing
 * Integrates OT engine with Socket.io for seamless collaboration
 */
export function useCollaborativeDocument({
  documentId,
  initialData,
  conflictResolution = 'last-write-wins',
  enabled = true
}: UseCollaborativeDocumentOptions): UseCollaborativeDocumentReturn {
  const { user } = useAuth();
  const socket = getSocket();
  
  // Document manager and state
  const documentManager = useRef<DocumentManager | null>(null);
  const [documentState, setDocumentState] = useState<DocumentState>(() => ({
    id: documentId,
    version: 1,
    data: initialData,
    lastModified: Date.now(),
    lastModifiedBy: user?.id || 'anonymous'
  }));
  
  // Connection and sync status
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Initialize document manager
  useEffect(() => {
    if (!enabled || !user) return;
    
    documentManager.current = createDocumentManager(
      documentId,
      initialData,
      user.id,
      conflictResolution
    );
    
    const manager = documentManager.current;
    
    // Set up event listeners
    manager.on('localChange', ({ newState }) => {
      setDocumentState(newState);
      setPendingCount(manager.getPendingCount());
    });
    
    manager.on('remoteChange', ({ newState }) => {
      setDocumentState(newState);
      setIsSyncing(false);
    });
    
    manager.on('operationAcknowledged', () => {
      setPendingCount(manager.getPendingCount());
      setIsSyncing(false);
      setLastError(null);
    });
    
    manager.on('operationRejected', ({ reason }) => {
      setLastError(reason);
      setIsSyncing(false);
      setPendingCount(manager.getPendingCount());
    });
    
    manager.on('forcedSync', ({ newState }) => {
      setDocumentState(newState);
      setIsSyncing(false);
      setPendingCount(0);
      setLastError('Document was forcefully synchronized due to conflicts');
    });
    
    manager.on('connected', () => {
      setIsConnected(true);
      setLastError(null);
    });
    
    manager.on('disconnected', () => {
      setIsConnected(false);
    });
    
    manager.on('sendToServer', (operation) => {
      if (socket && socket.connected) {
        setIsSyncing(true);
        socket.emit('ot-operation', {
          tripId: documentId,
          operation
        });
      }
    });
    
    return () => {
      manager.dispose();
    };
  }, [documentId, initialData, user, enabled, conflictResolution, socket]);
  
  // Socket.io event handlers
  useEffect(() => {
    if (!socket || !enabled || !documentManager.current) return;
    
    const manager = documentManager.current;
    
    const handleConnect = () => {
      manager.setConnected(true);
    };
    
    const handleDisconnect = () => {
      manager.setConnected(false);
    };
    
    const handleOTOperation = ({ operation }: { operation: Operation }) => {
      manager.applyRemoteOperation(operation);
    };
    
    const handleOTAcknowledged = ({ operationId }: { operationId: string }) => {
      manager.acknowledgeOperation(operationId);
    };
    
    const handleOTRejected = ({ operationId, reason }: { operationId: string; reason: string }) => {
      manager.rejectOperation(operationId, reason);
    };
    
    const handleOTUndo = ({ operationId }: { operationId: string }) => {
      // Handle remote undo operations
      console.log('Remote undo operation:', operationId);
    };
    
    const handleOTRedo = ({ operationId }: { operationId: string }) => {
      // Handle remote redo operations
      console.log('Remote redo operation:', operationId);
    };
    
    const handleError = (error: any) => {
      setLastError(error.message || 'Socket connection error');
    };
    
    // Set up socket listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('ot-operation', handleOTOperation);
    socket.on('ot-acknowledged', handleOTAcknowledged);
    socket.on('ot-rejected', handleOTRejected);
    socket.on('ot-undo', handleOTUndo);
    socket.on('ot-redo', handleOTRedo);
    socket.on('error', handleError);
    
    // Set initial connection status
    manager.setConnected(socket.connected);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('ot-operation', handleOTOperation);
      socket.off('ot-acknowledged', handleOTAcknowledged);
      socket.off('ot-rejected', handleOTRejected);
      socket.off('ot-undo', handleOTUndo);
      socket.off('ot-redo', handleOTRedo);
      socket.off('error', handleError);
    };
  }, [socket, enabled]);
  
  // Operation creation helpers
  const applyOperation = useCallback((operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>) => {
    if (!documentManager.current || !user) return false;
    
    const fullOperation = documentManager.current.createOperation(
      operation.type,
      operation.path,
      operation,
      user.id
    );
    
    return documentManager.current.applyLocalOperation(fullOperation);
  }, [user]);
  
  const createTextOperation = useCallback((path: string[], type: 'insert' | 'delete' | 'replace', params: any) => {
    return applyOperation({
      type: `text-${type}` as Operation['type'],
      path,
      ...params
    });
  }, [applyOperation]);
  
  const createObjectOperation = useCallback((path: string[], type: 'set' | 'delete', params: any) => {
    return applyOperation({
      type: `object-${type}` as Operation['type'],
      path,
      ...params
    });
  }, [applyOperation]);
  
  const createArrayOperation = useCallback((path: string[], type: 'insert' | 'delete' | 'move', params: any) => {
    return applyOperation({
      type: `array-${type}` as Operation['type'],
      path,
      ...params
    });
  }, [applyOperation]);
  
  // Undo/redo operations
  const undo = useCallback(() => {
    if (!documentManager.current) return false;
    return documentManager.current.undo();
  }, []);
  
  const redo = useCallback(() => {
    if (!documentManager.current) return false;
    return documentManager.current.redo();
  }, []);
  
  // Manual sync operations
  const forceSync = useCallback(() => {
    if (socket && socket.connected && documentManager.current) {
      socket.emit('request-sync', {
        tripId: documentId,
        lastSyncedAt: new Date(documentState.lastModified)
      });
    }
  }, [socket, documentId, documentState.lastModified]);
  
  const disconnect = useCallback(() => {
    if (documentManager.current) {
      documentManager.current.setConnected(false);
    }
  }, []);
  
  const reconnect = useCallback(() => {
    if (socket && documentManager.current) {
      if (!socket.connected) {
        socket.connect();
      }
      documentManager.current.setConnected(socket.connected);
    }
  }, [socket]);
  
  return {
    // Document state
    data: documentState.data,
    version: documentState.version,
    isConnected,
    isSyncing,
    pendingCount,
    
    // Operations
    applyOperation,
    createTextOperation,
    createObjectOperation,
    createArrayOperation,
    
    // Undo/redo
    undo,
    redo,
    canUndo: documentManager.current ? documentManager.current.getUndoCount() > 0 : false,
    canRedo: documentManager.current ? documentManager.current.getRedoCount() > 0 : false,
    
    // Manual sync
    forceSync,
    disconnect,
    reconnect,
    
    // Status
    lastError,
    lastModifiedBy: documentState.lastModifiedBy,
    lastModifiedAt: new Date(documentState.lastModified)
  };
} 