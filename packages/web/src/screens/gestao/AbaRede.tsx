import { Icone, IconeEtapa } from '../../components/Icone';
import { Ocupacao } from '../../components/ui';
import { statusDaOferta } from '../../domain/etapas';
import { desatualizado, tempoRelativo } from '../../domain/geo';
import type { PainelSecretariaDTO } from '../../domain/types';
import { HeatmapBairros } from './HeatmapBairros';

interface Props {
  painel: PainelSecretariaDTO;
  agora: number;
  onAbrirUnidade: (id: string) => void;
}

export function AbaRede({ painel, agora, onAbrirUnidade }: Props) {
  const { kpis } = painel;

  return (
    <>
      {/* KPIs Macro da Rede Municipal de Patos-PB */}
      <section className="kpis-secretaria-grid" aria-label="Indicadores globais da rede de Patos - PB">
        <div className="kpi-card">
          <div className="kpi-card-topo">
            <span className="kpi-card-rotulo">Vagas Livres</span>
            <Icone nome="school" tamanho={16} />
          </div>
          <div className="kpi-card-valor kpi-destaque-ok">{kpis.vagasLivres}</div>
          <div className="kpi-card-contexto">de {kpis.capacidadeRede.toLocaleString('pt-BR')} vagas na rede municipal</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-topo">
            <span className="kpi-card-rotulo">Taxa de Ocupação</span>
            <Icone nome="radar" tamanho={16} />
          </div>
          <div className="kpi-card-valor">{kpis.taxaOcupacao}%</div>
          <div className="kpi-card-contexto">ocupação média em {kpis.totalUnidades} unidades</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-topo">
            <span className="kpi-card-rotulo">Demanda Reprimida</span>
            <Icone nome="bell" tamanho={16} />
          </div>
          <div className="kpi-card-valor kpi-destaque-alerta">{kpis.filaEsperaTotal + kpis.alertasAtivosTotal}</div>
          <div className="kpi-card-contexto">{kpis.filaEsperaTotal} na fila · {kpis.alertasAtivosTotal} alertas WhatsApp</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-topo">
            <span className="kpi-card-rotulo">Protocolos QR</span>
            <Icone nome="qr-code" tamanho={16} />
          </div>
          <div className="kpi-card-valor kpi-destaque-primario">{kpis.protocolosAguardando}</div>
          <div className="kpi-card-contexto">aguardando · {kpis.protocolosAtendidos} já confirmados</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-topo">
            <span className="kpi-card-rotulo">Absenteísmo</span>
            <Icone nome="trending-down" tamanho={16} />
          </div>
          <div className="kpi-card-valor">{kpis.taxaAbsenteismo ?? 0}%</div>
          <div className="kpi-card-contexto">{kpis.protocolosExpirados ?? 0} expirados sem comparecimento</div>
        </div>
      </section>

      {/* Ranking de Demanda Reprimida por Bairro de Patos - PB */}
      <section className="sec-bloco demanda-bairro-bloco" aria-labelledby="t-demanda-bairros">
        <div className="sec-bloco-topo">
          <div>
            <h2 id="t-demanda-bairros">
              <Icone nome="pin" tamanho={20} /> Demanda Reprimida por Bairro em Patos - PB
            </h2>
            <p className="legenda">
              Cruzamento em tempo real entre vagas abertas, fila de espera nas unidades e famílias com alerta ativo no
              WhatsApp/Push para planejamento de abertura de novas turmas.
            </p>
          </div>
        </div>

        {/* Mapa de Calor (Heatmap) de Pressão por Bairro */}
        <HeatmapBairros demandaPorBairro={painel.demandaPorBairro} />

        <div className="tabela-quadro-container" role="region" aria-labelledby="t-demanda-bairros">
          <table className="tabela-secretaria tabela-demanda-quadro">
            <thead>
              <tr>
                <th scope="col" className="col-bairro">
                  <span className="vis-desktop">Bairro (Patos - PB)</span>
                  <span className="vis-mobile">Bairro</span>
                </th>
                <th scope="col" className="col-unidades vis-desktop">Unidades</th>
                <th scope="col" className="col-vagas">
                  <span className="vis-desktop">Vagas livres</span>
                  <span className="vis-mobile">Vagas</span>
                </th>
                <th scope="col" className="col-fila">
                  <span className="vis-desktop">Fila + Alertas <Icone nome="bell" tamanho={13} /></span>
                  <span className="vis-mobile">Demanda <Icone nome="bell" tamanho={11} /></span>
                </th>
                <th scope="col" className="col-deficit vis-desktop">Déficit líquido</th>
                <th scope="col" className="col-situacao">Situação</th>
              </tr>
            </thead>
            <tbody>
              {painel.demandaPorBairro.map((b) => (
                <tr key={b.bairro} className={`linha-${b.statusPressao}`}>
                  <td className="col-bairro">
                    <strong className="nome-bairro">{b.bairro}</strong>
                    <small className="celula-sub">
                      {b.zona}
                      <span className="vis-mobile"> · {b.unidades} unid.</span>
                    </small>
                  </td>
                  <td className="col-unidades vis-desktop">{b.unidades}</td>
                  <td className="col-vagas">
                    <strong>{b.vagasLivres}</strong>
                    <small className="celula-sub">/ {b.capacidadeTotal}</small>
                  </td>
                  <td className="col-fila">
                    <strong>{b.demandaReprimida}</strong>
                    <small className="celula-sub vis-desktop">
                      ({b.filaEspera} fila · {b.alertasAtivos} alertas)
                    </small>
                    <small className="celula-sub vis-mobile">
                      {b.filaEspera} fila · {b.alertasAtivos}🔔
                    </small>
                  </td>
                  <td className="col-deficit vis-desktop">
                    {b.deficitVagas > 0 ? (
                      <strong className="texto-perigo">−{b.deficitVagas} vagas</strong>
                    ) : (
                      <span className="texto-ok">Suprido</span>
                    )}
                  </td>
                  <td className="col-situacao">
                    <div className="vis-desktop">
                      <span className={`pilula-pressao pressao-${b.statusPressao}`}>
                        {b.statusPressao === 'critico' ? (
                          <>
                            <Icone nome="alert-triangle" tamanho={13} /> Alta pressão
                          </>
                        ) : b.statusPressao === 'atencao' ? (
                          <>
                            <Icone nome="bolt" tamanho={13} /> Em atenção
                          </>
                        ) : (
                          <>
                            <Icone nome="check-circle" tamanho={13} /> Equilibrado
                          </>
                        )}
                      </span>
                    </div>
                    <div className="vis-mobile celula-situacao-mobile">
                      {b.deficitVagas > 0 ? (
                        <span className="badge-saldo-mobile saldo-critico">−{b.deficitVagas} vagas</span>
                      ) : (
                        <span className="badge-saldo-mobile saldo-suprido">Suprido</span>
                      )}
                      <small className={`status-sub-mobile status-${b.statusPressao}`}>
                        {b.statusPressao === 'critico' ? 'Alta pressão' : b.statusPressao === 'atencao' ? 'Em atenção' : 'Equilibrado'}
                      </small>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Balanço por Etapa de Ensino e Unidades em Atenção */}
      <div className="secretaria-duas-colunas">
        <section className="sec-bloco" aria-labelledby="t-balanco-etapas">
          <h2 id="t-balanco-etapas">
            <Icone nome="backpack" tamanho={20} /> Balanço por Etapa de Ensino
          </h2>
          <p className="legenda">Capacidade instalada vs. vagas abertas hoje na rede de Patos - PB.</p>
          <div className="etapas-macro-lista">
            {painel.resumoPorEtapa.map((item) => {
              const st = statusDaOferta({ vagas: item.vagasLivres });
              return (
                <div key={item.etapa} className="etapa-macro-item">
                  <div className="etapa-macro-topo">
                    <strong>
                      <IconeEtapa etapa={item.etapa} tamanho={18} /> {item.nome}
                    </strong>
                    <span>
                      <strong>{item.vagasLivres} livres</strong> · {item.taxaOcupacao}% ocupada
                    </span>
                  </div>
                  <Ocupacao vagas={item.vagasLivres} capacidade={item.capacidadeTotal} status={st} />
                  <div className="etapa-macro-rodape">
                    <span>Capacidade: {item.capacidadeTotal} lugares</span>
                    <span>
                      Fila: <strong>{item.filaEspera}</strong> · Alertas: <strong>{item.alertasAtivos}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="sec-bloco" aria-labelledby="t-unidades-atencao">
          <h2 id="t-unidades-atencao">
            <Icone nome="alert-triangle" tamanho={20} /> Unidades com Fila ou Atualização Pendente
          </h2>
          <p className="legenda">
            Unidades com lista de espera ativa ou há mais de 48h sem confirmação cadastral.
          </p>
          <ul className="unidades-atencao-lista">
            {painel.unidadesAtencao.map((u) => {
              const velho = desatualizado(u.atualizadoEm, agora);
              return (
                <li key={u.id} className="unidade-atencao-card">
                  <div>
                    <strong>{u.nome}</strong>
                    <small>
                      {u.bairro} · Atualizado {tempoRelativo(u.atualizadoEm, agora)}
                    </small>
                    <div className="unidade-atencao-badges">
                      {u.filaTotal > 0 && (
                        <span className="badge-mini badge-fila">
                          <Icone nome="hourglass" tamanho={12} /> {u.filaTotal} na fila
                        </span>
                      )}
                      {velho && (
                        <span className="badge-mini badge-velho">
                          <Icone nome="alert-triangle" tamanho={12} /> +48h sem confirmar
                        </span>
                      )}
                      <span className="badge-mini">{u.vagasLivres} vagas livres</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secundario btn-pequeno"
                    onClick={() => onAbrirUnidade(u.id)}
                  >
                    Abrir unidade →
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
