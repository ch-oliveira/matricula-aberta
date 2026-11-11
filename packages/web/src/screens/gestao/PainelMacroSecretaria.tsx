import { useEffect, useMemo, useState } from 'react';
import { Icone, IconeEtapa } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import { Ocupacao } from '../../components/ui';
import { ETAPAS, statusDaOferta } from '../../domain/etapas';
import { desatualizado, tempoRelativo } from '../../domain/geo';
import {
  CRITERIOS_VULNERABILIDADE,
  dataLocalISO,
  gerarCsv,
  LISTA_CRITERIOS_VULNERABILIDADE,
  mascararProcessoCNJ,
  ORDEM_ETAPAS,
  type CertidaoCumprimentoJudicialDTO,
  type DemandaJudicial,
  type EtapaId,
  type FilaItemAuditavel,
  type LogAuditoria,
  type PainelSecretariaDTO,
  type ProtocoloVisita,
} from '../../domain/types';
import { useAgora } from '../../hooks';
import { useEscolas, vagasStore } from '../../services/vagasStore';
import { formatarAcaoAuditoria } from './auditoriaUtils';
import { HeatmapBairros } from './HeatmapBairros';
import { ModalCadastroDemandaJudicial } from './ModalCadastroDemandaJudicial';
import { ModalCertidaoJudicial } from './ModalCertidaoJudicial';
import { ModalConfirmacaoAlocacaoJudicial } from './ModalConfirmacaoAlocacaoJudicial';
import { ModalRelatorioConsolidadoTce } from './ModalRelatorioConsolidadoTce';

interface Props {
  painel: PainelSecretariaDTO;
  protocolos: ProtocoloVisita[];
  onAbrirUnidade: (id: string) => void;
  onAbrirLeitor?: () => void;
}

