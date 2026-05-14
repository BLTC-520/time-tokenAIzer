'use client';

import { getAlertAgent } from '../services/alertAgent';

export interface ErrorDetails {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'contract' | 'validation' | 'auth' | 'storage' | 'api' | 'system';
  details?: any;
  timestamp: number;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  chainId?: number;
  contractAddress?: string;
  transactionHash?: string;
  details?: any;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private alertAgent = getAlertAgent();
  private errorLog: ErrorDetails[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Main error handling method
  handleError(
    error: Error | unknown, 
    context: ErrorContext,
    options: { showNotification?: boolean; logToConsole?: boolean } = {}
  ): ErrorDetails {
    const { showNotification = true, logToConsole = true } = options;

    // Parse error details
    const errorDetails = this.parseError(error, context);
    
    // Log error
    this.logError(errorDetails, logToConsole);
    
    // Show user notification if appropriate
    if (showNotification && this.shouldShowNotification(errorDetails)) {
      this.showErrorNotification(errorDetails);
    }
    
    // Store error for debugging
    this.storeError(errorDetails);
    
    return errorDetails;
  }

  // Parse different error types into standardized format
  private parseError(error: Error | unknown, context: ErrorContext): ErrorDetails {
    const timestamp = Date.now();
    let code = 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred';
    let severity: ErrorDetails['severity'] = 'medium';
    let category: ErrorDetails['category'] = 'system';
    let details: any = null;

    // Handle different error types
    if (error instanceof Error) {
      message = error.message;
      details = {
        name: error.name,
        stack: error.stack,
        cause: error.cause
      };

      // Parse specific error patterns
      if (this.isNetworkError(error)) {
        category = 'network';
        code = 'NETWORK_ERROR';
        severity = 'high';
        message = this.getNetworkErrorMessage(error);
      } else if (this.isContractError(error)) {
        category = 'contract';
        code = this.getContractErrorCode(error);
        severity = 'high';
        message = this.getContractErrorMessage(error);
      } else if (this.isValidationError(error)) {
        category = 'validation';
        code = 'VALIDATION_ERROR';
        severity = 'medium';
        message = this.getValidationErrorMessage(error);
      } else if (this.isAuthError(error)) {
        category = 'auth';
        code = 'AUTH_ERROR';
        severity = 'high';
        message = 'Authentication failed. Please reconnect your wallet.';
      } else if (this.isStorageError(error)) {
        category = 'storage';
        code = 'STORAGE_ERROR';
        severity = 'medium';
        message = 'Failed to save data. Please try again.';
      }
    } else if (typeof error === 'string') {
      message = error;
      code = 'STRING_ERROR';
    } else if (error && typeof error === 'object') {
      // Handle structured error objects
      const errorObj = error as any;
      code = errorObj.code || 'OBJECT_ERROR';
      message = errorObj.message || errorObj.reason || JSON.stringify(error);
      details = errorObj;
      
      // Parse wagmi/viem specific errors
      if (errorObj.name === 'TransactionExecutionError') {
        category = 'contract';
        severity = 'high';
        code = 'TRANSACTION_FAILED';
      } else if (errorObj.name === 'UserRejectedRequestError') {
        category = 'auth';
        severity = 'low';
        code = 'USER_REJECTED';
        message = 'Transaction was rejected by user';
      }
    }

    return {
      code,
      message,
      severity,
      category,
      details: {
        ...details,
        context,
        originalError: error
      },
      timestamp
    };
  }

  // Network error detection and handling
  private isNetworkError(error: Error): boolean {
    const networkPatterns = [
      'network',
      'fetch',
      'connection',
      'timeout',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ERR_NETWORK'
    ];
    return networkPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern) ||
      error.name.toLowerCase().includes(pattern)
    );
  }

  private getNetworkErrorMessage(error: Error): string {
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please check your internet connection and try again.';
    }
    if (error.message.includes('fetch')) {
      return 'Failed to connect to server. Please check your internet connection.';
    }
    return 'Network error occurred. Please check your connection and try again.';
  }

  // Contract error detection and handling
  private isContractError(error: Error): boolean {
    const contractPatterns = [
      'contract',
      'revert',
      'execution reverted',
      'insufficient funds',
      'gas',
      'nonce',
      'transaction failed'
    ];
    return contractPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  private getContractErrorCode(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes('insufficient funds')) return 'INSUFFICIENT_FUNDS';
    if (message.includes('gas')) return 'GAS_ERROR';
    if (message.includes('nonce')) return 'NONCE_ERROR';
    if (message.includes('revert')) return 'CONTRACT_REVERT';
    return 'CONTRACT_ERROR';
  }

  private getContractErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    if (message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction. Please check your wallet balance.';
    }
    if (message.includes('gas')) {
      return 'Transaction failed due to gas issues. Please try again with higher gas.';
    }
    if (message.includes('user rejected')) {
      return 'Transaction was rejected. Please try again.';
    }
    return 'Smart contract transaction failed. Please try again.';
  }

  // Validation error handling
  private isValidationError(error: Error): boolean {
    const validationPatterns = [
      'validation',
      'invalid',
      'required',
      'must be',
      'expected'
    ];
    return validationPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  private getValidationErrorMessage(error: Error): string {
    return `Validation failed: ${error.message}`;
  }

  // Authentication error handling
  private isAuthError(error: Error): boolean {
    const authPatterns = [
      'unauthorized',
      'authentication',
      'wallet',
      'connect',
      'signature'
    ];
    return authPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  // Storage error handling
  private isStorageError(error: Error): boolean {
    const storagePatterns = [
      'localstorage',
      'storage',
      'quota',
      'setitem',
      'getitem'
    ];
    return storagePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  // Determine if error should show user notification
  private shouldShowNotification(error: ErrorDetails): boolean {
    // Don't show notifications for low severity or user-rejected errors
    if (error.severity === 'low' || error.code === 'USER_REJECTED') {
      return false;
    }
    
    // Don't show duplicate notifications for the same error within 30 seconds
    const recentSimilarError = this.errorLog.find(logged => 
      logged.code === error.code &&
      logged.timestamp > Date.now() - 30000
    );
    
    return !recentSimilarError;
  }

  // Show user-friendly error notification
  private showErrorNotification(error: ErrorDetails): void {
    const title = this.getErrorTitle(error);
    const message = this.getUserFriendlyMessage(error);
    const priority = this.mapSeverityToPriority(error.severity);

    this.alertAgent.addNotification({
      type: 'system',
      title,
      message,
      priority
    });
  }

  private getErrorTitle(error: ErrorDetails): string {
    switch (error.category) {
      case 'network': return '🌐 Connection Error';
      case 'contract': return '⛓️ Transaction Error';
      case 'validation': return '⚠️ Validation Error';
      case 'auth': return '🔐 Authentication Error';
      case 'storage': return '💾 Storage Error';
      case 'api': return '🔌 API Error';
      default: return '❌ System Error';
    }
  }

  private getUserFriendlyMessage(error: ErrorDetails): string {
    // Return user-friendly messages that avoid technical jargon
    switch (error.code) {
      case 'INSUFFICIENT_FUNDS':
        return 'Not enough funds in your wallet for this transaction.';
      case 'USER_REJECTED':
        return 'Transaction was cancelled.';
      case 'NETWORK_ERROR':
        return 'Connection issue. Please check your internet and try again.';
      case 'CONTRACT_REVERT':
        return 'Transaction failed. Please check the details and try again.';
      case 'GAS_ERROR':
        return 'Transaction failed due to network fees. Please try again.';
      case 'AUTH_ERROR':
        return 'Please reconnect your wallet and try again.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      default:
        return error.message.length > 100 
          ? 'Something went wrong. Please try again.' 
          : error.message;
    }
  }

  private mapSeverityToPriority(severity: ErrorDetails['severity']): 'low' | 'medium' | 'high' | 'urgent' {
    switch (severity) {
      case 'low': return 'low';
      case 'medium': return 'medium';
      case 'high': return 'high';
      case 'critical': return 'urgent';
      default: return 'medium';
    }
  }

  // Log error for debugging
  private logError(error: ErrorDetails, logToConsole: boolean = true): void {
    if (logToConsole) {
      const logMethod = error.severity === 'critical' ? console.error : 
                       error.severity === 'high' ? console.error :
                       error.severity === 'medium' ? console.warn : 
                       console.log;

      logMethod(`[${error.category.toUpperCase()}] ${error.code}:`, error.message, error.details);
    }
  }

  // Store error for debugging and analytics
  private storeError(error: ErrorDetails): void {
    this.errorLog.push(error);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Store in localStorage for persistence (optional) - only in browser
    if (typeof window !== 'undefined') {
      try {
        const storedErrors = JSON.parse(localStorage.getItem('timeTokenizer_errorLog') || '[]');
        storedErrors.push(error);
        
        // Keep only last 50 errors in localStorage
        const recentErrors = storedErrors.slice(-50);
        localStorage.setItem('timeTokenizer_errorLog', JSON.stringify(recentErrors));
      } catch (storageError) {
        console.warn('Failed to store error in localStorage:', storageError);
      }
    }
  }

  // Get error statistics for debugging
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: ErrorDetails[];
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorLog.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: this.errorLog.length,
      byCategory,
      bySeverity,
      recent: this.errorLog.slice(-10)
    };
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('timeTokenizer_errorLog');
      } catch (error) {
        console.warn('Failed to clear error log from localStorage:', error);
      }
    }
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Helper function for easy error handling
export const handleError = (
  error: Error | unknown,
  context: ErrorContext,
  options?: { showNotification?: boolean; logToConsole?: boolean }
): ErrorDetails => {
  return errorHandler.handleError(error, context, options);
};

// React hook for error handling
export const useErrorHandler = () => {
  const handleError = (
    error: Error | unknown,
    action: string,
    component: string = 'Unknown'
  ) => {
    return errorHandler.handleError(error, { component, action });
  };

  const getErrorStats = () => errorHandler.getErrorStats();
  const clearErrors = () => errorHandler.clearErrorLog();

  return { handleError, getErrorStats, clearErrors };
};

// Error boundary helper
export const createErrorBoundary = (componentName: string) => {
  return (error: Error, errorInfo: any) => {
    errorHandler.handleError(error, {
      component: componentName,
      action: 'component_render',
      details: errorInfo
    });
  };
};

export default ErrorHandler;
