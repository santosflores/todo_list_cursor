import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

/**
 * Component for displaying toast notifications
 */
@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div 
          class="toast"
          [class.toast-success]="toast.type === 'success'"
          [class.toast-error]="toast.type === 'error'"
          [class.toast-warning]="toast.type === 'warning'"
          [class.toast-info]="toast.type === 'info'">
          
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error') { ✕ }
              @case ('warning') { ⚠ }
              @case ('info') { ℹ }
            }
          </div>
          
          <div class="toast-content">
            <p class="toast-message">{{ toast.message }}</p>
            <small class="toast-time">{{ getTimeAgo(toast.createdAt) }}</small>
          </div>
          
          <button 
            class="toast-close"
            (click)="dismissToast(toast.id)"
            type="button"
            aria-label="Close notification">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 420px;
      pointer-events: none;
    }

    .toast {
      background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
      border-radius: 12px;
      padding: 16px 20px;
      border: 1px solid #e8edf2;
      box-shadow: 
        0 8px 25px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-height: 72px;
      pointer-events: auto;
      transform: translateX(100%);
      opacity: 0;
      animation: toast-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      position: relative;
      overflow: hidden;
    }

    @keyframes toast-slide-in {
      0% {
        transform: translateX(120%) scale(0.8);
        opacity: 0;
      }
      60% {
        transform: translateX(-10%) scale(1.05);
        opacity: 0.8;
      }
      100% {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }

    .toast::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      border-radius: 2px 0 0 2px;
    }

    .toast-success::before {
      background: linear-gradient(180deg, #28a745 0%, #1e7e34 100%);
    }

    .toast-error::before {
      background: linear-gradient(180deg, #dc3545 0%, #bd2130 100%);
    }

    .toast-warning::before {
      background: linear-gradient(180deg, #ffc107 0%, #e0a800 100%);
    }

    .toast-info::before {
      background: linear-gradient(180deg, #17a2b8 0%, #138496 100%);
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      font-size: 16px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .toast-success .toast-icon {
      background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
      color: white;
    }

    .toast-error .toast-icon {
      background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);
      color: white;
    }

    .toast-warning .toast-icon {
      background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
      color: white;
    }

    .toast-info .toast-icon {
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
      color: white;
    }

    .toast-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .toast-message {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      color: #2d3748;
      line-height: 1.4;
    }

    .toast-time {
      color: #a0aec0;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .toast-close {
      background: rgba(0, 0, 0, 0.05);
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #a0aec0;
      font-size: 18px;
      font-weight: 600;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .toast-close:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #718096;
      transform: scale(1.1);
    }

    .toast-close:active {
      transform: scale(1.05);
      background: rgba(0, 0, 0, 0.15);
    }

    /* Toast hover effects */
    .toast:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 
        0 12px 35px rgba(0, 0, 0, 0.15),
        0 6px 16px rgba(0, 0, 0, 0.1);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .toast-container {
        top: 16px;
        right: 16px;
        left: 16px;
        max-width: none;
      }
      
      .toast {
        padding: 14px 16px;
        min-height: 64px;
      }
      
      .toast-message {
        font-size: 14px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  private toastService = inject(ToastService);
  
  // Expose toasts signal
  toasts = this.toastService.toasts;

  /**
   * Dismisses a toast
   */
  dismissToast(id: string): void {
    this.toastService.removeToast(id);
  }

  /**
   * Gets a human-readable time ago string
   */
  getTimeAgo(createdAt: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
  }
}