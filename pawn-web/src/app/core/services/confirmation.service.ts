import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

export interface ConfirmationState {
  isOpen: boolean;
  config: ConfirmationConfig | null;
  resolve: ((value: boolean) => void) | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private confirmationState$ = new BehaviorSubject<ConfirmationState>({
    isOpen: false,
    config: null,
    resolve: null
  });

  public state$ = this.confirmationState$.asObservable();

  constructor() {}

  confirm(config: ConfirmationConfig): Promise<boolean> {
    return new Promise((resolve) => {
      const defaultConfig: ConfirmationConfig = {
        title: config.title || 'Confirm Action',
        message: config.message || 'Are you sure?',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        type: config.type || 'warning',
        icon: config.icon || '⚠️'
      };

      this.confirmationState$.next({
        isOpen: true,
        config: defaultConfig,
        resolve
      });
    });
  }

  close(result: boolean) {
    const currentState = this.confirmationState$.value;
    if (currentState.resolve) {
      currentState.resolve(result);
    }
    this.confirmationState$.next({
      isOpen: false,
      config: null,
      resolve: null
    });
  }
}
