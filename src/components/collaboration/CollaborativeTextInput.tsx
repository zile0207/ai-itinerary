import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCollaborativeDocument } from '@/hooks/useCollaborativeDocument';
import { cn } from '@/lib/utils';

export interface CollaborativeTextInputProps {
  documentId: string;
  path: string[];
  initialValue: string;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (value: string) => void;
}

/**
 * A text input component that supports real-time collaborative editing
 * Uses operational transformation for conflict resolution
 */
export function CollaborativeTextInput({
  documentId,
  path,
  initialValue,
  placeholder,
  className,
  multiline = false,
  rows = 3,
  disabled = false,
  onFocus,
  onBlur,
  onChange
}: CollaborativeTextInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(initialValue);
  const [isComposing, setIsComposing] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  // Get the initial document data
  const initialData = React.useMemo(() => {
    let data: any = {};
    let current: any = data;
    
    // Build nested object structure based on path
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = initialValue;
    
    return data;
  }, [path, initialValue]);
  
  const {
    data,
    createTextOperation,
    isConnected,
    isSyncing
  } = useCollaborativeDocument({
    documentId,
    initialData,
    enabled: !disabled
  });
  
  // Extract current value from document data
  const documentValue = React.useMemo(() => {
    let current = data;
    for (const segment of path) {
      if (current && typeof current === 'object') {
        current = current[segment];
      } else {
        return initialValue;
      }
    }
    return typeof current === 'string' ? current : initialValue;
  }, [data, path, initialValue]);
  
  // Update local value when document changes
  useEffect(() => {
    if (documentValue !== localValue && !isComposing) {
      const input = inputRef.current;
      const currentStart = input?.selectionStart || 0;
      const currentEnd = input?.selectionEnd || 0;
      
      setLocalValue(documentValue);
      
      // Restore cursor position after update
      if (input) {
        setTimeout(() => {
          input.setSelectionRange(
            Math.min(currentStart, documentValue.length),
            Math.min(currentEnd, documentValue.length)
          );
        }, 0);
      }
    }
  }, [documentValue, localValue, isComposing]);
  
  // Save cursor position
  const saveCursorPosition = useCallback(() => {
    const input = inputRef.current;
    if (input) {
      setSelectionStart(input.selectionStart || 0);
      setSelectionEnd(input.selectionEnd || 0);
    }
  }, []);
  
  // Handle text changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const oldValue = localValue;
    
    saveCursorPosition();
    
    // Calculate the diff to create minimal operations
    if (newValue !== oldValue) {
      if (newValue.length > oldValue.length) {
        // Text was inserted
        const start = findDiffStart(oldValue, newValue);
        const insertedText = newValue.slice(start, start + (newValue.length - oldValue.length));
        
        createTextOperation(path, 'insert', {
          position: start,
          content: insertedText
        });
      } else if (newValue.length < oldValue.length) {
        // Text was deleted
        const start = findDiffStart(oldValue, newValue);
        const deleteLength = oldValue.length - newValue.length;
        
        createTextOperation(path, 'delete', {
          position: start,
          length: deleteLength,
          deletedContent: oldValue.slice(start, start + deleteLength)
        });
      } else {
        // Text was replaced (same length)
        const start = findDiffStart(oldValue, newValue);
        const end = findDiffEnd(oldValue, newValue);
        const replaceLength = end - start;
        
        if (replaceLength > 0) {
          createTextOperation(path, 'replace', {
            position: start,
            length: replaceLength,
            content: newValue.slice(start, end),
            replacedContent: oldValue.slice(start, end)
          });
        }
      }
      
      setLocalValue(newValue);
      onChange?.(newValue);
    }
  }, [localValue, path, createTextOperation, onChange, saveCursorPosition]);
  
  // Handle composition events (for IME input)
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);
  
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsComposing(false);
    // Trigger change after composition ends
    handleChange(e as any);
  }, [handleChange]);
  
  // Handle focus/blur for presence tracking
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onFocus?.();
  }, [onFocus]);
  
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onBlur?.();
  }, [onBlur]);
  
  const commonProps = {
    ref: inputRef as any,
    value: localValue,
    onChange: handleChange,
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onSelect: saveCursorPosition,
    onClick: saveCursorPosition,
    onKeyUp: saveCursorPosition,
    placeholder,
    disabled: disabled || !isConnected,
    className: cn(
      'border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      'transition-colors duration-200',
      !isConnected && 'bg-gray-100 text-gray-500',
      isSyncing && 'bg-yellow-50 border-yellow-200',
      className
    )
  };
  
  if (multiline) {
    return (
      <textarea
        {...commonProps}
        rows={rows}
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
      />
    );
  }
  
  return (
    <input
      {...commonProps}
      type="text"
      ref={inputRef as React.RefObject<HTMLInputElement>}
    />
  );
}

// Utility functions for finding text differences
function findDiffStart(oldText: string, newText: string): number {
  let i = 0;
  while (i < oldText.length && i < newText.length && oldText[i] === newText[i]) {
    i++;
  }
  return i;
}

function findDiffEnd(oldText: string, newText: string): number {
  let oldIndex = oldText.length - 1;
  let newIndex = newText.length - 1;
  
  while (oldIndex >= 0 && newIndex >= 0 && oldText[oldIndex] === newText[newIndex]) {
    oldIndex--;
    newIndex--;
  }
  
  return oldIndex + 1;
}

export default CollaborativeTextInput; 