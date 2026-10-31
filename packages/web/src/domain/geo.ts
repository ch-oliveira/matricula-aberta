import { distanciaKm } from './types';

export { distanciaKm };

export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/** Caminhada leve com criança (~4 km/h). */
export function minutosAPe(km: number): number {
  return Math.max(2, Math.round((km / 4) * 60));
}

export function tempoRelativo(epochMs: number, agora = Date.now()): string {
  const s = Math.max(1, Math.round((agora - epochMs) / 1000));
  if (s < 60) return 'agora mesmo';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

/** Dados com mais de 48h sem confirmação da unidade. */
export function desatualizado(epochMs: number, agora = Date.now()): boolean {
  return agora - epochMs > 48 * 3600 * 1000;
}