export function PainelMacroSecretaria({
  painel,
  protocolos,
  onAbrirUnidade,
  onAbrirLeitor,
}: Props) {
  const agora = useAgora(15_000);
  const escolas = useEscolas();
  const { kpis } = painel;

  const [subAba, setSubAba] = useState<'rede' | 'regulacao' | 'judicial' | 'auditoria'>('rede');
  const [filaAuditavel, setFilaAuditavel] = useState<FilaItemAuditavel[]>([]);
  const [etapaFiltro, setEtapaFiltro] = useState<EtapaId | 'todas'>('todas');
  const [buscaFila, setBuscaFila] = useState('');
  const [carregandoFila, setCarregandoFila] = useState(false);

  const [demandasJudiciais, setDemandasJudiciais] = useState<DemandaJudicial[]>([]);
  const [carregandoJudicial, setCarregandoJudicial] = useState(false);
  const [modalCadastroJudicial, setModalCadastroJudicial] = useState(false);
  const [demandaParaAlocar, setDemandaParaAlocar] = useState<DemandaJudicial | null>(null);
  const [alocandoJudicial, setAlocandoJudicial] = useState(false);
  const [certidaoAtiva, setCertidaoAtiva] = useState<CertidaoCumprimentoJudicialDTO | null>(null);
  const [modalRelatorioTceAberto, setModalRelatorioTceAberto] = useState(false);

  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
  const [buscaAuditoria, setBuscaAuditoria] = useState('');
  const [filtroAcaoAuditoria, setFiltroAcaoAuditoria] = useState<'todas' | 'judicial' | 'expiracao' | 'confirmacao'>('todas');

  // Logs de auditoria filtrados por texto e categoria
  const logsAuditoriaFiltrados = useMemo(() => {
    let filtrados = logsAuditoria;
    if (filtroAcaoAuditoria === 'judicial') {
      filtrados = filtrados.filter((l) => l.acao.includes('JUDICIAL'));
    } else if (filtroAcaoAuditoria === 'expiracao') {
      filtrados = filtrados.filter((l) => l.acao === 'EXPIRACAO_AUTOMATICA');
    } else if (filtroAcaoAuditoria === 'confirmacao') {
      filtrados = filtrados.filter((l) => l.acao === 'BAIXA_PRESENCIAL');
    }

    if (!buscaAuditoria.trim()) return filtrados;
    const termo = buscaAuditoria.toLowerCase();
    return filtrados.filter(
      (l) =>
        l.operadorUsuario.toLowerCase().includes(termo) ||
        l.acao.toLowerCase().includes(termo) ||
        (l.protocoloCodigo && l.protocoloCodigo.toLowerCase().includes(termo)) ||
        (l.justificativa && l.justificativa.toLowerCase().includes(termo)),
    );
  }, [logsAuditoria, buscaAuditoria, filtroAcaoAuditoria]);

  // Carrega dados da Fila Auditável quando selecionada
  useEffect(() => {
    if (subAba !== 'regulacao') return;
    let cancelado = false;
    setCarregandoFila(true);
    vagasStore
      .obterFilaPublicaAuditavel({
        etapa: etapaFiltro === 'todas' ? undefined : etapaFiltro,
        busca: buscaFila.trim() || undefined,
      })
      .then((res) => {
        if (!cancelado) {
          setFilaAuditavel(res);
          setCarregandoFila(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          toast(err instanceof Error ? err.message : 'Falha ao carregar fila auditável.', {
            emoji: 'alert-triangle',
            tom: 'aviso',
          });
          setCarregandoFila(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [subAba, etapaFiltro, buscaFila]);

  // Carrega Demandas Judiciais quando selecionadas
  const recarregarDemandasJudiciais = () => {
    setCarregandoJudicial(true);
    vagasStore
      .listarDemandasJudiciais()
      .then((res) => {
        setDemandasJudiciais(res);
        setCarregandoJudicial(false);
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : 'Falha ao consultar processos judiciais.', {
          emoji: 'alert-triangle',
          tom: 'aviso',
        });
        setCarregandoJudicial(false);
      });
  };

  useEffect(() => {
    if (subAba === 'judicial') {
      recarregarDemandasJudiciais();
    }
  }, [subAba]);

  // Carrega Trilha de Auditoria quando selecionada
  useEffect(() => {
    if (subAba !== 'auditoria') return;
    let cancelado = false;
    setCarregandoAuditoria(true);
    vagasStore
      .listarLogsAuditoria(150)
      .then((res) => {
        if (!cancelado) {
          setLogsAuditoria(res);
          setCarregandoAuditoria(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          toast(err instanceof Error ? err.message : 'Falha ao carregar trilha de auditoria.', {
            emoji: 'alert-triangle',
            tom: 'aviso',
          });
          setCarregandoAuditoria(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [subAba]);

  async function executarAlocacaoJudicial(demanda: DemandaJudicial) {
    setAlocandoJudicial(true);
    try {
      const res = await vagasStore.alocarVagaJudicial(
        demanda.id,
        `Alocação tempestiva em cumprimento ao Mandado do Processo ${demanda.numeroProcesso} (${demanda.vara})`,
      );
      toast(`Vaga judicial alocada com sucesso! Protocolo emitido: ${res.protocoloCodigo}`, {
        emoji: 'check-circle',
        tom: 'ok',
      });
      setDemandaParaAlocar(null);
      recarregarDemandasJudiciais();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao alocar vaga judicial.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
    } finally {
      setAlocandoJudicial(false);
    }
  }

  async function abrirCertidaoJudicial(demandaId: string) {
    try {
      const cert = await vagasStore.obterCertidaoJudicial(demandaId);
      setCertidaoAtiva(cert);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao emitir certidão de cumprimento.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
    }
  }

  function baixarCsv(nomeArquivo: string, conteudo: string) {
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
    toast(`Planilha ${nomeArquivo} baixada com sucesso!`, { emoji: 'check-circle', tom: 'ok' });
  }

  function exportarProtocolosCsv() {
    const cabecalhos = [
      'Código',
      'Unidade Escolar',
      'Bairro',
      'Etapa',
      'Turma',
      'Período',
      'Responsável',
      'Telefone',
      'Data da Visita',
      'Turno',
      'Status',
      'Reserva de Vaga',
      'Pontos Prioridade',
      'Origem',
      'Motivo Cancelamento',
      'Data de Emissão',
    ];
    const linhas = protocolos.map((p) => [
      p.codigo,
      p.escolaNome,
      p.escolaBairro,
      p.etapa,
      p.turma,
      p.periodo,
      p.responsavel,
      p.telefone ?? '',
      p.dataVisita,
      p.turnoVisita,
      p.status,
      p.reservaVaga ? 'Sim (Vaga Pré-Reservada)' : 'Não (Fila de Espera)',
      p.pontosPrioridade ?? 0,
      p.origem ?? 'regular',
      p.motivoCancelamento ?? '',
      new Date(p.criadoEm).toLocaleString('pt-BR'),
    ]);
    baixarCsv(`protocolos-patos-pb-${dataLocalISO()}.csv`, gerarCsv(cabecalhos, linhas));
  }

  function exportarFilaAuditavelCsv() {
    const cabecalhos = [
      'Posição',
      'Código',
      'Iniciais do Aluno',
      'Iniciais do Responsável',
      'Unidade Escolar',
      'Bairro',
      'Etapa',
      'Turma',
      'Período',
      'Pontos Regulatórios',
      'Critérios Atendidos',
      'Origem Demanda',
      'Reserva de Vaga',
      'Status',
      'Data de Entrada',
    ];
    const linhas = filaAuditavel.map((item) => [
      item.posicao,
      item.codigo,
      item.estudanteIniciais,
      item.responsavelIniciais,
      item.escolaNome,
      item.escolaBairro,
      item.etapa,
      item.turma,
      item.periodo,
      item.pontosTotais,
      item.criteriosAtendidos.map((c) => CRITERIOS_VULNERABILIDADE[c]?.nome ?? c).join('; '),
      item.origem,
      item.reservaVaga ? 'Sim' : 'Não',
      item.status,
      new Date(item.criadoEm).toLocaleString('pt-BR'),
    ]);
    baixarCsv(`fila-auditavel-patos-pb-${dataLocalISO()}.csv`, gerarCsv(cabecalhos, linhas));
  }

  function exportarFilaEsperaCsv() {
    const cabecalhos = [
      'Código',
      'Unidade Escolar',
      'Bairro',
      'Etapa',
      'Turma',
      'Posição na Fila',
      'Responsável',
      'Telefone',
      'Data da Visita',
      'Data de Inscrição',
    ];
    const fila = protocolos.filter((p) => p.status === 'aguardando' && !p.reservaVaga);
    const linhas = fila.map((p) => [
      p.codigo,
      p.escolaNome,
      p.escolaBairro,
      p.etapa,
      p.turma,
      p.posicaoFila ?? 1,
      p.responsavel,
      p.telefone ?? '',
      p.dataVisita,
      new Date(p.criadoEm).toLocaleString('pt-BR'),
    ]);
    baixarCsv(`fila-espera-patos-pb-${dataLocalISO()}.csv`, gerarCsv(cabecalhos, linhas));
  }

  function exportarOcupacaoBairrosCsv() {
    const cabecalhos = [
      'Bairro',
      'Zona',
      'Unidades',
      'Vagas Livres',
      'Capacidade Total',
      'Fila de Espera',
      'Alertas Ativos',
      'Demanda Reprimida',
      'Déficit de Vagas',
      'Status de Pressão',
    ];
    const linhas = painel.demandaPorBairro.map((b) => [
      b.bairro,
      b.zona,
      b.unidades,
      b.vagasLivres,
      b.capacidadeTotal,
      b.filaEspera,
      b.alertasAtivos,
      b.demandaReprimida,
      b.deficitVagas,
      b.statusPressao.toUpperCase(),
    ]);
    baixarCsv(`demanda-bairros-patos-pb-${dataLocalISO()}.csv`, gerarCsv(cabecalhos, linhas));
  }

  return (
    <div className="secretaria-grid">
      <section className="painel-cabecalho secretaria-hero">
        <div className="secretaria-hero-info">
          <span className="lp-tag">Gestão Municipal · Patos - PB</span>
          <h1>{painel.orgao}</h1>
          <p>
            Monitoramento integrado de vagas livres, demanda reprimida por bairro de <strong>Patos - PB</strong>,
            alertas ativos no WhatsApp e regulação de protocolos presenciais.
          </p>
        </div>

        <div className="secretaria-hero-barra-acoes">
          {onAbrirLeitor && (
            <button
              type="button"
              className="btn btn-primario btn-escanear-destaque"
              onClick={onAbrirLeitor}
              title="Abrir câmera ou digitar código do comprovante presencial"
            >
              <Icone nome="qr-code" tamanho={18} />
              <span>Escanear / Localizar Protocolo</span>
            </button>
          )}

          <div className="secretaria-export-bloco">
            <span className="secretaria-export-titulo">Planilhas da Rede:</span>
            <div className="secretaria-export-botoes">
              <button
                type="button"
                className="btn btn-secundario btn-pequeno"
                onClick={exportarProtocolosCsv}
                title="Exportar todos os protocolos da rede em CSV"
              >
                <Icone nome="file-text" tamanho={14} /> Protocolos (.csv)
              </button>
              <button
                type="button"
                className="btn btn-secundario btn-pequeno"
                onClick={exportarFilaEsperaCsv}
                title="Exportar fila de espera da rede em CSV"
              >
                <Icone nome="list" tamanho={14} /> Fila de Espera (.csv)
              </button>
              <button
                type="button"
                className="btn btn-secundario btn-pequeno"
                onClick={exportarOcupacaoBairrosCsv}
                title="Exportar indicador de demanda por bairro em CSV"
              >
                <Icone nome="pin" tamanho={14} /> Demanda Bairros (.csv)
              </button>
              <button
                type="button"
                className="btn btn-primario btn-pequeno"
                onClick={() => setModalRelatorioTceAberto(true)}
                title="Emitir Relatório Oficial Consolidado para o TCE-PB e Promotoria da Infância"
              >
                <Icone nome="scale" tamanho={14} /> Relatório Oficial (TCE / MP)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Navegação entre Visão Geral da Rede, Fila Regulada, Demandas Judiciais e Auditoria */}
      <nav className="gestao-sub-abas" aria-label="Seções do Painel da Secretaria">
        <button
          type="button"
          className={`gestao-sub-aba-btn ${subAba === 'rede' ? 'ativo' : ''}`}
          onClick={() => setSubAba('rede')}
        >
          <Icone nome="landmark" tamanho={16} /> Visão Geral da Rede
        </button>
        <button
          type="button"
          className={`gestao-sub-aba-btn ${subAba === 'regulacao' ? 'ativo' : ''}`}
          onClick={() => setSubAba('regulacao')}
        >
          <Icone nome="scale" tamanho={16} /> Fila & Regulação Auditável
        </button>
        <button
          type="button"
          className={`gestao-sub-aba-btn ${subAba === 'judicial' ? 'ativo' : ''}`}
          onClick={() => setSubAba('judicial')}
        >
          <Icone nome="file-text" tamanho={16} /> Demandas Judiciais (PJ-e)
          {demandasJudiciais.filter((d) => d.status === 'pendente').length > 0 && (
            <span className="gestao-sub-aba-badge">
              {demandasJudiciais.filter((d) => d.status === 'pendente').length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`gestao-sub-aba-btn ${subAba === 'auditoria' ? 'ativo' : ''}`}
          onClick={() => setSubAba('auditoria')}
        >
          <Icone nome="history" tamanho={16} /> Trilha de Auditoria (TCE / MP)
        </button>
      </nav>

      {subAba === 'rede' && (
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
      )}

      {/* SUB-ABA 2: Regulação Municipal & Fila Unificada Auditável */}
      {subAba === 'regulacao' && (
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
              onClick={exportarFilaAuditavelCsv}
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
      )}

      {/* SUB-ABA 3: Demandas Judiciais (PJ-e) */}
      {subAba === 'judicial' && (
        <section className="sec-bloco sec-bloco-coluna">
          <div className="sec-bloco-topo-wrap">
            <div>
              <h2 className="titulo-com-icone">
                <Icone nome="file-text" tamanho={22} /> Central de Demandas Judiciais & Liminares (PJ-e)
              </h2>
              <p className="legenda sem-margem-topo">
                Cumprimento tempestivo de decisões judiciais e tutela de urgência. Mitigação de astreintes (multas diárias) e emissão de Certidão Oficial com validação criptográfica SHA-256 para juntada aos autos.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primario btn-pequeno"
              onClick={() => setModalCadastroJudicial(true)}
            >
              + Autuar Mandado Judicial
            </button>
          </div>

          {carregandoJudicial ? (
            <div className="estado-carregando-bloco">
              <Icone nome="hourglass" tamanho={24} />
              <p className="texto-carregando">Carregando processos judiciais autuados...</p>
            </div>
          ) : demandasJudiciais.length === 0 ? (
            <div className="estado-vazio-bloco">
              <Icone nome="check-circle" tamanho={32} />
              <p className="texto-vazio">
                Nenhuma ordem judicial pendente ou cadastrada no sistema.
              </p>
            </div>
          ) : (
            <div className="grid-demandas-judiciais">
              {demandasJudiciais.map((demanda) => {
                const prazoDate = new Date(demanda.prazoLimiteEm);
                const horasRestantes = Math.round((demanda.prazoLimiteEm - agora) / (1000 * 60 * 60));
                const estaVencendo = demanda.status === 'pendente' && horasRestantes <= 24 && horasRestantes > 0;
                const estaVencida = demanda.status === 'pendente' && horasRestantes <= 0;

                const statusClasse = demanda.status === 'alocado'
                  ? 'status-alocado'
                  : (estaVencida || estaVencendo)
                  ? 'status-urgente'
                  : '';

                return (
                  <div key={demanda.id} className={`card-demanda-judicial ${statusClasse}`}>
                    <div>
                      <div className="card-demanda-judicial-topo">
                        <span className="demanda-proc-badge" title={demanda.numeroProcesso}>
                          {mascararProcessoCNJ(demanda.numeroProcesso)}
                        </span>
                        <span className={`demanda-status-pill ${demanda.status === 'alocado' ? 'alocado' : estaVencida ? 'expirado' : 'pendente'}`}>
                          {demanda.status === 'alocado'
                            ? 'Alocado (Cumprida)'
                            : estaVencida
                            ? 'Prazo Expirado'
                            : 'Pendente'}
                        </span>
                      </div>

                      <h3 className="demanda-nome-aluno">
                        {demanda.estudanteNome}
                      </h3>
                      <p className="demanda-resp-info">
                        Responsável: <strong>{demanda.responsavelNome}</strong> (CPF: {demanda.cpfCertidao})
                      </p>

                      <div className="demanda-dados-lista">
                        <div className="demanda-dado-item">
                          <Icone nome="landmark" tamanho={14} />
                          <span><strong>Vara:</strong> {demanda.vara}</span>
                        </div>
                        <div className="demanda-dado-item">
                          <Icone nome="school" tamanho={14} />
                          <span><strong>Destino:</strong> {demanda.escolaNome} ({ETAPAS[demanda.etapa]?.nome ?? demanda.etapa})</span>
                        </div>
                        {demanda.multaDiaria ? (
                          <div className="demanda-astreinte-aviso">
                            <Icone nome="alert-triangle" tamanho={13} />
                            <span>Multa cominatória (astreinte): R$ {demanda.multaDiaria.toLocaleString('pt-BR')}/dia</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Contador do Prazo */}
                      {demanda.status !== 'alocado' && (
                        <div className={`demanda-prazo-box ${estaVencida ? 'expirado' : estaVencendo ? 'urgente' : ''}`}>
                          <div className={`prazo-box-titulo ${estaVencida ? 'texto-perigo' : estaVencendo ? 'texto-alerta' : 'texto-padrao'}`}>
                            <Icone nome="clock" tamanho={14} />
                            Prazo Fatal: {prazoDate.toLocaleDateString('pt-BR')} às {prazoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className={`prazo-box-sub ${estaVencida ? 'texto-perigo' : 'texto-suave'}`}>
                            {estaVencida
                              ? `⚠️ Vencido há ${Math.abs(horasRestantes)} horas!`
                              : `Restam aproximadamente ${horasRestantes} horas para cumprimento.`}
                          </div>
                        </div>
                      )}

                      {demanda.protocoloCodigo && (
                        <div className="demanda-protocolo-vinculado">
                          Protocolo Vinculado: <span className="codigo-mono">{demanda.protocoloCodigo}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-demanda-acoes">
                      {demanda.status !== 'alocado' ? (
                        <button
                          type="button"
                          className="btn btn-primario btn-pequeno btn-bloco-cheio"
                          onClick={() => setDemandaParaAlocar(demanda)}
                        >
                          <Icone nome="check-circle" tamanho={14} /> Alocar Vaga Prioritária
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secundario btn-pequeno btn-bloco-cheio"
                          onClick={() => abrirCertidaoJudicial(demanda.id)}
                        >
                          <Icone nome="file-text" tamanho={14} /> Emitir Certidão (PJ-e)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SUB-ABA 4: Trilha de Auditoria Governamental */}
      {subAba === 'auditoria' && (
        <section className="sec-bloco sec-bloco-coluna">
          <div>
            <h2 className="titulo-com-icone">
              <Icone nome="history" tamanho={22} /> Trilha de Auditoria Governamental (TCE-PB / MP-PB)
            </h2>
            <p className="legenda sem-margem-topo">
              Registro cronológico e imutável de todas as mutações e atos de regulação de vagas escolares. Rastreabilidade com IP, operador, perfil de acesso e fundamentação legal.
            </p>
          </div>

          {/* Filtros da Auditoria */}
          <div className="toolbar-filtro-fila">
            <div className="toolbar-filtro-chips">
              <span className="rotulo-filtro-acoes">
                Ações:
              </span>
              <button
                type="button"
                className={`filtro-chip-btn ${filtroAcaoAuditoria === 'todas' ? 'ativo' : ''}`}
                onClick={() => setFiltroAcaoAuditoria('todas')}
              >
                Todas ({logsAuditoria.length})
              </button>
              <button
                type="button"
                className={`filtro-chip-btn ${filtroAcaoAuditoria === 'judicial' ? 'ativo' : ''}`}
                onClick={() => setFiltroAcaoAuditoria('judicial')}
              >
                <Icone nome="scale" tamanho={13} /> Judiciais
              </button>
              <button
                type="button"
                className={`filtro-chip-btn ${filtroAcaoAuditoria === 'expiracao' ? 'ativo' : ''}`}
                onClick={() => setFiltroAcaoAuditoria('expiracao')}
              >
                <Icone nome="clock" tamanho={13} /> Expirações
              </button>
              <button
                type="button"
                className={`filtro-chip-btn ${filtroAcaoAuditoria === 'confirmacao' ? 'ativo' : ''}`}
                onClick={() => setFiltroAcaoAuditoria('confirmacao')}
              >
                <Icone nome="check-circle" tamanho={13} /> Confirmações
              </button>
            </div>

            <div className="toolbar-filtro-busca">
              <span className="icone-busca" aria-hidden="true">
                <Icone nome="compass" tamanho={16} />
              </span>
              <input
                type="search"
                className="campo-busca-fila"
                placeholder="Buscar por protocolo, operador ou motivo..."
                value={buscaAuditoria}
                onChange={(e) => setBuscaAuditoria(e.target.value)}
              />
            </div>
          </div>

          {carregandoAuditoria ? (
            <div className="estado-carregando-bloco">
              <Icone nome="hourglass" tamanho={24} />
              <p className="texto-carregando">Carregando registros de auditoria...</p>
            </div>
          ) : logsAuditoriaFiltrados.length === 0 ? (
            <div className="estado-vazio-bloco">
              <Icone nome="check-circle" tamanho={32} />
              <p className="texto-vazio">
                Nenhum log registrado para os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="tabela-quadro-container" role="region" aria-label="Logs de auditoria">
              <table className="tabela-secretaria">
                <thead>
                  <tr>
                    <th scope="col" className="col-sem-quebra">Data / Hora</th>
                    <th scope="col">Operador / Papel</th>
                    <th scope="col" className="col-sem-quebra">Ação Regulada</th>
                    <th scope="col" className="col-sem-quebra">Entidade</th>
                    <th scope="col">Justificativa & Detalhes</th>
                    <th scope="col" className="col-sem-quebra-direita">Rastro / IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logsAuditoriaFiltrados.map((log) => {
                    const infoAcao = formatarAcaoAuditoria(log.acao);
                    return (
                      <tr key={log.id}>
                        <td className="celula-data-hora">
                          <div><strong className="texto-cor-ink">{new Date(log.criadoEm).toLocaleDateString('pt-BR')}</strong></div>
                          <small className="celula-sub">{new Date(log.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small>
                        </td>
                        <td>
                          <strong className="texto-cor-ink">{log.operadorUsuario}</strong>
                          <div className="sub-perfil-operador">{log.operadorPerfil.toUpperCase()}</div>
                        </td>
                        <td className="col-sem-quebra">
                          <span className={`badge-acao-auditoria ${infoAcao.classe}`}>
                            <Icone nome={infoAcao.icone} tamanho={12} />
                            {infoAcao.label}
                          </span>
                        </td>
                        <td className="col-sem-quebra">
                          <div className="celula-entidade-auditoria">{log.protocoloCodigo ?? log.escolaId ?? 'REDE'}</div>
                          <small className="celula-sub">{log.protocoloCodigo ? 'Protocolo' : log.escolaId ? 'Escola' : 'Geral'}</small>
                        </td>
                        <td className="celula-justificativa-texto">
                          {log.justificativa}
                        </td>
                        <td className="celula-ip-mono">
                          {log.ip ?? '127.0.0.1'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modais de Gestão Judicial e Certidão */}
      {demandaParaAlocar && (
        <ModalConfirmacaoAlocacaoJudicial
          demanda={demandaParaAlocar}
          aoFechar={() => setDemandaParaAlocar(null)}
          aoConfirmar={() => executarAlocacaoJudicial(demandaParaAlocar)}
          carregando={alocandoJudicial}
        />
      )}

      {modalCadastroJudicial && (
        <ModalCadastroDemandaJudicial
          escolas={escolas}
          aoFechar={() => setModalCadastroJudicial(false)}
          aoSucesso={() => {
            setModalCadastroJudicial(false);
            recarregarDemandasJudiciais();
          }}
        />
      )}

      {certidaoAtiva && (
        <ModalCertidaoJudicial
          certidao={certidaoAtiva}
          aoFechar={() => setCertidaoAtiva(null)}
        />
      )}

      {modalRelatorioTceAberto && (
        <ModalRelatorioConsolidadoTce
          painel={painel}
          protocolos={protocolos}
          aoFechar={() => setModalRelatorioTceAberto(false)}
        />
      )}
    </div>
  );
}
