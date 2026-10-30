import type { ReactNode } from 'react';
import { STATUS_INFO } from '../domain/etapas';
import type { StatusVaga } from '../domain/types';
import { useFala } from '../hooks';
import type { Icon } from '../stickers/fun';
import { bulb } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';
import { Icone, IconeStatus } from './Icone';

export function StatusPill({ status, grande }: { status: StatusVaga; grande?: boolean }) {
  const s = STATUS_INFO[status];
  return (
    <span className={`pill pill-${status} ${grande ? 'pill-grande' : ''}`}>
      <IconeStatus status={status} tamanho={grande ? 17 : 15} /> {s.rotulo}
    </span>
  );
}

/** Barra de ocupação: quanto da turma está livre agora. */
export function Ocupacao({ vagas, capacidade, status }: { vagas: number; capacidade: number; status: StatusVaga }) {
  const livres = Math.round((vagas / capacidade) * 100);
  return (
    <div className="ocupacao" role="img" aria-label={`${vagas} de ${capacidade} lugares livres`}>
      <div className={`ocupacao-livre ocupacao-${status}`} style={{ inlineSize: `${Math.max(livres, vagas > 0 ? 8 : 0)}%` }} />
    </div>
  );
}

/** Dica exibida no "Modo ajudante" — para o filho/neto que está auxiliando os pais. */
export function DicaAjudante({ ativo, children }: { ativo: boolean; children: ReactNode }) {
  if (!ativo) return null;
  return (
    <aside className="dica-ajudante">
      <div className="dica-sticker" aria-hidden="true">
        <Sticker icon={bulb} replayOnHover style={{ width: 56 }} />
      </div>
      <div>
        <strong><Icone nome="user-heart" tamanho={16} /> Dica para quem está ajudando</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}

/** Título da etapa com sticker isométrico animado e botão "Ouvir". */
export function TituloEtapa({
  id,
  emoji,
  sticker,
  titulo,
  subtitulo,
  fala,
}: {
  id: string;
  emoji?: string;
  sticker?: Icon;
  titulo: string;
  subtitulo?: ReactNode;
  fala: string;
}) {
  const { suportado, falando, falar, parar } = useFala();
  return (
    <div className="titulo-etapa">
      {sticker ? (
        <div className="titulo-sticker" aria-hidden="true">
          <Sticker icon={sticker} enter={0.05} replayOnHover style={{ width: 68 }} />
        </div>
      ) : (
        <span className="titulo-emoji" aria-hidden="true">
          <Icone nome={emoji ?? 'school'} tamanho={32} />
        </span>
      )}
      <div className="titulo-textos">
        <h1 id={id} tabIndex={-1}>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {suportado && (
        <button
          type="button"
          className={`btn-ouvir ${falando ? 'falando' : ''}`}
          onClick={() => (falando ? parar() : falar(fala))}
          aria-pressed={falando}
        >
          <Icone nome={falando ? 'stop' : 'volume'} tamanho={16} /> {falando ? 'Parar' : 'Ouvir'}
        </button>
      )}
    </div>
  );
}
