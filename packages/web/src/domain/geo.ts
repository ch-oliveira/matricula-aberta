/** Distância em km entre dois pontos (fórmula de Haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tempo estimado a pé (5 km/h). */
export function minutosAPe(km: number): number {
  return Math.max(1, Math.round((km / 5) * 60));
}

export function formatarDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

export function tempoRelativo(epoch: number, agora = Date.now()): string {
  const min = Math.round((agora - epoch) / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function desatualizado(epoch: number, agora = Date.now()): boolean {
  return agora - epoch > 48 * 3600 * 1000;
}

