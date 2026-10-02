export interface Toast { id: number; text: string; kind: 'info' | 'warn' | 'good' | 'danger' }
export const toasts = $state<{ list: Toast[] }>({ list: [] });
let n = 0;

export function pushToast(text: string, kind: Toast['kind'] = 'info', ms = 5000) {
  const id = ++n;
  toasts.list.push({ id, text, kind });
  setTimeout(() => dismissToast(id), ms);
}
export function dismissToast(id: number) {
  const i = toasts.list.findIndex((t) => t.id === id);
  if (i >= 0) toasts.list.splice(i, 1);
}
