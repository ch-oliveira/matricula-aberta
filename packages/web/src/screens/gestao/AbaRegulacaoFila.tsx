import { Icone, IconeEtapa } from '../../components/Icone';
import { ETAPAS } from '../../domain/etapas';
import {
  CRITERIOS_VULNERABILIDADE,
  LISTA_CRITERIOS_VULNERABILIDADE,
  ORDEM_ETAPAS,
  type EtapaId,
  type FilaItemAuditavel,
} from '../../domain/types';

interface Props {
  filaAuditavel: FilaItemAuditavel[];
  etapaFiltro: EtapaId | 'todas';
  setEtapaFiltro: (etapa: EtapaId | 'todas') => void;
  buscaFila: string;
  setBuscaFila: (busca: string) => void;
  carregandoFila: boolean;
  onExportarCsv: () => void;
}

export function AbaRegulacaoFila({
  filaAuditavel,
  etapaFiltro,
  setEtapaFiltro,
  buscaFila,
  setBuscaFila,
  carregandoFila,
  onExportarCsv,
}: Props) {
  return (
    <section className="sec-bloco sec-bloco-coluna">
      <div className="sec-bloco-topo-wrap">
        <div>
          <h2 className="titulo-com-icone">
            <Icone nome="scale" tamanho={22} /> Regulação Municipal & Fila Unificada Auditável
          </h2>
          <p className="legenda sem-margem-topo">
            Classificação determinística por pontuação objetiva de vulnerabilidade e prioridades legais (Marco Legal da 1ª Infância, ECA art. 53, Lei 12.764/12 TEA).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secundario btn-pequeno"
          onClick={onExportarCsv}
          disabled={filaAuditavel.length === 0}
        >
          <Icone nome="file-text" tamanho={14} /> Exportar Fila Regulada (CSV)
        </button>
      </div>

      {/* Banner de Critérios Legais */}
      <div className="criterios-banner-seduc">
        <div className="criterios-banner-topo">
          <span className="criterios-banner-titulo">
            <Icone nome="scale" tamanho={18} /> Critérios Legais de Desempate e Vulnerabilidade Ativos (Patos - PB)
          </span>
          <span className="criterios-banner-sub">
            Marco Legal da 1ª Infância (Lei 13.257/16), ECA art. 53 e Lei 12.764/12 (TEA)
          </span>
        </div>
        <div className="criterios-chips-grid">
          {LISTA_CRITERIOS_VULNERABILIDADE.map((c) => (
            <div key={c.id} className="criterio-chip" title={c.descricao}>
              <strong>+{c.pontos} pts</strong>
              <span>{c.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros da Fila */}
      <div className="toolbar-filtro-fila">
        <div className="toolbar-filtro-chips">
          <span className="rotulo-filtro-etapa">
            Etapa:
          </span>
          <button
            type="button"
            className={`filtro-chip-btn ${etapaFiltro === 'todas' ? 'ativo' : ''}`}
            onClick={() => setEtapaFiltro('todas')}
          >
            Todas as Etapas
          </button>
          {ORDEM_ETAPAS.map((eid) => (
            <button
              key={eid}
              type="button"
              className={`filtro-chip-btn ${etapaFiltro === eid ? 'ativo' : ''}`}
              onClick={() => setEtapaFiltro(eid)}
            >
              <IconeEtapa etapa={eid} tamanho={14} /> {ETAPAS[eid]?.nome ?? eid}
            </button>
          ))}
        </div>

        <div className="toolbar-filtro-busca">
          <span className="icone-busca" aria-hidden="true">
            <Icone nome="compass" tamanho={16} />
          </span>
          <input
            type="search"
            className="campo-busca-fila"
            placeholder="Buscar por código ou iniciais..."
            value={buscaFila}
            onChange={(e) => setBuscaFila(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela de Fila */}
      {carregandoFila ? (
        <div className="estado-carregando-bloco">
          <Icone nome="hourglass" tamanho={24} />
          <p className="texto-carregando">Carregando fila regulatória auditável...</p>
        </div>
      ) : filaAuditavel.length === 0 ? (
        <div className="estado-vazio-bloco">
          <Icone nome="check-circle" tamanho={32} />
          <p className="texto-vazio">
            Nenhuma solicitação na fila para o filtro selecionado.
          </p>
        </div>
      ) : (
        <div className="tabela-quadro-container" role="region" aria-label="Fila auditável">
          <table className="tabela-secretaria">
            <thead>
              <tr>
                <th scope="col" className="col-posicao">Pos.</th>
                <th scope="col" className="col-sem-quebra">Protocolo</th>
                <th scope="col">Candidato / Responsável</th>
                <th scope="col">Unidade / Bairro</th>
                <th scope="col">Etapa & Turma</th>
                <th scope="col" className="col-score-min">Score Regulatório</th>
                <th scope="col" className="col-centralizada">Origem</th>
                <th scope="col" className="col-centralizada-sem-quebra">Status</th>
                <th scope="col" className="col-sem-quebra-direita">Inscrição</th>
              </tr>
            </thead>
            <tbody>
              {filaAuditavel.map((item) => (
                <tr key={item.codigo}>
                  <td className="celula-posicao">
                    {item.origem === 'judicial' ? (
                      <span title="Prioridade Absoluta por Decisão Judicial">⚖️ 1º</span>
                    ) : (
                      `#${item.posicao}`
                    )}
                  </td>
                  <td className="col-sem-quebra">
                    <strong className="codigo-mono">{item.codigo}</strong>
                  </td>
                  <td>
                    <div className="nome-estudante-destaque">{item.estudanteIniciais}</div>
                    <small className="celula-sub">Resp: {item.responsavelIniciais}</small>
                  </td>
                  <td>
                    <div><strong className="nome-escola-destaque">{item.escolaNome}</strong></div>
                    <small className="celula-sub">{item.escolaBairro}</small>
                  </td>
                  <td>
                    <div>{ETAPAS[item.etapa]?.nome ?? item.etapa}</div>
                    <small className="celula-sub">{item.turma} ({item.periodo})</small>
                  </td>
                  <td>
                    <div className="celula-score-box">
                      <div className="score-total-linha">
                        <strong className="score-total-num">{item.pontosTotais}</strong>
                        <span className="score-total-unit">pts</span>
                      </div>
                      {item.criteriosAtendidos.length > 0 ? (
                        <div className="score-tags-container">
                          {item.criteriosAtendidos.map((cid) => (
                            <div
                              key={cid}
                              className="score-criterio-tag"
                              title={CRITERIOS_VULNERABILIDADE[cid]?.descricao}
                            >
                              <span className="tag-pts">+{CRITERIOS_VULNERABILIDADE[cid]?.pontos ?? 0}</span>
                              <span className="tag-nome">{CRITERIOS_VULNERABILIDADE[cid]?.nome}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="score-sem-criterio">Demanda regular</span>
                      )}
                    </div>
                  </td>
                  <td className="col-centralizada">
                    {item.origem === 'judicial' ? (
                      <span className="badge-acao-auditoria acao-judicial">
                        <Icone nome="scale" tamanho={12} /> Judicial
                      </span>
                    ) : (
                      <span className="texto-origem-regular">Regular</span>
                    )}
                  </td>
                  <td className="col-centralizada-sem-quebra">
                    {item.reservaVaga ? (
                      <span
                        className="status-fila-badge status-reservada"
                        title="Vaga pré-reservada aguardando confirmação presencial"
                      >
                        <span className="status-fila-ponto" aria-hidden="true" />
                        Pré-Reservada
                      </span>
                    ) : (
                      <span
                        className="status-fila-badge status-espera"
                        title="Candidato aguardando abertura de nova vaga"
                      >
                        <span className="status-fila-ponto" aria-hidden="true" />
                        Fila de Espera
                      </span>
                    )}
                  </td>
                  <td className="celula-data-hora">
                    {new Date(item.criadoEm).toLocaleDateString('pt-BR')} {new Date(item.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
