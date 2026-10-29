import { ETAPAS, STATUS_INFO } from '../domain/etapas';
import { desatualizado, formatarDistancia, minutosAPe, tempoRelativo } from '../domain/geo';
import type { Resultado } from '../domain/types';
import { Ocupacao, StatusPill } from './ui';

const AVATAR: Record<string, string> = { CMEI: '🧸', EMEI: '🎨', EMEF: '📚' };

interface Props {
  r: Resultado;
  agora: number;
  comparando: boolean;
  podeComparar: boolean;
  destaque: boolean;
  onComparar: () => void;
  onEscolher: () => void;
  onAlerta: () => void;
}

export function SchoolCard({ r, agora, comparando, podeComparar, destaque, onComparar, onEscolher, onAlerta }: Props) {
  const { escola, oferta, status, distanciaKm } = r;
  const s = STATUS_INFO[status];
  const velho = desatualizado(escola.atualizadoEm, agora);
  const tituloId = `card-${escola.id}`;

  return (
    <article id={`escola-${escola.id}`} className={`card-escola card-${status} ${destaque ? 'card-flash' : ''}`} aria-labelledby={tituloId}>
      <div className="card-topo">
        <span className="card-avatar" aria-hidden="true">{AVATAR[escola.tipo]}</span>
        <div className="card-nome">
          <h3 id={tituloId}>{escola.nome}</h3>
          <p>
            {escola.bairro} · <strong>{formatarDistancia(distanciaKm)}</strong> · 🚶 {minutosAPe(distanciaKm)} min
          </p>
        </div>
      </div>

      <div className="card-status">
        <StatusPill status={status} grande />
        <span className="card-numero">{s.frase(oferta.vagas, oferta.fila)}</span>
      </div>
      <Ocupacao vagas={oferta.vagas} capacidade={oferta.capacidade} status={status} />

      <ul className="tags" aria-label="Características">
        <li>{ETAPAS[oferta.etapa].emoji} {ETAPAS[oferta.etapa].nome}</li>
        <li>{oferta.periodo === 'integral' ? '🌞 Integral' : '🌤️ Meio período'}</li>
        {escola.acessivel && <li>♿ Acessível</li>}
        {escola.destaques.slice(0, 2).map((d) => <li key={d}>{d}</li>)}
      </ul>

      <p className={`card-atualizado ${velho ? 'velho' : ''}`}>
        {velho ? '⚠️ Dados antigos: ' : '🔄 Atualizado '}
        {tempoRelativo(escola.atualizadoEm, agora)}
        {velho && ' — ligue antes de ir'}
      </p>

      <div className="card-acoes">
        {status === 'espera' ? (
          <button type="button" className="btn btn-secundario" onClick={onAlerta}>
            <span aria-hidden="true">🔔</span> Avise-me quando abrir
          </button>
        ) : (
          <button type="button" className="btn btn-primario" onClick={onEscolher}>
            Quero esta escola <span aria-hidden="true">→</span>
          </button>
        )}
        <label className={`btn-comparar ${!podeComparar && !comparando ? 'desligado' : ''}`}>
          <input type="checkbox" checked={comparando} onChange={onComparar} disabled={!podeComparar && !comparando} />
          <span><span aria-hidden="true">⚖️</span> Comparar</span>
        </label>
      </div>
      {status === 'espera' && (
        <button type="button" className="link-sutil" onClick={onEscolher}>
          Ver documentos e como chegar mesmo assim
        </button>
      )}
    </article>
  );
}

