import { useEffect } from 'react';
import { Icone } from '../../components/Icone';
import type { PainelSecretariaDTO, ProtocoloVisita } from '../../domain/types';

interface Props {
  painel: PainelSecretariaDTO;
  protocolos: ProtocoloVisita[];
  aoFechar: () => void;
}

export function ModalRelatorioConsolidadoTce({ painel, protocolos, aoFechar }: Props) {
  const { kpis } = painel;
  const dataEmissao = new Date().toLocaleString('pt-BR');
  const totalPrioritarios = protocolos.filter((p) => (p.pontosPrioridade ?? 0) > 0).length;
  const totalJudiciais = protocolos.filter((p) => p.origem === 'judicial').length;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        aoFechar();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aoFechar]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="t-modal-relatorio-tce"
      onClick={aoFechar}
    >
      <div
        className="modal-box relatorio-tce-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relatorio-tce-corpo">
          {/* Cabeçalho Institucional */}
          <div className="relatorio-tce-cabecalho">
            <div className="relatorio-tce-ente">
              ESTADO DA PARAÍBA · PREFEITURA MUNICIPAL DE PATOS (IBGE {painel.codigoIbge})
            </div>
            <div className="relatorio-tce-orgao">
              {painel.orgao.toUpperCase()}
            </div>
            <h3 id="t-modal-relatorio-tce" className="relatorio-tce-titulo">
              RELATÓRIO CONSOLIDADO DE REGULAÇÃO ESCOLAR E TRANSPARÊNCIA (TCE-PB / MP-PB)
            </h3>
            <div className="relatorio-tce-sub">
              Emitido em: {dataEmissao} · Fundamentação: ECA (Lei 8.069/90), LBI (Lei 13.146/15) e LGPD (Lei 13.709/18)
            </div>
          </div>

          {/* 1. Indicadores Globais */}
          <h4 className="relatorio-tce-secao-titulo">
            1. Balanço Consolidado de Capacidade e Ocupação da Rede Municipal
          </h4>
          <div className="relatorio-tce-grid-kpis">
            <div className="relatorio-tce-kpi-card">
              <small>Unidades Ativas</small>
              <strong>{kpis.totalUnidades}</strong>
            </div>
            <div className="relatorio-tce-kpi-card">
              <small>Capacidade Total</small>
              <strong>{kpis.capacidadeRede} vagas</strong>
            </div>
            <div className="relatorio-tce-kpi-card">
              <small>Vagas Livres Agora</small>
              <strong className="texto-destaque-sucesso">{kpis.vagasLivres}</strong>
            </div>
            <div className="relatorio-tce-kpi-card">
              <small>Taxa de Ocupação</small>
              <strong>{kpis.taxaOcupacao}%</strong>
            </div>
          </div>

          {/* 2. Regulação e Atendimento Presencial */}
          <h4 className="relatorio-tce-secao-titulo">
            2. Indicadores de Regulação, Prioridade Legal e Atendimento Presencial
          </h4>
          <div className="relatorio-tce-bloco-texto">
            <div>• <strong>Protocolos Presenciais Aguardando Visita:</strong> {kpis.protocolosAguardando} agendamentos com vaga bloqueada</div>
            <div>• <strong>Matrículas Efetivadas (Baixa Presencial):</strong> {kpis.protocolosAtendidos} crianças matriculadas</div>
            <div>• <strong>Atendimentos com Prioridade Legal / Vulnerabilidade:</strong> {totalPrioritarios} protocolos pontuados</div>
            <div>• <strong>Cumprimento de Determinações Judiciais (Liminares PJ-e):</strong> {totalJudiciais} alocações prioritárias</div>
            <div>• <strong>Taxa de Absenteísmo em Agendamentos:</strong> {kpis.taxaAbsenteismo ?? 0}% ({kpis.protocolosExpirados ?? 0} vagas devolvidas automaticamente à rede)</div>
          </div>

          {/* 3. Demanda por Bairro */}
          <h4 className="relatorio-tce-secao-titulo">
            3. Mapa de Pressão e Saldo de Vagas por Bairro (Patos - PB)
          </h4>
          <table className="relatorio-tce-tabela">
            <thead>
              <tr>
                <th>Bairro</th>
                <th>Unid.</th>
                <th>Livres / Cap.</th>
                <th>Demanda (Fila+Alertas)</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {painel.demandaPorBairro.map((b) => (
                <tr key={`rel-${b.bairro}`}>
                  <td className="tabela-bairro-nome">{b.bairro}</td>
                  <td>{b.unidades}</td>
                  <td>{b.vagasLivres} / {b.capacidadeTotal}</td>
                  <td>{b.demandaReprimida}</td>
                  <td className={b.deficitVagas > 0 ? 'tabela-saldo-deficit' : 'tabela-saldo-suprido'}>
                    {b.deficitVagas > 0 ? `Déficit (−${b.deficitVagas})` : 'Suprido'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Botões de Ação */}
        <div className="relatorio-tce-acoes">
          <button type="button" className="btn btn-primario" onClick={() => window.print()}>
            <Icone nome="printer" tamanho={16} /> Imprimir / Salvar PDF Oficial
          </button>
          <button type="button" className="btn btn-fantasma" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

