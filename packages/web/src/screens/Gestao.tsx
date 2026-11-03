import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Icone, IconeEtapa } from '../components/Icone';
import { LeitorQrModal } from '../components/LeitorQrModal';
import { toast } from '../components/Toasts';
import { Ocupacao, StatusPill } from '../components/ui';
import { ETAPAS, statusDaOferta } from '../domain/etapas';
import { desatualizado, tempoRelativo } from '../domain/geo';
import {
  CRITERIOS_VULNERABILIDADE,
  dataLocalISO,
  gerarCsv,
  LISTA_CRITERIOS_VULNERABILIDADE,
  mascararProcessoCNJ,
  ORDEM_ETAPAS,
  type CertidaoCumprimentoJudicialDTO,
  type DemandaJudicial,
  type Escola,
  type EtapaId,
  type FilaItemAuditavel,
  type LogAuditoria,
  type Oferta,
  type PainelSecretariaDTO,
  type Periodo,
  type ProtocoloVisita,
} from '../domain/types';
import { useAgora, useHashRoute } from '../hooks';
import {
  useEscolas,
  useHistorico,
  usePainelSecretaria,
  useProtocolos,
  useSessaoSecretaria,
  useSessaoUnidade,
  vagasStore,
} from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { padlock, school } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';

export function Gestao() {
  const escolas = useEscolas();
  const protocolos = useProtocolos();
  const painelSecretaria = usePainelSecretaria();
  const sessaoSecretaria = useSessaoSecretaria();
  const sessaoUnidade = useSessaoUnidade();
  const rota = useHashRoute();
  const [leitorQrAberto, setLeitorQrAberto] = useState(false);
  const [aba, setAba] = useState<'secretaria' | 'unidade'>(() =>
    window.location.hash.includes('unidade') ? 'unidade' : 'secretaria',
  );
  // Permite que um gestor autenticado na SEDUC inspecione qualquer unidade no Painel da Unidade
  const [escolaInspecionadaSeduc, setEscolaInspecionadaSeduc] = useState<string | null>(null);

  useEffect(() => {
    if (rota.includes('unidade')) setAba('unidade');
    else if (rota === '#/gestao' || rota === '#/gestao/secretaria') setAba('secretaria');
  }, [rota]);

  // Limpa legado de autologin antigo se existente
  useEffect(() => {
    try {
      localStorage.removeItem('ma:gestao:sessao:v2');
      localStorage.removeItem('ma:gestao:aba:v2');
    } catch {
      /* ignore */
    }
  }, []);

  // Toast discreto em telas pequenas sugerindo a aba Unidade para leitura de QR Code
  const avisoMobileExibidoRef = useRef(false);
  useEffect(() => {
    if (
      aba === 'secretaria' &&
      !avisoMobileExibidoRef.current &&
      typeof window !== 'undefined' &&
      window.innerWidth <= 768
    ) {
      avisoMobileExibidoRef.current = true;
      toast('Dica: para bipar QR Code no celular ou tablet, use a aba Painel da Unidade.', {
        emoji: 'info',
        tom: 'info',
      });
    }
  }, [aba]);

  const authSecretaria = Boolean(sessaoSecretaria);
  const idUnidadeAtiva =
    sessaoUnidade?.escolaId ?? (authSecretaria ? escolaInspecionadaSeduc : null);
  const authUnidade = Boolean(idUnidadeAtiva);
  const escola = idUnidadeAtiva ? escolas.find((e) => e.id === idUnidadeAtiva) ?? null : null;

  function sairSecretaria() {
    vagasStore.encerrarSessaoGestao('secretaria');
    setEscolaInspecionadaSeduc(null);
    toast('Sessão da Secretaria de Educação encerrada.', { emoji: 'info', tom: 'info' });
  }

  function sairUnidade() {
    if (sessaoUnidade) {
      vagasStore.encerrarSessaoGestao('unidade');
    }
    setEscolaInspecionadaSeduc(null);
    toast('Sessão da Unidade Escolar encerrada.', { emoji: 'info', tom: 'info' });
  }

  return (
    <div className="gestao">
      <div className="gestao-shell">
        <header className="gestao-topo">
          <div className="gestao-topo-interno">
            <a className="marca" href="#">
              <div className="marca-sticker" aria-hidden="true">
                <Sticker icon={school} palette={PALETTES.riso} loop={false} replayOnHover style={{ width: 40 }} />
              </div>
              <span className="marca-nome">
                Matrícula<b>Aberta</b>
                <small>Gestão Municipal · Patos - PB</small>
              </span>
            </a>

            <nav className="topo-nav" aria-label="Modo de gestão">
              <button
                type="button"
                className={`nav-link ${aba === 'secretaria' ? 'ativo' : ''}`}
                onClick={() => {
                  setAba('secretaria');
                  window.history.replaceState(null, '', '#/gestao');
                }}
              >
                <Icone nome="landmark" tamanho={16} /> Secretaria de Educação
                {authSecretaria && <span className="ponto-vivo" title="Sessão autenticada ativa" />}
              </button>
              <button
                type="button"
                className={`nav-link ${aba === 'unidade' ? 'ativo' : ''}`}
                onClick={() => {
                  setAba('unidade');
                  window.history.replaceState(null, '', '#/gestao/unidade');
                }}
              >
                <Icone nome="school" tamanho={16} /> Painel da Unidade
                {authUnidade && <span className="ponto-vivo" title="Sessão autenticada ativa" />}
              </button>
            </nav>

            <div className="gestao-topo-acoes">
              {aba === 'secretaria' && authSecretaria && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-pequeno"
                  onClick={sairSecretaria}
                >
                  <Icone nome="x" tamanho={14} /> Sair da Secretaria
                </button>
              )}

              {aba === 'unidade' && authUnidade && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-pequeno"
                  onClick={sairUnidade}
                >
                  <Icone nome="x" tamanho={14} /> Sair da Unidade
                </button>
              )}

              <a className="btn btn-secundario btn-pequeno" href="#" title="Voltar ao portal dos pais">
                <span className="btn-voltar-texto-longo">← Voltar ao portal dos pais</span>
                <span className="btn-voltar-texto-curto">← Voltar</span>
              </a>
            </div>
          </div>
        </header>

        <main className="gestao-conteudo">
          {aba === 'secretaria' ? (
            authSecretaria ? (
              painelSecretaria ? (
                <PainelMacroSecretaria
                  painel={painelSecretaria}
                  protocolos={protocolos}
                  onAbrirUnidade={(id) => {
                    setEscolaInspecionadaSeduc(id);
                    setAba('unidade');
                    window.history.replaceState(null, '', '#/gestao/unidade');
                  }}
                  onAbrirLeitor={() => setLeitorQrAberto(true)}
                  onSair={sairSecretaria}
                />
              ) : (
                <p className="aviso-suave">Carregando indicadores da Secretaria Municipal de Educação de Patos - PB…</p>
              )
            ) : (
              <LoginSecretaria
                onEntrar={() => {
                  toast('Bem-vindo à Secretaria Municipal de Educação de Patos - PB!', {
                    emoji: 'check-circle',
                    tom: 'ok',
                  });
                }}
              />
            )
          ) : authUnidade && escola ? (
            <PainelUnidade
              escola={escola}
              escolas={escolas}
              podeTrocarLivremente={authSecretaria}
              onTrocarEscola={(id) => {
                if (authSecretaria) {
                  setEscolaInspecionadaSeduc(id);
                } else {
                  vagasStore.encerrarSessaoGestao('unidade');
                  toast('Faça login com o PIN da unidade selecionada.', { emoji: 'info', tom: 'info' });
                }
              }}
              onAbrirLeitor={() => setLeitorQrAberto(true)}
              onSair={sairUnidade}
            />
          ) : (
            <LoginUnidade
              escolas={escolas}
              onEntrar={(id) => {
                const esc = escolas.find((e) => e.id === id);
                toast(`Acesso liberado: ${esc?.nome ?? 'Unidade Escolar'}`, {
                  emoji: 'check-circle',
                  tom: 'ok',
                });
              }}
            />
          )}
        </main>

        <LeitorQrModal
          aberto={leitorQrAberto}
          onFechar={() => setLeitorQrAberto(false)}
          escolaAtual={aba === 'unidade' && escola ? escola : undefined}
          todasEscolas={escolas}
          protocolos={protocolos}
          onConfirmarMatricula={async (codigo) => {
            try {
              await vagasStore.atualizarStatusProtocolo(codigo, 'atendido');
              toast(`Matrícula do protocolo ${codigo} confirmada com sucesso!`, {
                emoji: 'check-circle',
                tom: 'ok',
              });
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Falha ao confirmar protocolo.', {
                emoji: 'alert-triangle',
                tom: 'aviso',
              });
              throw err;
            }
          }}
        />
      </div>
    </div>
  );
}

