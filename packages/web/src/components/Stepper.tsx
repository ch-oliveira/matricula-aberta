export const PASSOS = [
  { id: 0, num: '01', curto: 'Criança', desc: 'Idade ou etapa' },
  { id: 1, num: '02', curto: 'Região', desc: 'GPS ou bairro' },
  { id: 2, num: '03', curto: 'Vagas', desc: 'Escolas e fila' },
  { id: 3, num: '04', curto: 'Visita', desc: 'Checklist final' },
] as const;

interface Props {
  atual: number;
  maxLiberado: number;
  onIr: (passo: number) => void;
}

export function Stepper({ atual, maxLiberado, onIr }: Props) {
  return (
    <nav className="stepper" aria-label="Etapas da consulta">
      <ol>
        {PASSOS.map((p) => {
          const estado = p.id < atual ? 'feito' : p.id === atual ? 'atual' : 'futuro';
          const clicavel = p.id <= maxLiberado && p.id !== atual;
          return (
            <li key={p.id} className={`passo passo-${estado}`} aria-current={p.id === atual ? 'step' : undefined}>
              <button type="button" disabled={!clicavel} onClick={() => onIr(p.id)}>
                <span className="passo-bolha" aria-hidden="true">
                  {estado === 'feito' ? '✓' : p.num}
                </span>
                <span className="passo-textos">
                  <span className="passo-rotulo">
                    <span className="visually-hidden">Etapa {p.id + 1}: </span>
                    {p.curto}
                  </span>
                  <small className="passo-desc">{p.desc}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
