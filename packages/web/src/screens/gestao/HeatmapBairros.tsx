import type { DemandaBairroDTO } from '../../domain/types';

interface Props {
  demandaPorBairro: DemandaBairroDTO[];
}

export function HeatmapBairros({ demandaPorBairro }: Props) {
  return (
    <div className="heatmap-bairros-grid" aria-label="Mapa de calor de pressão de vagas por bairro">
      {demandaPorBairro.map((b) => {
        const ocupadasMaisDemanda = Math.max(0, b.capacidadeTotal - b.vagasLivres) + b.demandaReprimida;
        const percPressao =
          b.capacidadeTotal > 0 ? Math.min(100, Math.round((ocupadasMaisDemanda / b.capacidadeTotal) * 100)) : 0;

        return (
          <div
            key={`heat-${b.bairro}`}
            className={`heatmap-bairro-card heat-${b.statusPressao}`}
          >
            <div className="heatmap-bairro-topo">
              <div>
                <strong className="heatmap-bairro-nome">{b.bairro}</strong>
                <span className="heatmap-bairro-info">
                  {b.zona} · {b.unidades} {b.unidades === 1 ? 'unidade' : 'unidades'}
                </span>
              </div>
              <span className={`heatmap-bairro-badge badge-pressao-${b.statusPressao}`}>
                {b.statusPressao === 'critico'
                  ? 'Déficit Crítico'
                  : b.statusPressao === 'atencao'
                    ? 'Em Atenção'
                    : 'Equilibrado'}
              </span>
            </div>

            <div className="heatmap-bairro-progresso-bloco">
              <div className="heatmap-bairro-progresso-legenda">
                <span>Saturação de demanda</span>
                <span>{percPressao}%</span>
              </div>
              <div className="heatmap-bairro-trilho">
                <div
                  className={`heatmap-bairro-barra barra-${b.statusPressao}`}
                  style={{ width: `${percPressao}%` }}
                />
              </div>
            </div>

            <div className="heatmap-bairro-rodape">
              <span>
                <strong>{b.vagasLivres}</strong> livres · <strong>{b.demandaReprimida}</strong> na espera/alerta
              </span>
              {b.deficitVagas > 0 ? (
                <strong className="texto-perigo">−{b.deficitVagas} vagas</strong>
              ) : (
                <strong className="texto-ok">Suprido</strong>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

