import { useSyncExternalStore } from 'react';
import type { EtapaId, Local, Periodo } from '../domain/types';

/**
 * Alertas de nova vaga (integrado ao Backend SQLite /api/v1/alertas com fallback offline).
 * Telefone mascarado e com hash SHA-256 no banco, finalidade única e expiração em 90 dias (LGPD).
 */
export type Canal = 'whatsapp' | 'push';

export interface Alerta {
  id: string;
  canal: Canal;
  telefone?: string;
  etapa: EtapaId;
  periodo: Periodo | 'tanto-faz';
  local: Local;
  raioKm: number;
  escolaId?: string;
  escolaNome?: string;
  criadoEm: number;
}

const KEY = 'ma:alertas:v1';
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
let alertas: Alerta[] = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Alerta[];
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

// Sincroniza alertas existentes na API ao iniciar
if (typeof window !== 'undefined') {
  fetch(`${API_BASE}/api/v1/alertas`)
    .then((r) => (r.ok ? r.json() : null))
    .then((dados: { alertas?: Alerta[] } | null) => {
      if (dados && Array.isArray(dados.alertas)) {
        alertas = dados.alertas;
        salvar();
      }
    })
    .catch(() => {
      /* segue com localStorage offline */
    });
}

export const alertasStore = {
  get: () => alertas,
  subscribe(fn: () => void) {
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  },
  criar(a: Omit<Alerta, 'id' | 'criadoEm'>): Alerta {
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
    alertas = alertas.filter((a) => a.id !== id);
    salvar();
    fetch(`${API_BASE}/api/v1/alertas/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {
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
