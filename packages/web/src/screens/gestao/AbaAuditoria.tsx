import { useEffect, useState } from 'react';
import { Icone } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import type { LogAuditoria } from '../../domain/types';
import { vagasStore } from '../../services/vagasStore';
import { formatarAcaoAuditoria } from './auditoriaUtils';

interface Props {
  logsAuditoria: LogAuditoria[];
  totalLogs: number;
  carregandoAuditoria: boolean;
  buscaAuditoria: string;
  setBuscaAuditoria: (busca: string) => void;
  filtroAcaoAuditoria: 'todas' | 'judicial' | 'expiracao' | 'confirmacao';
  setFiltroAcaoAuditoria: (f: 'todas' | 'judicial' | 'expiracao' | 'confirmacao') => void;
}

export function AbaAuditoria({
  logsAuditoria,
  totalLogs,
  carregandoAuditoria,
  buscaAuditoria,
  setBuscaAuditoria,
  filtroAcaoAuditoria,
  setFiltroAcaoAuditoria,
}: Props) {
  const [statusWhats, setStatusWhats] = useState<{
    provedorAtivo: string;
    totalEnviadas: number;
    totalSucessos: number;
    totalFalhas: number;
  } | null>(null);
  const [telTeste, setTelTeste] = useState('(83) 99999-0000');
  const [testandoWhats, setTestandoWhats] = useState(false);

  useEffect(() => {
    vagasStore.obterStatusWhatsApp().then(setStatusWhats).catch(() => {});
  }, []);

  async function handleDispararTeste() {
    if (!telTeste || telTeste.replace(/\D/g, '').length < 10) {
      toast('Informe um número válido com DDD para o teste.', { emoji: 'warning', tom: 'aviso' });
      return;
    }
    setTestandoWhats(true);
    try {
      await vagasStore.dispararTesteWhatsApp(telTeste);
      toast('Mensagem de teste disparada com sucesso no gateway!', { emoji: 'whatsapp', tom: 'ok' });
      const novoStatus = await vagasStore.obterStatusWhatsApp();
      setStatusWhats(novoStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao disparar teste.';
      toast(msg, { emoji: 'cross', tom: 'aviso' });
    } finally {
      setTestandoWhats(false);
    }
  }

  return (
    <section className="sec-bloco sec-bloco-coluna">
      {/* Card de Monitoramento e Governança do Gateway WhatsApp */}
      <div className="card-kpi-governo">
        <div className="card-kpi-topo">
          <div className="card-kpi-icone-box">
            <Icone nome="whatsapp" tamanho={22} />
          </div>
          <div>
            <h3 className="card-kpi-titulo">Gateway de Notificações WhatsApp</h3>
            <p className="legenda sem-margem-topo">
              Provedor ativo:{' '}
              <span className="badge-sucesso-destaque">
                {statusWhats?.provedorAtivo ?? 'mock-local'}
              </span>
              {' · '}Disparos automáticos: Lembrete matinal (07h) e 1h antes da visita
            </p>
          </div>
        </div>

        <div className="kpi-mini-grid">
          <div className="kpi-mini-item">
            <span className="kpi-mini-rotulo">Total Disparadas</span>
            <strong className="kpi-mini-valor">{statusWhats?.totalEnviadas ?? 0}</strong>
          </div>
          <div className="kpi-mini-item">
            <span className="kpi-mini-rotulo">Entregas Bem-Sucedidas</span>
            <strong className="kpi-mini-valor texto-cor-verde">{statusWhats?.totalSucessos ?? 0}</strong>
          </div>
          <div className="kpi-mini-item">
            <span className="kpi-mini-rotulo">Falhas de Conexão</span>
            <strong className="kpi-mini-valor texto-cor-muted">{statusWhats?.totalFalhas ?? 0}</strong>
          </div>
        </div>

        <div className="linha-teste-whatsapp">
          <label htmlFor="input-tel-teste-whats" className="sr-only">Telefone para teste</label>
          <input
            id="input-tel-teste-whats"
            type="tel"
            className="input-teste-whats"
            placeholder="(83) 99999-0000"
            value={telTeste}
            onChange={(e) => setTelTeste(e.target.value)}
          />
          <button
            type="button"
            className="btn-primario btn-pequeno"
            onClick={handleDispararTeste}
            disabled={testandoWhats}
          >
            {testandoWhats ? 'Disparando...' : 'Enviar Mensagem de Teste'}
          </button>
        </div>
      </div>
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
            Todas ({totalLogs})
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
      ) : logsAuditoria.length === 0 ? (
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
              {logsAuditoria.map((log) => {
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
  );
}

