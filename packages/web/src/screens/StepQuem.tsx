import { useId, useMemo } from 'react';
import { pulsoDaCidade } from '../domain/busca';
import { calcularEtapa, ETAPAS, ORDEM_ETAPAS, statusDaOferta } from '../domain/etapas';
import type { Busca, EtapaId } from '../domain/types';
import { useEscolas } from '../services/vagasStore';
import { calendar } from '../stickers/icons';
import { DicaAjudante, StatusPill, TituloEtapa } from '../components/ui';

interface Props {
  busca: Busca;
  setBusca: (fn: (b: Busca) => Busca) => void;
  ajudante: boolean;
  erro: string | null;
}

export function StepQuem({ busca, setBusca, ajudante, erro }: Props) {
  const escolas = useEscolas();
  const pulso = useMemo(() => pulsoDaCidade(escolas), [escolas]);
  const idData = useId();
  const idErro = useId();
  const hoje = new Date().toISOString().slice(0, 10);

  const calculo = busca.nascimento ? calcularEtapa(busca.nascimento) : null;

  function aoMudarData(v: string) {
    const r = v ? calcularEtapa(v) : null;
    setBusca((b) => ({ ...b, nascimento: v || null, etapa: r && r.ok ? r.etapa : null }));
  }

  function escolherEtapa(etapa: EtapaId) {
    setBusca((b) => ({ ...b, etapa, nascimento: null }));
  }

  return (
    <section className="etapa" aria-labelledby="t-quem">
      <TituloEtapa
        id="t-quem"
        emoji="👶"
        sticker={calendar}
        titulo="Quem vai estudar?"
        subtitulo="Só precisamos da data de nascimento. Nada de nome ou CPF."
        fala="Quem vai estudar? Digite a data de nascimento da criança. Não precisa de nome nem de CPF. Ou toque direto na etapa da escola."
      />

      <div className="campo">
        <label htmlFor={idData}>Data de nascimento da criança</label>
        <input
          id={idData}
          name="nascimento"
          type="date"
          max={hoje}
          min="2008-01-01"
          value={busca.nascimento ?? ''}
          onChange={(e) => aoMudarData(e.target.value)}
          aria-describedby={erro ? idErro : undefined}
          aria-invalid={erro ? true : undefined}
          enterKeyHint="next"
        />
        {erro && (
          <p id={idErro} className="erro-campo" role="alert">
            <span aria-hidden="true">⚠️</span> {erro}
          </p>
        )}
      </div>

      {calculo && calculo.ok && (
        <div className="resultado-etapa" style={{ ['--cor-etapa' as string]: ETAPAS[calculo.etapa].cor }}>
          <span className="resultado-emoji" aria-hidden="true">{ETAPAS[calculo.etapa].emoji}</span>
          <div>
            <p className="resultado-pre">Em {calculo.ano}, vai para o</p>
            <p className="resultado-turma">{calculo.turma}</p>
            <p className="resultado-sub">{ETAPAS[calculo.etapa].nome} · {calculo.idadeCorte} {calculo.idadeCorte === 1 ? 'ano' : 'anos'} na data de corte (31/03)</p>
          </div>
        </div>
      )}
      {calculo && !calculo.ok && (
        <p className="aviso-suave"><span aria-hidden="true">💡</span> {calculo.motivo}</p>
      )}

      <DicaAjudante ativo={ajudante}>
        A data de nascimento está na certidão ou no cartão de vacina. Se não souber, toque direto na etapa abaixo.
      </DicaAjudante>

      <fieldset className="grade-etapas">
        <legend>Ou escolha direto a etapa — e veja como estão as vagas:</legend>
        {ORDEM_ETAPAS.map((id) => {
          const e = ETAPAS[id];
          const p = pulso[id];
          const status = statusDaOferta({ vagas: p.vagas });
          return (
            <label key={id} className="chip-etapa" style={{ ['--cor-etapa' as string]: e.cor }}>
              <input type="radio" name="etapa" value={id} checked={busca.etapa === id} onChange={() => escolherEtapa(id)} />
              <span className="chip-etapa-emoji" aria-hidden="true">{e.emoji}</span>
              <span className="chip-etapa-nome">{e.nome}</span>
              <span className="chip-etapa-faixa">{e.faixa}</span>
              <span className="chip-etapa-vagas">
                <StatusPill status={status} />
                <small>{p.vagas} vagas · {p.escolasComVaga} escolas</small>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
