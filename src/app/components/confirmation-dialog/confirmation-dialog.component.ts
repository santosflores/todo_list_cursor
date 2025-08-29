import { Component, ChangeDetectionStrategy, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

/**
 * Modern confirmation dialog component
 */
@Component({
  selector: 'app-confirmation-dialog',
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-overlay" (click)="onCancel()">
        <div class="dialog-container" (click)="$event.stopPropagation()" tabindex="-1">
          <div class="dialog-header">
            <div class="dialog-icon"
                 [class.icon-danger]="data().type === 'danger'"
                 [class.icon-warning]="data().type === 'warning'"
                 [class.icon-info]="data().type === 'info' || !data().type">
              @switch (data().type) {
                @case ('danger') { ⚠️ }
                @case ('warning') { ⚠️ }
                @default { ❓ }
              }
            </div>
            <h3 class="dialog-title">{{ data().title }}</h3>
          </div>

          <div class="dialog-content">
            <p class="dialog-message">{{ data().message }}</p>
          </div>

          <div class="dialog-actions">
            <button
              class="btn btn-secondary"
              (click)="onCancel()"
              type="button">
              {{ data().cancelText || 'Cancel' }}
            </button>
            <button
              class="btn"
              [class.btn-danger]="data().type === 'danger'"
              [class.btn-warning]="data().type === 'warning'"
              [class.btn-primary]="data().type === 'info' || !data().type"
              (click)="onConfirm()"
              type="button">
              {{ data().confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 24px;
      animation: overlay-fade-in 0.2s ease-out;
    }

    @keyframes overlay-fade-in {
      from {
        opacity: 0;
        backdrop-filter: blur(0px);
      }
      to {
        opacity: 1;
        backdrop-filter: blur(4px);
      }
    }

    .dialog-container {
      background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
      border-radius: 16px;
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.2),
        0 10px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid #e8edf2;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow: hidden;
      transform: scale(0.9);
      animation: dialog-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      outline: none;
    }

    .dialog-container:focus {
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.2),
        0 10px 20px rgba(0, 0, 0, 0.1),
        0 0 0 3px rgba(0, 123, 255, 0.3);
    }

    @keyframes dialog-slide-up {
      from {
        transform: scale(0.9) translateY(20px);
        opacity: 0;
      }
      to {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 28px 20px 28px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      background: linear-gradient(145deg, #fafbfc 0%, #ffffff 100%);
    }

    .dialog-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      font-size: 24px;
      flex-shrink: 0;
    }

    .dialog-icon.icon-danger {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #dc2626;
      border: 2px solid rgba(220, 38, 38, 0.2);
    }

    .dialog-icon.icon-warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
      border: 2px solid rgba(217, 119, 6, 0.2);
    }

    .dialog-icon.icon-info {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
      border: 2px solid rgba(37, 99, 235, 0.2);
    }

    .dialog-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a202c;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }

    .dialog-content {
      padding: 24px 28px;
    }

    .dialog-message {
      margin: 0;
      font-size: 16px;
      line-height: 1.6;
      color: #4a5568;
      font-weight: 400;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      padding: 20px 28px 28px 28px;
      justify-content: flex-end;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      background: linear-gradient(145deg, #fafbfc 0%, #ffffff 100%);
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.02em;
      min-width: 100px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
    }

    .btn-secondary {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      color: #495057;
      border: 1px solid #ced4da;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .btn-secondary:hover {
      background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
      color: #343a40;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .btn-danger {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    .btn-danger:hover {
      background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
    }

    .btn-warning {
      background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
    }

    .btn-warning:hover {
      background: linear-gradient(135deg, #e0a800 0%, #c69500 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
    }

    .btn:active {
      transform: translateY(0) scale(0.98);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .dialog-container {
        margin: 16px;
        max-width: none;
        border-radius: 12px;
      }

      .dialog-header,
      .dialog-content,
      .dialog-actions {
        padding-left: 20px;
        padding-right: 20px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        gap: 8px;
      }

      .btn {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationDialogComponent {
  // Input for dialog visibility
  isOpen = input<boolean>(false);

  // Input for dialog configuration
  data = input.required<ConfirmationDialogData>();

  // Output events
  confirm = output<void>();
  cancel = output<void>();

  constructor() {
    // Handle keyboard events when dialog is open
    effect(() => {
      if (this.isOpen()) {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            this.onCancel();
          } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            this.onConfirm();
          }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Focus the dialog for keyboard accessibility
        setTimeout(() => {
          const dialog = document.querySelector('.dialog-container') as HTMLElement;
          dialog?.focus();
        });

        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      }
      return undefined;
    });
  }

  /**
   * Handles confirmation action
   */
  onConfirm(): void {
    this.confirm.emit();
  }

  /**
   * Handles cancel action
   */
  onCancel(): void {
    this.cancel.emit();
  }
}
