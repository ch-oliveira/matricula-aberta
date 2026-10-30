import { ETAPAS, STATUS_INFO } from '../domain/etapas';
import { desatualizado, formatarDistancia, minutosAPe, tempoRelativo } from '../domain/geo';
import type { Resultado } from '../domain/types';
import { Icone, IconeEtapa, IconeUnidade } from './Icone';
import { Ocupacao, StatusPill } from './ui';

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
        <span className="card-avatar" aria-hidden="true">
          <IconeUnidade tipo={escola.tipo} tamanho={24} />
        </span>
        <div className="card-nome">
          <h3 id={tituloId}>{escola.nome}</h3>
          <p>
            {escola.bairro} · <strong>{formatarDistancia(distanciaKm)}</strong> · <Icone nome="walk" tamanho={15} /> {minutosAPe(distanciaKm)} min
          </p>
        </div>
      </div>

      <div className="card-status">
        <StatusPill status={status} grande />
        <span className="card-numero">{s.frase(oferta.vagas, oferta.fila)}</span>
      </div>
      <Ocupacao vagas={oferta.vagas} capacidade={oferta.capacidade} status={status} />

      <ul className="tags" aria-label="Características">
        <li><IconeEtapa etapa={oferta.etapa} tamanho={15} /> {ETAPAS[oferta.etapa].nome}</li>
        <li><Icone nome={oferta.periodo === 'integral' ? 'sun' : 'cloud-sun'} tamanho={15} /> {oferta.periodo === 'integral' ? 'Integral' : 'Meio período'}</li>
        {escola.acessivel && <li><Icone nome="accessibility" tamanho={15} /> Acessível</li>}
        {escola.destaques.slice(0, 2).map((d) => <li key={d}>{d}</li>)}
      </ul>

      <p className={`card-atualizado ${velho ? 'velho' : ''}`}>
        <Icone nome={velho ? 'alert-triangle' : 'refresh'} tamanho={14} />{' '}
        {velho ? 'Dados antigos: ' : 'Atualizado '}
        {tempoRelativo(escola.atualizadoEm, agora)}
        {velho && ' — ligue antes de ir'}
      </p>

      <div className="card-acoes">
        {status === 'espera' ? (
          <button type="button" className="btn btn-secundario" onClick={onAlerta}>
            <Icone nome="bell" tamanho={16} /> Avise-me quando abrir
          </button>
        ) : (
          <button type="button" className="btn btn-primario" onClick={onEscolher}>
            Quero esta escola <span aria-hidden="true">→</span>
          </button>
        )}
        <label className={`btn-comparar ${!podeComparar && !comparando ? 'desligado' : ''}`}>
          <input type="checkbox" checked={comparando} onChange={onComparar} disabled={!podeComparar && !comparando} />
          <span><Icone nome="scale" tamanho={15} /> Comparar</span>
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

