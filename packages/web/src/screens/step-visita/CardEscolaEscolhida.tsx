import { Icone, IconeUnidade } from '../../components/Icone';
import { Ocupacao, StatusPill } from '../../components/ui';
import { ETAPAS, STATUS_INFO } from '../../domain/etapas';
import { formatarDistancia, minutosAPe, tempoRelativo } from '../../domain/geo';
import type { Escola, Oferta, StatusVaga } from '../../domain/types';

interface Props {
  escola: Escola;
  oferta: Oferta;
  turma?: string | null;
  status: StatusVaga;
  distanciaKm: number;
  agora: number;
  mapa: string;
  msgWhats: string;
  onAlerta: (escolaId: string) => void;
}

export function CardEscolaEscolhida({
  escola,
  oferta,
  turma,
  status,
  distanciaKm,
  agora,
  mapa,
  msgWhats,
  onAlerta,
}: Props) {
  return (
    <article className={`card-escola card-${status} card-escolhida`}>
      <div className="card-topo">
        <span className="card-avatar" aria-hidden="true">
          <IconeUnidade tipo={escola.tipo} tamanho={24} />
        </span>
        <div className="card-nome">
          <h2>{escola.nome}</h2>
          <p>{escola.endereco}</p>
        </div>
      </div>
      <div className="card-status">
        <StatusPill status={status} grande />
        <span className="card-numero">{STATUS_INFO[status].frase(oferta.vagas, oferta.fila)}</span>
      </div>
      <Ocupacao vagas={oferta.vagas} capacidade={oferta.capacidade} status={status} />
      <dl className="info-grade">
        <div>
          <dt><Icone nome="backpack" tamanho={15} /> Turma</dt>
          <dd>
            {turma ?? ETAPAS[oferta.etapa].nome} ({oferta.periodo === 'integral' ? 'Integral' : 'Meio período'})
          </dd>
        </div>
        <div>
          <dt><Icone nome="clock" tamanho={15} /> Atendimento</dt>
          <dd>{escola.atendimento}</dd>
        </div>
        <div>
          <dt><Icone nome="walk" tamanho={15} /> Distância</dt>
          <dd>
            {formatarDistancia(distanciaKm)} · {minutosAPe(distanciaKm)} min
          </dd>
        </div>
        <div>
          <dt><Icone nome="bus" tamanho={15} /> Transporte</dt>
          <dd>Atendida pelo transporte escolar municipal</dd>
        </div>
        <div>
          <dt><Icone nome="refresh" tamanho={15} /> Atualizado</dt>
          <dd>{tempoRelativo(escola.atualizadoEm, agora)}</dd>
        </div>
      </dl>
      <div className="acoes-grade">
        <a className="btn btn-primario" href={mapa} target="_blank" rel="noopener noreferrer">
          <Icone nome="map" tamanho={16} /> Como chegar
        </a>
        <a className="btn btn-secundario" href={`tel:${escola.telefone.replace(/\D/g, '')}`}>
          <Icone nome="phone" tamanho={16} /> {escola.telefone}
        </a>
        <a className="btn btn-whats" href={`https://wa.me/?text=${msgWhats}`} target="_blank" rel="noopener noreferrer">
          <Icone nome="message" tamanho={16} /> Enviar no WhatsApp
        </a>
        {status === 'espera' && (
          <button type="button" className="btn btn-secundario" onClick={() => onAlerta(escola.id)}>
            <Icone nome="bell" tamanho={16} /> Avise-me
          </button>
        )}
      </div>
    </article>
  );
}
