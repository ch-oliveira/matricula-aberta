import { useEffect, useId, useState } from 'react';
import {
  CRITERIOS_VULNERABILIDADE,
  ETAPAS,
  LISTA_CRITERIOS_VULNERABILIDADE,
  ORDEM_ETAPAS,
  type EtapaId,
  type FilaItemAuditavel,
} from '../domain/types';
import { vagasStore } from '../services/vagasStore';
import { Icone, IconeEtapa } from './Icone';
import { Sheet } from './Sheet';

export function FilaPublicaModal({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  etapaInicial?: EtapaId | null;
  aoFechar: () => void;
}) {
  const [etapa, setEtapa] = useState<EtapaId | 'todas'>('todas');
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState<FilaItemAuditavel[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const idBusca = useId();

  // Ao abrir o modal, reseta a busca para 'todas' para exibir a fila completa
  useEffect(() => {
    if (aberto) {
      setEtapa('todas');
      setBusca('');
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    vagasStore
      .obterFilaPublicaAuditavel({
        etapa: etapa === 'todas' ? undefined : etapa,
        busca: busca.trim() || undefined,
      })
      .then((res) => {
        if (!cancelado) {
          setItens(res);
          setCarregando(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setErro(err instanceof Error ? err.message : 'Falha ao consultar fila pública.');
          setCarregando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [aberto, etapa, busca]);

  return (
    <Sheet
      open={aberto}
      onClose={aoFechar}
      className="sheet-larga"
      titulo={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icone nome="scale" tamanho={22} />
          <span>Fila Pública Auditável de Vagas</span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <span className="lp-tag">Transparência Ativa · Patos - PB</span>
          <p className="legenda" style={{ margin: '6px 0 0', lineHeight: 1.45 }}>
            Fiscalização social e regulação de vagas escolares. Conformidade com o{' '}
            <strong>Marco Legal da 1ª Infância (Lei 13.257/16)</strong>, <strong>ECA (art. 53)</strong> e{' '}
            <strong>Lei 12.764/12 (TEA)</strong>. Dados de menores e responsáveis protegidos por anonimização (LGPD Safe).
          </p>
        </div>

        {/* Critérios Legais Explicativos com visual integrado ao Design System */}
        <div
          style={{
            background: 'var(--surface-alt)',
            border: '2px solid var(--line)',
            borderRadius: 'var(--r-sm)',
            boxShadow: '2px 2px 0 var(--line)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.84rem' }}>
            <Icone nome="award" tamanho={16} /> Critérios Legais e Pontuação Objetiva de Desempate (Patos - PB):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {LISTA_CRITERIOS_VULNERABILIDADE.map((c) => (
              <span
                key={c.id}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
                title={c.amparoLegal}
              >
                +{c.pontos} pts: {c.nome}
              </span>
            ))}
          </div>
        </div>

        {/* Filtros e Busca */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }} className="campo">
            <label htmlFor={idBusca} style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              Buscar por protocolo, escola ou bairro:
            </label>
            <input
              id={idBusca}
              type="search"
              placeholder="Ex.: PATOS-2027 ou Jatobá…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div style={{ flex: '2 1 320px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
              Filtrar por Etapa:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-pequeno ${etapa === 'todas' ? 'btn-primario' : 'btn-secundario'}`}
                onClick={() => setEtapa('todas')}
              >
                Todas
              </button>
              {ORDEM_ETAPAS.map((et) => (
                <button
                  key={et}
                  type="button"
                  className={`btn btn-pequeno ${etapa === et ? 'btn-primario' : 'btn-secundario'}`}
                  onClick={() => setEtapa(et)}
                >
                  <IconeEtapa etapa={et} tamanho={14} /> {ETAPAS[et]?.nome ?? et}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Solicitações */}
        <div style={{ minHeight: '220px' }}>
          {carregando ? (
            <p className="aviso-suave" style={{ textAlign: 'center', padding: '30px 0' }}>
              Atualizando posições da fila pública em tempo real…
            </p>
          ) : erro ? (
            <p className="erro-campo" role="alert">
              <Icone nome="alert-triangle" tamanho={16} /> {erro}
            </p>
          ) : itens.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                background: 'var(--surface-alt)',
                border: '2px dashed var(--soft-line)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <Icone nome="check-circle" tamanho={36} />
              <h3 style={{ margin: '8px 0 4px', fontSize: '1.05rem', fontWeight: 800 }}>
                Nenhum candidato em fila para os filtros selecionados
              </h3>
              <p style={{ margin: '0 0 12px', fontSize: '0.84rem', color: 'var(--muted)' }}>
                No momento, as vagas imediatas estão atendendo a demanda ou não há inscrições nesta etapa.
              </p>
              {etapa !== 'todas' && (
                <button
                  type="button"
                  className="btn btn-secundario btn-pequeno"
                  onClick={() => setEtapa('todas')}
                >
                  Ver todas as etapas
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                  color: 'var(--muted)',
                  padding: '0 2px',
                }}
              >
                <span>Exibindo <strong>{itens.length}</strong> protocolo(s) auditáveis</span>
                <span>Critério: 1º Pontuação Legal · 2º Ordem de Entrada</span>
              </div>

              {itens.map((item) => (
                <div
                  key={item.codigo}
                  style={{
                    background: item.origem === 'judicial' ? '#FEF2F2' : 'var(--surface)',
                    border: item.origem === 'judicial' ? '2.5px solid #EF4444' : '2px solid var(--line)',
                    borderRadius: 'var(--r-sm)',
                    boxShadow: item.origem === 'judicial' ? '3px 3px 0 #EF4444' : '3px 3px 0 var(--line)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        background: item.origem === 'judicial' ? '#EF4444' : 'var(--accent)',
                        color: item.origem === 'judicial' ? '#FFFFFF' : 'var(--line)',
                        fontWeight: 900,
                        fontSize: '1rem',
                        width: '38px',
                        height: '38px',
                        border: '2px solid var(--line)',
                        borderRadius: 'var(--r-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title={
                        item.origem === 'judicial'
                          ? 'Prioridade Absoluta por Decisão Judicial'
                          : `Posição ${item.posicao} na fila`
                      }
                    >
                      {item.origem === 'judicial' ? '⚖️' : `#${item.posicao}`}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--text)' }}>
                          {item.codigo}
                        </strong>
                        <span style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>
                          Aluno: <strong>{item.estudanteIniciais}</strong> (Resp.: {item.responsavelIniciais})
                        </span>
                        {item.origem === 'judicial' && (
                          <span
                            style={{
                              background: '#EF4444',
                              color: '#FFFFFF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            Mandado Judicial
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '2px' }}>
                        <IconeEtapa etapa={item.etapa} tamanho={13} /> {item.escolaNome} ({item.escolaBairro}) ·{' '}
                        <strong>{item.turma}</strong> ({item.periodo === 'integral' ? 'Integral' : 'Parcial'})
                      </div>

                      {item.criteriosAtendidos.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {item.criteriosAtendidos.map((cid) => (
                            <span
                              key={cid}
                              style={{
                                background: 'var(--surface-alt)',
                                border: '1px solid var(--line)',
                                color: 'var(--text)',
                                fontSize: '0.72rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              +{CRITERIOS_VULNERABILIDADE[cid]?.pontos ?? 0} pts: {CRITERIOS_VULNERABILIDADE[cid]?.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div
                      style={{
                        background: 'var(--surface-alt)',
                        border: '1.5px solid var(--line)',
                        padding: '4px 8px',
                        borderRadius: 'var(--r-sm)',
                        fontWeight: 800,
                        color: 'var(--text)',
                        fontSize: '0.84rem',
                      }}
                    >
                      {item.pontosTotais} pontos
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: item.reservaVaga ? '#059669' : '#D97706',
                      }}
                    >
                      {item.reservaVaga ? '🔒 Vaga Pré-Reservada' : '⏳ Fila de Espera'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}


