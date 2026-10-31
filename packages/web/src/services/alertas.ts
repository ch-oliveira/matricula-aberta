import { useSyncExternalStore } from 'react';
import type { Alerta, Canal } from '../domain/types';

export type { Alerta, Canal };

/**
 * Alertas de nova vaga do cidadão (integrado ao Backend SQLite /api/v1/alertas com fallback offline).
 * Telefone mascarado e com HMAC-SHA256 no banco, finalidade única, token individual de cancelamento
 * e expiração automática em 90 dias (LGPD).
 */
const KEY = 'ma:alertas:cidadao:v2';
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function validarAlertaLocal(item: unknown): item is Alerta {
  if (!item || typeof item !== 'object') return false;
  const a = item as Partial<Alerta>;
  return (
    typeof a.id === 'string' &&
    (a.canal === 'whatsapp' || a.canal === 'push') &&
    typeof a.etapa === 'string' &&
    Boolean(a.local && typeof a.local.lat === 'number' && typeof a.local.lng === 'number') &&
    typeof a.raioKm === 'number'
  );
}

let alertas: Alerta[] = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(validarAlertaLocal) : [];
  } catch {
    return [];
  }
})();

const subs = new Set<() => void>();

function salvar() {
  try {
    localStorage.setItem(KEY, JSON.stringify(alertas));
  } catch {
    /* sem persistência */
  }
  subs.forEach((f) => f());
}

export const alertasStore = {
  get: () => alertas,
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
  criar(a: Omit<Alerta, 'id' | 'criadoEm' | 'tokenCancelamento'>): Alerta {
    const provisorio: Alerta = { ...a, id: crypto.randomUUID(), criadoEm: Date.now() };
    alertas = [provisorio, ...alertas];
    salvar();

    fetch(`${API_BASE}/api/v1/alertas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res: { alerta?: Alerta } | null) => {
        if (res?.alerta) {
          alertas = alertas.map((item) => (item.id === provisorio.id ? res.alerta! : item));
          salvar();
        }
      })
      .catch(() => {
        /* mantém provisório offline */
      });

    return provisorio;
  },
  remover(id: string) {
    const alvo = alertas.find((a) => a.id === id);
    alertas = alertas.filter((a) => a.id !== id);
    salvar();

    const headers: Record<string, string> = {};
    if (alvo?.tokenCancelamento) {
      headers['X-Alert-Token'] = alvo.tokenCancelamento;
    }

    fetch(`${API_BASE}/api/v1/alertas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    }).catch(() => {
      /* ignore offline */
    });
  },
};

export function useAlertas() {
  return useSyncExternalStore(alertasStore.subscribe, alertasStore.get);
}

export async function pedirPermissaoPush(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notificar(titulo: string, corpo: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(titulo, { body: corpo, icon: '/favicon.ico', tag: 'matricula-aberta' });
    } catch {
      /* alguns navegadores móveis só permitem via Service Worker */
    }
  }
}

export function mascararTelefone(t: string): string {
  const d = t.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
