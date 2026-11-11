import { Icone } from '../../components/Icone';
import type { LogAuditoria } from '../../domain/types';
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
  return (
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

