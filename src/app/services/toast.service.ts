import { Injectable, signal } from '@angular/core';

/**
 * Represents a toast notification
 */
export interface Toast {
  /** Unique identifier for the toast */
  id: string;
  
  /** Toast message content */
  message: string;
  
  /** Type of toast (determines styling and icon) */
  type: 'success' | 'error' | 'warning' | 'info';
  
  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration: number;
  
  /** Timestamp when the toast was created */
  createdAt: Date;
}

/**
 * Service for managing toast notifications
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly DEFAULT_DURATION = 5000; // 5 seconds
  private _toasts = signal<Toast[]>([]);
  
  /** Read-only signal for current toasts */
  readonly toasts = this._toasts.asReadonly();

  /**
   * Shows a success toast notification
   */
  showSuccess(message: string, duration = this.DEFAULT_DURATION): void {
    this.addToast(message, 'success', duration);
  }

  /**
   * Shows an error toast notification
   */
  showError(message: string, duration = 0): void {
    // Error toasts don't auto-dismiss by default
    this.addToast(message, 'error', duration);
  }

  /**
   * Shows a warning toast notification
   */
  showWarning(message: string, duration = this.DEFAULT_DURATION): void {
    this.addToast(message, 'warning', duration);
  }

  /**
   * Shows an info toast notification
   */
  showInfo(message: string, duration = this.DEFAULT_DURATION): void {
    this.addToast(message, 'info', duration);
  }

  /**
   * Removes a toast by ID
   */
  removeToast(id: string): void {
    this._toasts.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  /**
   * Removes all toasts
   */
  clearAll(): void {
    this._toasts.set([]);
  }

  /**
   * Adds a new toast to the collection
   */
  private addToast(message: string, type: Toast['type'], duration: number): void {
    const toast: Toast = {
      id: this.generateId(),
      message: message.trim(),
      type,
      duration,
      createdAt: new Date()
    };

    this._toasts.update(toasts => [...toasts, toast]);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }
  }

  /**
   * Generates a unique ID for a toast
   */
  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}