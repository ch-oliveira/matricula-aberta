import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  texto: string;
  emoji?: string;
  tom?: 'ok' | 'info' | 'aviso';
}

let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function toast(texto: string, opts: Omit<Toast, 'id' | 'texto'> = {}) {
  const t = { id: ++seq, texto, ...opts };
  toasts = [...toasts, t].slice(-3);
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, 5000);
}

export function Toasts() {
  const lista = useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => toasts,
  );
  return (
    <div className="toasts" role="status" aria-live="polite">
      {lista.map((t) => (
        <div key={t.id} className={`toast toast-${t.tom ?? 'info'}`}>
          {t.emoji && <span aria-hidden="true" className="toast-emoji">{t.emoji}</span>}
          <span>{t.texto}</span>
        </div>
      ))}
    </div>
  );
}

