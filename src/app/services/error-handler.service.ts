import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Comprehensive error handling service for the application
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private toastService = inject(ToastService);
  
  /**
   * Handles errors with appropriate user feedback and recovery options
   */
  handleError(error: unknown, context: string, showToast: boolean = true): void {
    console.error(`Error in ${context}:`, error);
    
    let userMessage = 'An unexpected error occurred';
    let recoveryAction: (() => void) | null = null;
    
    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('quota') || error.message.includes('storage')) {
        userMessage = 'Storage space is full. Clear some browser data or remove old tasks to continue.';
        recoveryAction = () => this.showStorageRecoveryOptions();
      } else if (error.message.includes('exceed') || error.message.includes('character')) {
        userMessage = error.message;
      } else if (error.message.includes('required')) {
        userMessage = error.message;
      } else if (error.message.includes('not found')) {
        userMessage = 'Data synchronization issue detected. The page will refresh to restore consistency.';
        recoveryAction = () => this.refreshPage();
      } else if (error.message.includes('JSON')) {
        userMessage = 'Data corruption detected. Attempting to repair automatically.';
        recoveryAction = () => this.attemptDataRepair();
      } else {
        userMessage = `Something went wrong in ${context}. Please try again.`;
      }
    }
    
    if (showToast) {
      this.toastService.showError(userMessage, 6000);
      
      // Execute recovery action if available
      if (recoveryAction) {
        setTimeout(recoveryAction, 2000);
      }
    }
  }
  
  /**
   * Validates input and throws user-friendly errors
   */
  validateTaskInput(title: string, description?: string): void {
    const trimmedTitle = title?.trim();
    
    if (!trimmedTitle) {
      throw new Error('Task title is required and cannot be empty');
    }
    
    if (trimmedTitle.length > 128) {
      throw new Error('Task title cannot exceed 128 characters');
    }
    
    if (description && description.length > 256) {
      throw new Error('Task description cannot exceed 256 characters');
    }
  }
  
  /**
   * Handles storage errors specifically
   */
  handleStorageError(error: unknown): never {
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        throw new Error('Storage quota exceeded. Please clear some browser data and try again.');
      } else if (error.message.includes('localStorage')) {
        throw new Error('Browser storage is not available. Please check your browser settings.');
      }
    }
    
    throw new Error('Failed to access browser storage. Please check your browser settings and try again.');
  }
  
  /**
   * Provides recovery options for storage issues
   */
  private showStorageRecoveryOptions(): void {
    const confirmClearOldTasks = confirm(
      'Your browser storage is full. Would you like to automatically remove completed tasks older than 30 days? This will free up space for new tasks.'
    );
    
    if (confirmClearOldTasks) {
      try {
        // This would need to be implemented in the TaskService
        this.toastService.showInfo('Cleaning up old tasks...', 3000);
        // Emit an event that TaskService can listen to for cleanup
        window.dispatchEvent(new CustomEvent('cleanup-old-tasks'));
      } catch (error) {
        this.toastService.showError('Failed to clean up old tasks. Please manually remove some tasks.');
      }
    } else {
      this.toastService.showInfo('You can manually delete old tasks or clear browser data to free up space.');
    }
  }
  
  /**
   * Refreshes the page as a recovery mechanism
   */
  private refreshPage(): void {
    window.location.reload();
  }
  
  /**
   * Attempts to repair corrupted data
   */
  private attemptDataRepair(): void {
    try {
      // Clear corrupted data and start fresh
      localStorage.removeItem('daily-tasks');
      localStorage.removeItem('daily-tasks-version');
      
      this.toastService.showSuccess('Data repaired successfully. Starting with a clean slate.');
      
      // Refresh to reinitialize
      setTimeout(() => this.refreshPage(), 2000);
    } catch (error) {
      this.toastService.showError('Unable to repair data automatically. Please clear browser data manually.');
    }
  }
}