function PainelMacroSecretaria({
  painel,
  protocolos,
  onAbrirUnidade,
  onAbrirLeitor,
  onSair,
}: {
  painel: PainelSecretariaDTO;
  protocolos: ProtocoloVisita[];
  onAbrirUnidade: (id: string) => void;
  onAbrirLeitor?: () => void;
  onSair: () => void;
}) {
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
  const [certidaoAtiva, setCertidaoAtiva] = useState<CertidaoCumprimentoJudicialDTO | null>(null);

  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);

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
          toast(err instanceof Error ? err.message : 'Falha ao carregar fila auditável.', { emoji: 'alert-triangle', tom: 'aviso' });
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
        toast(err instanceof Error ? err.message : 'Falha ao consultar processos judiciais.', { emoji: 'alert-triangle', tom: 'aviso' });
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
          toast(err instanceof Error ? err.message : 'Falha ao carregar trilha de auditoria.', { emoji: 'alert-triangle', tom: 'aviso' });
          setCarregandoAuditoria(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [subAba]);

  async function executarAlocacaoJudicial(demanda: DemandaJudicial) {
    const confirmou = window.confirm(
      `Confirma a alocação prioritária imediata de vaga para "${demanda.estudanteNome}" na unidade "${demanda.escolaNome}" em cumprimento ao Processo nº ${demanda.numeroProcesso}?`,
    );
    if (!confirmou) return;

    try {
      const res = await vagasStore.alocarVagaJudicial(
        demanda.id,
        `Alocação tempestiva em cumprimento ao Mandado do Processo ${demanda.numeroProcesso} (${demanda.vara})`,
      );
      toast(`Vaga judicial alocada com sucesso! Protocolo emitido: ${res.protocoloCodigo}`, {
        emoji: 'check-circle',
        tom: 'ok',
      });
      recarregarDemandasJudiciais();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao alocar vaga judicial.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
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
        <div>
          <span className="lp-tag">Gestão Municipal · Patos - PB</span>
          <h1>{painel.orgao}</h1>
          <p>
            Monitoramento integrado de vagas livres, demanda reprimida por bairro de <strong>Patos - PB</strong>,
            alertas ativos no WhatsApp e protocolos presenciais.
          </p>
        </div>
        <div className="secretaria-acoes-topo">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secundario btn-pequeno"
              onClick={exportarProtocolosCsv}
              title="Exportar todos os protocolos da rede em planilha CSV"
            >
              <Icone nome="file-text" tamanho={14} /> Protocolos (CSV)
            </button>
            <button
              type="button"
              className="btn btn-secundario btn-pequeno"
              onClick={exportarFilaEsperaCsv}
              title="Exportar fila de espera da rede em planilha CSV"
            >
              <Icone nome="list" tamanho={14} /> Fila de Espera (CSV)
            </button>
            <button
              type="button"
              className="btn btn-secundario btn-pequeno"
              onClick={exportarOcupacaoBairrosCsv}
              title="Exportar indicador de demanda por bairro em CSV"
            >
              <Icone nome="pin" tamanho={14} /> Bairros (CSV)
            </button>
          </div>
          {onAbrirLeitor && (
            <button
              type="button"
              className="btn btn-primario btn-pequeno btn-escanear-qr"
              onClick={onAbrirLeitor}
              title="Abrir câmera para escanear QR Code do comprovante presencial"
            >
              <Icone nome="qr-code" tamanho={15} /> Escanear / Localizar Protocolo
            </button>
          )}
          <button
            type="button"
            className="btn btn-fantasma btn-pequeno"
            onClick={onSair}
            title="Encerrar sessão de gestão da Secretaria"
          >
            <Icone nome="x" tamanho={14} /> Sair da Secretaria
          </button>
        </div>
      </section>

      {/* Navegação entre Visão Geral da Rede, Fila Regulada, Demandas Judiciais e Auditoria */}
      <div
        className="sub-abas-navegacao"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className={`btn ${subAba === 'rede' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => setSubAba('rede')}
        >
          <Icone nome="landmark" tamanho={16} /> Visão Geral da Rede
        </button>
        <button
          type="button"
          className={`btn ${subAba === 'regulacao' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => setSubAba('regulacao')}
        >
          <Icone nome="scale" tamanho={16} /> Fila & Regulação Auditável
        </button>
        <button
          type="button"
          className={`btn ${subAba === 'judicial' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => setSubAba('judicial')}
          style={{ position: 'relative' }}
        >
          <Icone nome="file-text" tamanho={16} /> Demandas Judiciais (PJ-e)
          {demandasJudiciais.filter((d) => d.status === 'pendente').length > 0 && (
            <span
              style={{
                background: '#EF4444',
                color: '#FFF',
                borderRadius: '10px',
                padding: '2px 7px',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginLeft: '6px',
              }}
            >
              {demandasJudiciais.filter((d) => d.status === 'pendente').length}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`btn ${subAba === 'auditoria' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => setSubAba('auditoria')}
        >
          <Icone nome="history" tamanho={16} /> Trilha de Auditoria (TCE / MP)
        </button>
      </div>

      {subAba === 'rede' && (
        <>
          {/* KPIs Macro da Rede Municipal de Patos-PB */}
      <section className="kpis kpis-secretaria" aria-label="Indicadores globais da rede de Patos - PB">
        <div className="kpi">
          <span className="kpi-num">{kpis.vagasLivres}</span>
          <span>vagas livres hoje (de {kpis.capacidadeRede})</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{kpis.taxaOcupacao}%</span>
          <span>taxa de ocupação da rede ({kpis.totalUnidades} unidades)</span>
        </div>
        <div className="kpi kpi-alerta">
          <span className="kpi-num">{kpis.filaEsperaTotal + kpis.alertasAtivosTotal}</span>
          <span>
            demanda reprimida ({kpis.filaEsperaTotal} em fila + {kpis.alertasAtivosTotal} alertas{' '}
            <Icone nome="bell" tamanho={14} />)
          </span>
        </div>
        <div className="kpi kpi-destaque">
          <span className="kpi-num">{kpis.protocolosAguardando}</span>
          <span>protocolos QR aguardando ({kpis.protocolosAtendidos} já atendidos)</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{kpis.taxaAbsenteismo ?? 0}%</span>
          <span>taxa de absenteísmo ({kpis.protocolosExpirados ?? 0} expirados)</span>
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
        <section className="sec-bloco" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icone nome="scale" tamanho={22} /> Regulação Municipal & Fila Unificada Auditável
              </h2>
              <p className="legenda" style={{ margin: '4px 0 0' }}>
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
          <div
            style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '0.86rem',
              color: '#0369A1',
              lineHeight: '1.45',
            }}
          >
            <strong>Critérios Legais de Desempate e Vulnerabilidade Ativos (Patos - PB):</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {LISTA_CRITERIOS_VULNERABILIDADE.map((c) => (
                <span
                  key={c.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #7DD3FC',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontWeight: 500,
                  }}
                >
                  +{c.pontos} pts · {c.nome}
                </span>
              ))}
            </div>
          </div>

          {/* Filtros da Fila */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Etapa:</span>
              <button
                type="button"
                className={`btn btn-pequeno ${etapaFiltro === 'todas' ? 'btn-primario' : 'btn-secundario'}`}
                onClick={() => setEtapaFiltro('todas')}
              >
                Todas as Etapas
              </button>
              {ORDEM_ETAPAS.map((eid) => (
                <button
                  key={eid}
                  type="button"
                  className={`btn btn-pequeno ${etapaFiltro === eid ? 'btn-primario' : 'btn-secundario'}`}
                  onClick={() => setEtapaFiltro(eid)}
                >
                  <IconeEtapa etapa={eid} tamanho={14} /> {ETAPAS[eid]?.nome ?? eid}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="search"
                className="campo-busca-fila"
                placeholder="Buscar por código ou iniciais..."
                value={buscaFila}
                onChange={(e) => setBuscaFila(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  minWidth: '240px',
                }}
              />
            </div>
          </div>

          {/* Tabela de Fila */}
          {carregandoFila ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <Icone nome="hourglass" tamanho={24} />
              <p style={{ marginTop: '8px' }}>Carregando fila regulatória auditável...</p>
            </div>
          ) : filaAuditavel.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
              <Icone nome="check-circle" tamanho={32} />
              <p style={{ margin: '8px 0 0', fontWeight: 500 }}>
                Nenhuma solicitação na fila para o filtro selecionado.
              </p>
            </div>
          ) : (
            <div className="tabela-quadro-container" role="region" aria-label="Fila auditável">
              <table className="tabela-secretaria">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '60px' }}>Pos.</th>
                    <th scope="col">Protocolo</th>
                    <th scope="col">Estudante</th>
                    <th scope="col">Responsável</th>
                    <th scope="col">Unidade / Bairro</th>
                    <th scope="col">Etapa & Turma</th>
                    <th scope="col">Score Regulatório</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Status</th>
                    <th scope="col">Inscrição</th>
                  </tr>
                </thead>
                <tbody>
                  {filaAuditavel.map((item) => (
                    <tr key={item.codigo}>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>
                        {item.origem === 'judicial' ? (
                          <span title="Prioridade Absoluta por Decisão Judicial">⚖️ 1º</span>
                        ) : (
                          `#${item.posicao}`
                        )}
                      </td>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{item.codigo}</strong>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.estudanteIniciais}</td>
                      <td style={{ color: '#475569' }}>{item.responsavelIniciais}</td>
                      <td>
                        <div><strong>{item.escolaNome}</strong></div>
                        <small style={{ color: '#64748B' }}>{item.escolaBairro}</small>
                      </td>
                      <td>
                        <div>{ETAPAS[item.etapa]?.nome ?? item.etapa}</div>
                        <small style={{ color: '#64748B' }}>{item.turma} ({item.periodo})</small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: 700, color: item.pontosTotais > 0 ? '#1D4ED8' : '#64748B' }}>
                            {item.pontosTotais} pontos
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {item.criteriosAtendidos.map((cid) => (
                              <span
                                key={cid}
                                style={{
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                  fontSize: '0.72rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  border: '1px solid #BFDBFE',
                                }}
                                title={CRITERIOS_VULNERABILIDADE[cid]?.descricao}
                              >
                                {CRITERIOS_VULNERABILIDADE[cid]?.nome}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.origem === 'judicial' ? (
                          <span
                            style={{
                              background: '#FEF2F2',
                              color: '#991B1B',
                              border: '1px solid #FECACA',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            Mandado Judicial
                          </span>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '0.8rem' }}>Regular</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: item.reservaVaga ? '#ECFDF5' : '#F1F5F9',
                            color: item.reservaVaga ? '#065F46' : '#475569',
                          }}
                        >
                          {item.reservaVaga ? 'Vaga Pré-Reservada' : 'Fila de Espera'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
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
        <section className="sec-bloco" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icone nome="file-text" tamanho={22} /> Central de Demandas Judiciais & Liminares (PJ-e)
              </h2>
              <p className="legenda" style={{ margin: '4px 0 0' }}>
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
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <Icone nome="hourglass" tamanho={24} />
              <p style={{ marginTop: '8px' }}>Carregando processos judiciais autuados...</p>
            </div>
          ) : demandasJudiciais.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
              <Icone nome="check-circle" tamanho={32} />
              <p style={{ margin: '8px 0 0', fontWeight: 500 }}>
                Nenhuma ordem judicial pendente ou cadastrada no sistema.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {demandasJudiciais.map((demanda) => {
                const prazoDate = new Date(demanda.prazoLimiteEm);
                const horasRestantes = Math.round((demanda.prazoLimiteEm - agora) / (1000 * 60 * 60));
                const estaVencendo = demanda.status === 'pendente' && horasRestantes <= 24 && horasRestantes > 0;
                const estaVencida = demanda.status === 'pendente' && horasRestantes <= 0;

                return (
                  <div
                    key={demanda.id}
                    style={{
                      background: '#FFFFFF',
                      border: estaVencida
                        ? '2px solid #EF4444'
                        : estaVencendo
                        ? '2px solid #F59E0B'
                        : demanda.status === 'alocado'
                        ? '1px solid #10B981'
                        : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#1E293B',
                            background: '#F1F5F9',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                          title={demanda.numeroProcesso}
                        >
                          {mascararProcessoCNJ(demanda.numeroProcesso)}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background:
                              demanda.status === 'alocado'
                                ? '#DEF7EC'
                                : estaVencida
                                ? '#FDE8E8'
                                : '#FEF08A',
                            color:
                              demanda.status === 'alocado'
                                ? '#03543F'
                                : estaVencida
                                ? '#9B1C1C'
                                : '#713F12',
                          }}
                        >
                          {demanda.status === 'alocado'
                            ? 'Alocado (Cumprida)'
                            : estaVencida
                            ? 'Prazo Expirado'
                            : 'Pendente'}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0F172A' }}>
                        {demanda.estudanteNome}
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#64748B' }}>
                        Responsável: <strong>{demanda.responsavelNome}</strong> (CPF: {demanda.cpfCertidao})
                      </p>

                      <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Vara:</strong> {demanda.vara}</div>
                        <div><strong>Destino:</strong> {demanda.escolaNome} ({ETAPAS[demanda.etapa]?.nome ?? demanda.etapa})</div>
                        {demanda.multaDiaria ? (
                          <div style={{ color: '#DC2626', fontWeight: 600 }}>
                            ⚠️ Multa cominatória (astreinte): R$ {demanda.multaDiaria.toLocaleString('pt-BR')}/dia
                          </div>
                        ) : null}
                      </div>

                      {/* Contador do Prazo */}
                      {demanda.status !== 'alocado' && (
                        <div
                          style={{
                            background: estaVencida ? '#FEF2F2' : estaVencendo ? '#FFFBEB' : '#F8FAFC',
                            border: `1px solid ${estaVencida ? '#FECACA' : estaVencendo ? '#FDE68A' : '#E2E8F0'}`,
                            borderRadius: '8px',
                            padding: '8px 12px',
                            marginBottom: '14px',
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: estaVencida ? '#991B1B' : estaVencendo ? '#92400E' : '#475569' }}>
                            Prazo Fatal: {prazoDate.toLocaleDateString('pt-BR')} às {prazoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '0.78rem', marginTop: '2px', color: estaVencida ? '#B91C1C' : '#64748B' }}>
                            {estaVencida
                              ? `⚠️ Vencido há ${Math.abs(horasRestantes)} horas!`
                              : `Restam aproximadamente ${horasRestantes} horas para cumprimento.`}
                          </div>
                        </div>
                      )}

                      {demanda.protocoloCodigo && (
                        <div
                          style={{
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            marginBottom: '14px',
                            fontSize: '0.82rem',
                            color: '#065F46',
                          }}
                        >
                          <strong>Protocolo Vinculado:</strong> {demanda.protocoloCodigo}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {demanda.status !== 'alocado' ? (
                        <button
                          type="button"
                          className="btn btn-primario btn-pequeno"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => executarAlocacaoJudicial(demanda)}
                        >
                          <Icone nome="check-circle" tamanho={14} /> Alocar Vaga Prioritária
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secundario btn-pequeno"
                          style={{ width: '100%', justifyContent: 'center' }}
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
        <section className="sec-bloco" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icone nome="history" tamanho={22} /> Trilha de Auditoria Governamental (TCE-PB / MP-PB)
            </h2>
            <p className="legenda" style={{ margin: '4px 0 0' }}>
              Registro cronológico e imutável de todas as mutações e atos de regulação de vagas escolares. Rastreabilidade com IP, operador, perfil de acesso e fundamentação legal.
            </p>
          </div>

          {carregandoAuditoria ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
              <Icone nome="hourglass" tamanho={24} />
              <p style={{ marginTop: '8px' }}>Carregando registros de auditoria...</p>
            </div>
          ) : logsAuditoria.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '8px', color: '#64748B' }}>
              <Icone nome="check-circle" tamanho={32} />
              <p style={{ margin: '8px 0 0', fontWeight: 500 }}>
                Nenhum log registrado até o momento.
              </p>
            </div>
          ) : (
            <div className="tabela-quadro-container" role="region" aria-label="Logs de auditoria">
              <table className="tabela-secretaria">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '150px' }}>Data / Hora</th>
                    <th scope="col">Operador / Papel</th>
                    <th scope="col">Ação Regulada</th>
                    <th scope="col">Entidade</th>
                    <th scope="col">Justificativa & Detalhes</th>
                    <th scope="col">Rastro / IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logsAuditoria.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {new Date(log.criadoEm).toLocaleDateString('pt-BR')} {new Date(log.criadoEm).toLocaleTimeString('pt-BR')}
                      </td>
                      <td>
                        <strong>{log.operadorUsuario}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{log.operadorPerfil.toUpperCase()}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            background:
                              log.acao === 'ALOCACAO_JUDICIAL'
                                ? '#FEF2F2'
                                : log.acao === 'BAIXA_PRESENCIAL'
                                ? '#ECFDF5'
                                : '#F1F5F9',
                            color:
                              log.acao === 'ALOCACAO_JUDICIAL'
                                ? '#991B1B'
                                : log.acao === 'BAIXA_PRESENCIAL'
                                ? '#065F46'
                                : '#334155',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {log.acao}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{log.protocoloCodigo ?? log.escolaId ?? '-'}</div>
                        <small style={{ color: '#64748B' }}>{log.protocoloCodigo ? 'Protocolo' : log.escolaId ? 'Escola' : 'Geral'}</small>
                      </td>
                      <td style={{ fontSize: '0.84rem', maxWidth: '300px' }}>
                        {log.justificativa}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {log.ip ?? '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modais de Gestão Judicial e Certidão */}
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
    </div>
  );
}

function PainelUnidade({
  escola,
  escolas,
  podeTrocarLivremente,
  onTrocarEscola,
  onAbrirLeitor,
  onSair,
}: {
  escola: Escola;
  escolas: Escola[];
  podeTrocarLivremente: boolean;
  onTrocarEscola: (id: string) => void;
  onAbrirLeitor?: () => void;
  onSair: () => void;
}) {
  const agora = useAgora(15_000);
  const historico = useHistorico().filter((h) => h.escolaId === escola.id);
  const protocolos = useProtocolos().filter((p) => p.escolaId === escola.id);
  const velho = desatualizado(escola.atualizadoEm, agora);
  const totalVagas = escola.ofertas.reduce((s, o) => s + o.vagas, 0);
  const totalFila = escola.ofertas.reduce((s, o) => s + o.fila, 0);
  const aguardandoAlerta = escola.alertasAtivos ?? 0;
  const protPendentes = protocolos.filter((p) => p.status === 'aguardando');
  const seletorId = useId();

  function exportarProtocolosUnidadeCsv() {
    const cabecalhos = [
      'Código',
      'Etapa',
      'Turma',
      'Período',
      'Responsável',
      'Telefone',
      'Data da Visita',
      'Turno',
      'Documentos Marcados',
      'Total Obrigatórios',
      'Status',
      'Reserva de Vaga',
      'Posição na Fila',
      'Data de Emissão',
    ];
    const linhas = protocolos.map((p) => [
      p.codigo,
      p.etapa,
      p.turma,
      p.periodo,
      p.responsavel,
      p.telefone ?? '',
      p.dataVisita,
      p.turnoVisita,
      p.documentosMarcados.length,
      p.totalObrigatorios,
      p.status,
      p.reservaVaga ? 'Sim (Vaga Pré-Reservada)' : 'Não (Fila de Espera)',
      p.posicaoFila ?? '',
      new Date(p.criadoEm).toLocaleString('pt-BR'),
    ]);
    const blob = new Blob([gerarCsv(cabecalhos, linhas)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protocolos-${escola.id}-${dataLocalISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast(`Planilha da unidade baixada!`, { emoji: 'check-circle', tom: 'ok' });
  }

  return (
    <>
      <section className="painel-cabecalho">
        <div>
          <div className="seletor-unidade-rapido">
            <label htmlFor={seletorId}>Unidade ativa em Patos - PB:</label>
            <select
              id={seletorId}
              value={escola.id}
              onChange={(e) => onTrocarEscola(e.target.value)}
              title={
                podeTrocarLivremente
                  ? 'Alternar unidade (sessão SEDUC ativa)'
                  : 'Trocar de unidade exigirá o PIN da outra escola'
              }
            >
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} ({e.bairro})
                </option>
              ))}
            </select>
          </div>
          <h1>{escola.nome}</h1>
          <p>{escola.endereco}</p>
        </div>

        <div className="painel-cabecalho-dir">
          <div className={`selo-atualizacao ${velho ? 'velho' : ''}`}>
            <Icone nome={velho ? 'alert-triangle' : 'check-circle'} tamanho={15} /> Atualizado{' '}
            {tempoRelativo(escola.atualizadoEm, agora)}
          </div>
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={onSair} title="Encerrar sessão desta unidade escolar">
            <Icone nome="x" tamanho={14} /> Sair da Unidade
          </button>
        </div>
      </section>

      <section className="kpis" aria-label="Resumo da unidade">
        <div className="kpi">
          <span className="kpi-num">{totalVagas}</span>
          <span>vagas livres</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{totalFila}</span>
          <span>na lista de espera</span>
        </div>
        <div className="kpi kpi-destaque">
          <span className="kpi-num">{aguardandoAlerta}</span>
          <span>
            alertas de vaga ativos <Icone nome="bell" tamanho={14} />
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{protPendentes.length}</span>
          <span>
            protocolos QR aguardando <Icone nome="ticket" tamanho={14} />
          </span>
        </div>
      </section>

      {/* Recepção de Protocolos de Pré-Agendamento com QR Code */}
      <section className="sec-bloco" aria-labelledby="t-prot-escola">
        <div className="sec-bloco-topo">
          <div>
            <h2 id="t-prot-escola">
              <Icone nome="ticket" tamanho={20} /> Protocolos de Atendimento Presencial ({protocolos.length})
            </h2>
            <p className="legenda">
              Protocolos emitidos pelos responsáveis. Ao confirmar a matrícula, 1 vaga é ocupada automaticamente na
              turma correspondente.
            </p>
          </div>
          {onAbrirLeitor && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secundario btn-pequeno"
                onClick={exportarProtocolosUnidadeCsv}
                title="Exportar protocolos desta unidade escolar em CSV"
              >
                <Icone nome="file-text" tamanho={15} />
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primario btn-pequeno btn-escanear-qr"
                onClick={onAbrirLeitor}
                title="Abrir câmera para escanear QR Code do voucher presencial"
              >
                <Icone nome="qr-code" tamanho={16} />
                <span>Escanear QR Code</span>
              </button>
            </div>
          )}
        </div>

        {protocolos.length === 0 ? (
          <p className="legenda">
            Nenhum protocolo de atendimento presencial emitido para esta unidade no momento.
          </p>
        ) : (
          <ul className="lista-protocolos-gestao">
            {protocolos.map((p: ProtocoloVisita) => (
              <li key={p.codigo} className={`card-prot-gestao prot-status-${p.status}`}>
                <div className="card-prot-principal">
                  <div className="card-prot-topo">
                    <strong className="prot-badge-codigo">{p.codigo}</strong>
                    {p.reservaVaga && p.status === 'aguardando' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#E8F5E9',
                          color: '#1B5E20',
                          border: '1px solid #81C784',
                        }}
                      >
                        🔒 Vaga Pré-Reservada
                      </span>
                    )}
                    {p.motivoCancelamento === 'expirado_sem_comparecimento' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#FFEBEE',
                          color: '#C62828',
                          border: '1px solid #E57373',
                        }}
                      >
                        ⌛ Expirado (Vaga Devolvida)
                      </span>
                    )}
                    <span className={`selo-protocolo selo-prot-${p.status}`}>
                      {p.status === 'atendido' ? (
                        <>
                          <Icone nome="check-circle" tamanho={14} /> Atendido / Matriculado
                        </>
                      ) : p.status === 'cancelado' ? (
                        <>
                          <Icone nome="x" tamanho={14} /> Cancelado
                        </>
                      ) : (
                        <>
                          <Icone nome="hourglass" tamanho={14} /> Aguardando atendimento
                        </>
                      )}
                    </span>
                  </div>
                  <h3>{p.responsavel}</h3>
                  <p>
                    <Icone nome="backpack" tamanho={14} /> <strong>{p.turma}</strong> (
                    {p.periodo === 'integral' ? 'Integral' : 'Meio período'}) · <Icone nome="calendar" tamanho={14} />{' '}
                    Visita: <strong>{p.dataVisita.split('-').reverse().join('/')}</strong> (
                    {p.turnoVisita === 'manha' ? 'Manhã' : 'Tarde'}) · <Icone nome="list" tamanho={14} /> Docs:{' '}
                    <strong>
                      {p.documentosMarcados.length}/{p.totalObrigatorios}
                    </strong>
                    {p.telefone ? (
                      <>
                        {' '}
                        · <Icone nome="phone" tamanho={14} /> {p.telefone}
                      </>
                    ) : (
                      ''
                    )}
                  </p>
                </div>

                {p.status === 'aguardando' && (
                  <div className="card-prot-acoes">
                    <button
                      type="button"
                      className="btn btn-primario btn-pequeno"
                      onClick={async () => {
                        try {
                          await vagasStore.atualizarStatusProtocolo(p.codigo, 'atendido');
                          toast(`Matrícula do protocolo ${p.codigo} confirmada com sucesso!`, {
                            emoji: 'check-circle',
                            tom: 'ok',
                          });
                        } catch (err) {
                          toast(err instanceof Error ? err.message : 'Falha ao confirmar matrícula.', {
                            emoji: 'alert-triangle',
                            tom: 'aviso',
                          });
                        }
                      }}
                    >
                      <Icone nome="check" tamanho={15} /> Confirmar matrícula
                    </button>
                    <button
                      type="button"
                      className="btn btn-fantasma btn-pequeno"
                      onClick={async () => {
                        try {
                          await vagasStore.atualizarStatusProtocolo(p.codigo, 'cancelado');
                          toast(
                            `Protocolo ${p.codigo} cancelado. Se havia vaga pré-reservada, ela retornou para a escola.`,
                            { emoji: 'info', tom: 'aviso' },
                          );
                        } catch (err) {
                          toast(err instanceof Error ? err.message : 'Falha ao cancelar protocolo.', {
                            emoji: 'alert-triangle',
                            tom: 'aviso',
                          });
                        }
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="painel-dica">
        <span aria-hidden="true">
          <Icone nome="lightbulb" tamanho={20} />
        </span>
        <p>
          Ao ajustar as vagas nos botões <strong>+</strong> e <strong>−</strong> abaixo, o quadro de vagas da rede de
          Patos - PB é atualizado imediatamente para os pais e para a Secretaria.
        </p>
      </div>

      <section className="ofertas" aria-label="Vagas por turma">
        {escola.ofertas.map((o) => (
          <LinhaOferta key={`${o.etapa}-${o.periodo}`} escolaId={escola.id} oferta={o} />
        ))}
      </section>

      <div className="painel-acoes">
        <button
          type="button"
          className="btn btn-secundario"
          onClick={async () => {
            try {
              await vagasStore.confirmarDados(escola.id);
              toast('Quadro de vagas confirmado com sucesso!', { emoji: 'check-circle', tom: 'ok' });
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Falha ao confirmar dados.', {
                emoji: 'alert-triangle',
                tom: 'aviso',
              });
            }
          }}
        >
          <Icone nome="thumbs-up" tamanho={16} /> Confirmar quadro de vagas hoje
        </button>
      </div>

      <section className="historico">
        <h2>
          <Icone nome="scroll" tamanho={20} /> Histórico de auditoria da unidade
        </h2>
        {historico.length === 0 ? (
          <p className="legenda">Nenhuma alteração registrada nesta sessão ainda.</p>
        ) : (
          <ul>
            {historico.slice(0, 12).map((h) => (
              <li key={h.id}>
                <time dateTime={new Date(h.em).toISOString()}>
                  {new Date(h.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </time>
                <span>
                  <IconeEtapa etapa={h.etapa} tamanho={15} /> {ETAPAS[h.etapa].nome} ({h.periodo}):{' '}
                  <strong>
                    {h.de} → {h.para}
                  </strong>{' '}
                  vagas
                </span>
                <em>{h.origem === 'protocolo' ? 'Protocolo QR' : h.origem === 'escola' ? 'Secretaria' : 'Sistema'}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function LoginSecretaria({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const emailId = useId();
  const senhaId = useId();
  const erroId = useId();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const emailLimpo = email.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    if (!emailLimpo) {
      setErro('Informe o e-mail institucional ou usuário da Secretaria.');
      return;
    }
    if (!senhaLimpa) {
      setErro('Digite sua senha de acesso.');
      return;
    }

    setAutenticando(true);
    setErro(null);
    try {
      await vagasStore.autenticarGestao({
        perfil: 'secretaria',
        usuario: emailLimpo,
        senha: senhaLimpa,
      });
      onEntrar();
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível validar suas credenciais no servidor da SEDUC.',
      );
    } finally {
      setAutenticando(false);
    }
  }

  return (
    <form className="login-card" onSubmit={enviar} noValidate>
      <div className="login-card-topo">
        <Sticker icon={padlock} palette={PALETTES.clay} loop={false} replayOnHover style={{ width: 56 }} />
        <span className="lp-tag">Acesso Restrito · SEDUC</span>
      </div>

      <h1>Secretaria de Educação</h1>
      <p className="legenda">
        Painel exclusivo de gestão, alocação de vagas e auditoria municipal de Patos - PB. Exige credenciais autorizadas.
      </p>

      <div className="campo">
        <label htmlFor={emailId}>E-mail institucional ou Usuário</label>
        <input
          id={emailId}
          name="username"
          type="email"
          autoComplete="username"
          required
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="next"
          placeholder="ex: secretaria@patos.pb.gov.br"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErro(null);
          }}
          aria-describedby={erro ? erroId : undefined}
          aria-invalid={erro ? true : undefined}
        />
      </div>

      <div className="campo">
        <label htmlFor={senhaId}>Senha de acesso</label>
        <div className="campo-senha-container">
          <input
            id={senhaId}
            name="password"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            required
            enterKeyHint="done"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro(null);
            }}
            aria-describedby={erro ? erroId : undefined}
            aria-invalid={erro ? true : undefined}
          />
          <button
            type="button"
            className="btn-olho"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
            title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
          >
            <Icone nome={mostrarSenha ? 'stop' : 'scale'} tamanho={16} />
          </button>
        </div>
      </div>

      {erro && (
        <p id={erroId} className="erro-campo" role="alert">
          <Icone nome="alert-triangle" tamanho={16} /> {erro}
        </p>
      )}

      <button type="submit" className="btn btn-primario btn-largo" disabled={autenticando}>
        {autenticando ? 'Autenticando na SEDUC…' : 'Entrar na Secretaria de Educação'}{' '}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function LoginUnidade({ escolas, onEntrar }: { escolas: Escola[]; onEntrar: (id: string) => void }) {
  const [escolaId, setEscolaId] = useState(escolas[0]?.id ?? '');
  const [gestor, setGestor] = useState('');
  const [pin, setPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selId = useId();
  const gestorId = useId();
  const pinId = useId();
  const erroId = useId();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const idAlvo = escolaId || escolas[0]?.id;
    const gestorLimpo = gestor.trim();
    const pinLimpo = pin.trim();

    if (!idAlvo) {
      setErro('Selecione uma unidade escolar.');
      return;
    }
    if (!gestorLimpo) {
      setErro('Informe o e-mail ou matrícula funcional do gestor.');
      return;
    }
    if (!pinLimpo) {
      setErro('Informe o PIN de segurança da unidade escolar.');
      return;
    }

    setAutenticando(true);
    setErro(null);
    try {
      await vagasStore.autenticarGestao({
        perfil: 'unidade',
        escolaId: idAlvo,
        usuario: gestorLimpo,
        senha: pinLimpo,
      });
      onEntrar(idAlvo);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'PIN de segurança incorreto para esta unidade escolar.',
      );
    } finally {
      setAutenticando(false);
    }
  }

  return (
    <form className="login-card" onSubmit={enviar} noValidate>
      <div className="login-card-topo">
        <Sticker icon={school} palette={PALETTES.riso} loop={false} replayOnHover style={{ width: 56 }} />
        <span className="lp-tag">Acesso da Unidade Escolar</span>
      </div>

      <h1>Painel da Unidade Escolar</h1>
      <p className="legenda">
        Acesso restrito para gestão de vagas da creche ou escola e atendimento presencial com QR Code.
      </p>

      <div className="campo">
        <label htmlFor={selId}>Unidade escolar de Patos - PB</label>
        <select id={selId} name="unidade" value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
          {escolas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} — {e.bairro}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor={gestorId}>E-mail institucional ou Matrícula do Gestor</label>
        <input
          id={gestorId}
          name="username"
          type="text"
          autoComplete="username"
          required
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          enterKeyHint="next"
          placeholder="ex: gestor@patos.pb.gov.br ou matrícula"
          value={gestor}
          onChange={(e) => {
            setGestor(e.target.value);
            setErro(null);
          }}
          aria-describedby={erro ? erroId : undefined}
          aria-invalid={erro ? true : undefined}
        />
      </div>

      <div className="campo">
        <label htmlFor={pinId}>PIN de segurança da Unidade</label>
        <div className="campo-senha-container">
          <input
            id={pinId}
            name="password"
            type={mostrarPin ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="current-password"
            required
            maxLength={12}
            enterKeyHint="done"
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErro(null);
            }}
            aria-describedby={erro ? erroId : undefined}
            aria-invalid={erro ? true : undefined}
          />
          <button
            type="button"
            className="btn-olho"
            onClick={() => setMostrarPin((v) => !v)}
            aria-label={mostrarPin ? 'Ocultar PIN' : 'Ver PIN'}
            title={mostrarPin ? 'Ocultar PIN' : 'Ver PIN'}
          >
            <Icone nome={mostrarPin ? 'stop' : 'scale'} tamanho={16} />
          </button>
        </div>
      </div>

      {erro && (
        <p id={erroId} className="erro-campo" role="alert">
          <Icone nome="alert-triangle" tamanho={16} /> {erro}
        </p>
      )}

      <button type="submit" className="btn btn-primario btn-largo" disabled={autenticando}>
        {autenticando ? 'Autenticando unidade…' : 'Entrar no painel da unidade'}{' '}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function LinhaOferta({ escolaId, oferta }: { escolaId: string; oferta: Oferta }) {
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

function Contador({
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

function ModalCadastroDemandaJudicial({
  escolas,
  aoFechar,
  aoSucesso,
}: {
  escolas: Escola[];
  aoFechar: () => void;
  aoSucesso: () => void;
}) {
  const [numeroProcesso, setNumeroProcesso] = useState('0801234-56.2026.8.15.0251');
  const [vara, setVara] = useState('1ª Vara da Infância e da Juventude');
  const [juizPromotor, setJuizPromotor] = useState('Dra. Maria Clara / Juíza de Direito');
  const [estudanteNome, setEstudanteNome] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [cpfCertidao, setCpfCertidao] = useState('');
  const [escolaId, setEscolaId] = useState(escolas[0]?.id ?? '');
  const [etapa, setEtapa] = useState<EtapaId>('maternal');
  const [periodo, setPeriodo] = useState<Periodo>('integral');
  const [prazoHoras, setPrazoHoras] = useState(48);
  const [multaDiaria, setMultaDiaria] = useState('500');
  const [observacoes, setObservacoes] = useState('Decisão liminar deferida para garantia imediata de vaga em unidade próxima à residência.');
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!numeroProcesso.trim() || !estudanteNome.trim() || !responsavelNome.trim() || !cpfCertidao.trim()) {
      toast('Preencha os campos obrigatórios da determinação judicial.', { emoji: 'alert-triangle', tom: 'aviso' });
      return;
    }

    setSalvando(true);
    try {
      await vagasStore.cadastrarDemandaJudicial({
        numeroProcesso: numeroProcesso.trim(),
        vara: vara.trim(),
        juizPromotor: juizPromotor.trim() || undefined,
        estudanteNome: estudanteNome.trim(),
        responsavelNome: responsavelNome.trim(),
        cpfCertidao: cpfCertidao.trim(),
        escolaId,
        etapa,
        periodo,
        prazoHoras: Number(prazoHoras) || 48,
        multaDiaria: multaDiaria ? Number(multaDiaria) : undefined,
        observacoes: observacoes.trim() || undefined,
      });

      toast('Demanda judicial autuada com sucesso!', { emoji: 'check-circle', tom: 'ok' });
      aoSucesso();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao autuar processo judicial.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
      setSalvando(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={aoFechar} role="presentation">
      <div
        className="sheet-conteudo"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="t-modal-judicial"
        aria-modal="true"
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span className="lp-tag">Poder Judiciário · PJ-e</span>
            <h2 id="t-modal-judicial" style={{ margin: '6px 0 2px', fontSize: '1.35rem' }}>
              Autuar Determinação Judicial / Liminar
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B' }}>
              Cadastre o mandado ou decisão judicial para controle do prazo fatal e garantia de prioridade legal absoluta.
            </p>
          </div>
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={aoFechar}>
            <Icone nome="x" tamanho={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Número do Processo (CNJ) *
              </label>
              <input
                type="text"
                required
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
                placeholder="0000000-00.0000.8.15.0000"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Juiz(a) / Promotor(a)
              </label>
              <input
                type="text"
                value={juizPromotor}
                onChange={(e) => setJuizPromotor(e.target.value)}
                placeholder="Nome do magistrado..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Vara / Juízo *
            </label>
            <input
              type="text"
              required
              value={vara}
              onChange={(e) => setVara(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Nome do Aluno (Criança / Beneficiário) *
              </label>
              <input
                type="text"
                required
                value={estudanteNome}
                onChange={(e) => setEstudanteNome(e.target.value)}
                placeholder="Nome do menor..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                CPF para Certidão *
              </label>
              <input
                type="text"
                required
                value={cpfCertidao}
                onChange={(e) => setCpfCertidao(e.target.value)}
                placeholder="000.000.000-00"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Nome do Responsável Legal *
            </label>
            <input
              type="text"
              required
              value={responsavelNome}
              onChange={(e) => setResponsavelNome(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Unidade Escolar Indicada *
              </label>
              <select
                value={escolaId}
                onChange={(e) => setEscolaId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              >
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nome} ({esc.bairro})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Etapa Solicitada *
              </label>
              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value as EtapaId)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              >
                {ORDEM_ETAPAS.map((eid) => (
                  <option key={eid} value={eid}>
                    {ETAPAS[eid]?.nome ?? eid}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Período *
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as Periodo)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              >
                <option value="integral">Integral</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#DC2626', marginBottom: '4px' }}>
                Prazo Fatal (em Horas) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="720"
                value={prazoHoras}
                onChange={(e) => setPrazoHoras(Number(e.target.value) || 48)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #DC2626' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Multa Diária (Astreintes em R$)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={multaDiaria}
                onChange={(e) => setMultaDiaria(e.target.value)}
                placeholder="Ex: 500"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Observações / Teor da Decisão Liminar
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secundario" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={salvando}>
              {salvando ? 'Autuando...' : 'Autuar Mandado Judicial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalCertidaoJudicial({
  certidao,
  aoFechar,
}: {
  certidao: CertidaoCumprimentoJudicialDTO;
  aoFechar: () => void;
}) {
  function copiarHash() {
    navigator.clipboard.writeText(certidao.hashAutenticidade);
    toast('Hash SHA-256 copiado para a área de transferência!', { emoji: 'check-circle', tom: 'ok' });
  }

  function imprimir() {
    window.print();
  }

  return (
    <div className="sheet-backdrop" onClick={aoFechar} role="presentation">
      <div
        className="sheet-conteudo"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="t-certidao-judicial"
        aria-modal="true"
        style={{
          maxWidth: '750px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span className="lp-tag">Certidão Oficial · PJ-e TJ-PB</span>
            <h2 id="t-certidao-judicial" style={{ margin: '6px 0 0', fontSize: '1.4rem' }}>
              Certidão de Cumprimento de Ordem Judicial
            </h2>
          </div>
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="x" tamanho={20} />
          </button>
        </div>

        {/* Corpo Oficial da Certidão */}
        <div
          id="area-impressao-certidao"
          style={{
            border: '2px solid #0F172A',
            padding: '24px',
            borderRadius: '8px',
            background: '#FAFAFA',
            fontFamily: 'serif',
            color: '#0F172A',
            lineHeight: '1.6',
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '14px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ESTADO DA PARAÍBA · MUNICÍPIO DE PATOS
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>SECRETARIA MUNICIPAL DE EDUCAÇÃO (SEDUC)</div>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>Central de Regulação de Vagas e Atendimento ao Judiciário</div>
          </div>

          <div style={{ textAlign: 'center', margin: '14px 0 18px', fontWeight: 700, fontSize: '1.1rem' }}>
            CERTIDÃO ELETRÔNICA DE CUMPRIMENTO TEMPESTIVO DE ORDEM JUDICIAL
          </div>

          <p style={{ textIndent: '2rem', textAlign: 'justify', fontSize: '0.92rem' }}>
            CERTIFICO, para os devidos fins de direito e instrução processual perante a <strong>{certidao.vara}</strong>, que nos autos da ação nº <strong>{certidao.numeroProcesso}</strong>, o Município de Patos / SEDUC deu <strong>integral e tempestivo cumprimento</strong> à determinação judicial de garantia de vaga escolar em favor do(a) infante:
          </p>

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '12px 16px',
              margin: '14px 0',
              fontFamily: 'sans-serif',
              fontSize: '0.88rem',
            }}
          >
            <div><strong>Beneficiário(a):</strong> {certidao.estudanteNome}</div>
            <div><strong>Responsável Legal:</strong> {certidao.responsavelNome} (CPF: {certidao.cpfCertidaoMascarado})</div>
            <div><strong>Unidade Alocada:</strong> {certidao.escolaNome}</div>
            <div><strong>Endereço:</strong> {certidao.escolaEndereco}</div>
            <div><strong>Etapa / Turma:</strong> {certidao.etapaNome} · Turma {certidao.turma} ({certidao.periodo})</div>
            <div><strong>Protocolo Eletrônico de Reserva:</strong> <strong style={{ color: '#047857' }}>{certidao.protocoloCodigo}</strong></div>
            <div><strong>Data e Turno da Visita:</strong> {certidao.dataVisita} ({certidao.turnoVisita})</div>
            <div><strong>Emissão da Certidão:</strong> {new Date(certidao.emitidoEm).toLocaleString('pt-BR')}</div>
          </div>

          <p style={{ textIndent: '2rem', textAlign: 'justify', fontSize: '0.92rem' }}>
            A vaga encontra-se formalmente reservada com prioridade legal absoluta no sistema integrado de matrículas do Município de Patos - PB, cessando quaisquer cominações pecuniárias ou astreintes fixadas.
          </p>

          {/* Autenticação Criptográfica SHA-256 */}
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#F1F5F9',
              border: '1px dashed #64748B',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              CHAVE DE VALIDAÇÃO CRIPTOGRÁFICA (SHA-256):
            </div>
            <div style={{ wordBreak: 'break-all', color: '#0F172A' }}>{certidao.hashAutenticidade}</div>
            <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748B' }}>
              Documento emitido nos termos da Lei Federal nº 14.063/2020 e Lei 11.419/2006 para juntada aos autos do PJ-e.
            </div>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button type="button" className="btn btn-secundario" onClick={copiarHash}>
            <Icone nome="clipboard-check" tamanho={16} /> Copiar Hash SHA-256
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-primario" onClick={imprimir}>
              <Icone nome="file-text" tamanho={16} /> Imprimir / Salvar PDF
            </button>
            <button type="button" className="btn btn-fantasma" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
