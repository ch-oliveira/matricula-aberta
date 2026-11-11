import { useId } from 'react';
import { Icone, IconeEtapa } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import { Ocupacao, StatusPill } from '../../components/ui';
import { ETAPAS, statusDaOferta } from '../../domain/etapas';
import type { Oferta } from '../../domain/types';
import { vagasStore } from '../../services/vagasStore';

export function LinhaOferta({ escolaId, oferta }: { escolaId: string; oferta: Oferta }) {
  const e = ETAPAS[oferta.etapa];
  const status = statusDaOferta(oferta);
  const set = (patch: Partial<Pick<Oferta, 'vagas' | 'fila'>>) => {
    vagasStore
      .atualizarOferta(escolaId, oferta.etapa, oferta.periodo, patch)
      .catch((err: unknown) => {
        toast(err instanceof Error ? err.message : 'Falha ao atualizar oferta.', {
          emoji: 'alert-triangle',
          tom: 'aviso',
        });
      });
  };
  const idV = useId();
  const idF = useId();

  return (
    <article className="oferta" style={{ ['--cor-etapa' as string]: e.cor }}>
      <header className="oferta-topo">
        <span className="oferta-emoji" aria-hidden="true">
          <IconeEtapa etapa={oferta.etapa} tamanho={26} />
        </span>
        <div>
          <h2>{e.nome}</h2>
          <p>
            <Icone nome={oferta.periodo === 'integral' ? 'sun' : 'cloud-sun'} tamanho={14} />{' '}
            {oferta.periodo === 'integral' ? 'Integral' : 'Meio período'} · {oferta.capacidade} lugares
          </p>
        </div>
        <StatusPill status={status} />
      </header>
      <Ocupacao vagas={oferta.vagas} capacidade={oferta.capacidade} status={status} />
      <div className="contadores">
        <Contador id={idV} rotulo="Vagas livres" valor={oferta.vagas} max={oferta.capacidade} onMudar={(v) => set({ vagas: v })} />
        <Contador id={idF} rotulo="Lista de espera" valor={oferta.fila} onMudar={(v) => set({ fila: v })} />
      </div>
    </article>
  );
}

export function Contador({
  id,
  rotulo,
  valor,
  max,
  onMudar,
}: {
  id: string;
  rotulo: string;
  valor: number;
  max?: number;
  onMudar: (v: number) => void;
}) {
  return (
    <div className="contador">
      <label htmlFor={id}>{rotulo}</label>
      <div className="contador-controles">
        <button
          type="button"
          aria-label={`Diminuir ${rotulo}`}
          onClick={() => onMudar(Math.max(0, valor - 1))}
          disabled={valor <= 0}
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={valor}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
            onMudar(max !== undefined ? Math.min(max, n) : n);
          }}
        />
        <button
          type="button"
          aria-label={`Aumentar ${rotulo}`}
          onClick={() => onMudar(valor + 1)}
          disabled={max !== undefined && valor >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

