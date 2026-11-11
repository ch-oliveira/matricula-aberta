import { useEffect, useMemo, useState } from 'react';
import { Icone } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import {
  CRITERIOS_VULNERABILIDADE,
  dataLocalISO,
  gerarCsv,
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
import { AbaAuditoria } from './AbaAuditoria';
import { AbaDemandasJudiciais } from './AbaDemandasJudiciais';
import { AbaRede } from './AbaRede';
import { AbaRegulacaoFila } from './AbaRegulacaoFila';
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
        <AbaRede
          painel={painel}
          agora={agora}
          onAbrirUnidade={onAbrirUnidade}
        />
      )}

      {subAba === 'regulacao' && (
        <AbaRegulacaoFila
          filaAuditavel={filaAuditavel}
          etapaFiltro={etapaFiltro}
          setEtapaFiltro={setEtapaFiltro}
          buscaFila={buscaFila}
          setBuscaFila={setBuscaFila}
          carregandoFila={carregandoFila}
          onExportarCsv={exportarFilaAuditavelCsv}
        />
      )}

      {subAba === 'judicial' && (
        <AbaDemandasJudiciais
          demandasJudiciais={demandasJudiciais}
          carregandoJudicial={carregandoJudicial}
          agora={agora}
          onAutuar={() => setModalCadastroJudicial(true)}
          onAlocar={(demanda) => setDemandaParaAlocar(demanda)}
          onEmitirCertidao={(demandaId) => abrirCertidaoJudicial(demandaId)}
        />
      )}

      {subAba === 'auditoria' && (
        <AbaAuditoria
          logsAuditoria={logsAuditoriaFiltrados}
          totalLogs={logsAuditoria.length}
          carregandoAuditoria={carregandoAuditoria}
          buscaAuditoria={buscaAuditoria}
          setBuscaAuditoria={setBuscaAuditoria}
          filtroAcaoAuditoria={filtroAcaoAuditoria}
          setFiltroAcaoAuditoria={setFiltroAcaoAuditoria}
        />
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
