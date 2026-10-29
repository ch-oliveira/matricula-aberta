import { STATUS_INFO } from '../domain/etapas';
import { formatarDistancia } from '../domain/geo';
import type { Local, Resultado } from '../domain/types';

interface Props {
  centro: Local;
  raioKm: number;
  resultados: Resultado[];
  onSelecionar: (id: string) => void;
}

/**
 * Radar vetorial leve das unidades de Patos - PB ao redor do ponto de partida.
 */
export function RadarMap({ centro, raioKm, resultados, onSelecionar }: Props) {
  const kmLat = 111.32;
  const kmLng = 111.32 * Math.cos((centro.lat * Math.PI) / 180);

  return (
    <div className="radar" role="group" aria-label={`Mapa de unidades de Patos - PB num raio de ${raioKm} km`}>
      <div className="radar-anel" style={{ inset: '0%' }} />
      <div className="radar-anel" style={{ inset: '16.6%' }} />
      <div className="radar-anel" style={{ inset: '33.3%' }} />
      <span className="radar-escala">{raioKm} km · Patos-PB</span>
      <span className="radar-voce" aria-label="Ponto de partida">
        <span aria-hidden="true">🏠</span>
      </span>
      {resultados.map((r) => {
        const dx = (r.escola.lng - centro.lng) * kmLng;
        const dy = (r.escola.lat - centro.lat) * kmLat;
        const x = Math.max(8, Math.min(92, 50 + (dx / raioKm) * 44));
        const y = Math.max(8, Math.min(92, 50 - (dy / raioKm) * 44));
        const nomeCurto = r.escola.nome.replace(/^(Creche Municipal|CMEI|EMEI|EMEF)\s+/i, '');
        return (
          <button
            key={r.escola.id}
            type="button"
            className={`radar-ponto radar-${r.status}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onSelecionar(r.escola.id)}
            aria-label={`${r.escola.nome}, ${formatarDistancia(r.distanciaKm)}, ${STATUS_INFO[r.status].rotulo}`}
          >
            <span aria-hidden="true">{STATUS_INFO[r.status].icone}</span>
            <span className="radar-nome" aria-hidden="true">{nomeCurto}</span>
          </button>
        );
      })}
    </div>
  );
}
