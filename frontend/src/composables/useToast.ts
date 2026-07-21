import { reactive } from 'vue';

export type ToastVariant = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

let nextId = 1;
const toasts = reactive<ToastMessage[]>([]);

function dismiss(id: number): void {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

function push(message: string, variant: ToastVariant = 'neutral', duration = 4000): number {
  const id = nextId++;
  toasts.push({ id, message, variant, duration });
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }
  return id;
}

export function useToast() {
  return {
    toasts,
    dismiss,
    show: push,
    success: (message: string, duration?: number) => push(message, 'success', duration),
    warning: (message: string, duration?: number) => push(message, 'warning', duration),
    error: (message: string, duration?: number) => push(message, 'danger', duration),
  };
}
