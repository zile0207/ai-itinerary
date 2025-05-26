'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 15);
    const duration = toastData.duration || 5000;

    const newToast: Toast = {
      ...toastData,
      id,
      duration,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide toast after duration
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onHideToast={hideToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onHideToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onHideToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onHide={onHideToast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const getToastStyles = () => {
    const baseStyles = "flex items-start p-4 rounded-lg shadow-lg border transform transition-all duration-300 ease-in-out";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5 mr-3 mt-0.5 flex-shrink-0";
    
    switch (toast.type) {
      case 'success':
        return (
          <svg className={`${iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={`${iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`${iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{toast.title}</h4>
        {toast.message && (
          <p className="text-sm mt-1 opacity-90">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium underline mt-2 hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onHide(toast.id)}
        className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}; 