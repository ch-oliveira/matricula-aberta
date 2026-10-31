import { useId, useMemo } from 'react';
import { Icone, IconeEtapa } from '../components/Icone';
import { DicaAjudante, StatusPill, TituloEtapa } from '../components/ui';
import { pulsoDaCidade } from '../domain/busca';
import { calcularEtapa, ETAPAS, ORDEM_ETAPAS, statusDaOferta } from '../domain/etapas';
import type { Busca, EtapaId } from '../domain/types';
import { useEscolas } from '../services/vagasStore';
import { calendar } from '../stickers/icons';

interface Props {
  busca: Busca;
  setBusca: (fn: (b: Busca) => Busca) => void;
  ajudante: boolean;
  erro: string | null;
}

const ATALHOS_IDADE: Array<{ id: EtapaId; rotulo: string; faixa: string; anosRef: number }> = [
  { id: 'bercario', rotulo: 'Até 1 ano', faixa: 'Berçário', anosRef: 1 },
  { id: 'maternal', rotulo: '2 a 3 anos', faixa: 'Maternal', anosRef: 3 },
  { id: 'pre', rotulo: '4 a 5 anos', faixa: 'Pré-escola', anosRef: 5 },
  { id: 'fund1', rotulo: '6 a 10 anos', faixa: 'Fund. I', anosRef: 8 },
  { id: 'fund2', rotulo: '11 a 14 anos', faixa: 'Fund. II', anosRef: 13 },
];

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

  function escolherPorIdade(item: typeof ATALHOS_IDADE[number]) {
    const anoAtual = new Date().getFullYear();
    const anoNasc = anoAtual - item.anosRef;
    const dataEstimada = `${anoNasc}-02-15`;
    const r = calcularEtapa(dataEstimada);
    setBusca((b) => ({
      ...b,
      nascimento: dataEstimada,
      etapa: r.ok ? r.etapa : item.id,
    }));
  }

  return (
    <section className="etapa" aria-labelledby="t-quem">
      <TituloEtapa
        id="t-quem"
        emoji="bercario"
        sticker={calendar}
        titulo="Quem vai estudar?"
        subtitulo="Só precisamos da data de nascimento. Nada de nome ou CPF."
        fala="Primeiro passo: quem vai estudar? Digite a data de nascimento da criança, ou toque direto em uma das faixas de idade logo abaixo. Fique tranquilo, não precisa informar nome nem CPF."
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
            <Icone nome="alert-triangle" tamanho={16} /> {erro}
          </p>
        )}
      </div>

      <div className="atalhos-idade-container" aria-label="Atalhos rápidos por idade">
        <span className="atalhos-idade-rotulo">Ou escolha direto pela idade:</span>
        <div className="atalhos-idade-grade">
          {ATALHOS_IDADE.map((a) => {
            const selecionado = busca.etapa === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={`btn-atalho-idade ${selecionado ? 'selecionado' : ''}`}
                onClick={() => escolherPorIdade(a)}
                aria-pressed={selecionado}
              >
                <IconeEtapa etapa={a.id} tamanho={18} />
                <strong>{a.rotulo}</strong>
                <small>{a.faixa}</small>
              </button>
            );
          })}
        </div>
      </div>

      {calculo && calculo.ok && (
        <div className="resultado-etapa" style={{ ['--cor-etapa' as string]: ETAPAS[calculo.etapa].cor }}>
          <span className="resultado-emoji" aria-hidden="true">
            <IconeEtapa etapa={calculo.etapa} tamanho={30} />
          </span>
          <div>
            <p className="resultado-pre">Em {calculo.ano}, vai para o</p>
            <p className="resultado-turma">{calculo.turma}</p>
            <p className="resultado-sub">{ETAPAS[calculo.etapa].nome} · {calculo.idadeCorte} {calculo.idadeCorte === 1 ? 'ano' : 'anos'} na data de corte (31/03)</p>
          </div>
        </div>
      )}
      {calculo && !calculo.ok && (
        <p className="aviso-suave"><Icone nome="lightbulb" tamanho={17} /> {calculo.motivo}</p>
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
              <span className="chip-etapa-emoji" aria-hidden="true">
                <IconeEtapa etapa={id} tamanho={24} />
              </span>
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
