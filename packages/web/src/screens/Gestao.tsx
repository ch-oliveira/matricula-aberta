import { useEffect, useId, useState, type FormEvent } from 'react';
import { Icone, IconeEtapa } from '../components/Icone';
import { LeitorQrModal } from '../components/LeitorQrModal';
import { toast } from '../components/Toasts';
import { Ocupacao, StatusPill } from '../components/ui';
import { ETAPAS, statusDaOferta } from '../domain/etapas';
import { desatualizado, tempoRelativo } from '../domain/geo';
import type { Escola, Oferta, PainelSecretariaDTO, ProtocoloVisita } from '../domain/types';
import { useAgora, useHashRoute } from '../hooks';
import {
  useEscolas,
  useHistorico,
  usePainelSecretaria,
  useProtocolos,
  vagasStore,
} from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { padlock, school } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';

export function Gestao() {
  const escolas = useEscolas();
  const protocolos = useProtocolos();
  const painelSecretaria = usePainelSecretaria();
  const rota = useHashRoute();
  const [leitorQrAberto, setLeitorQrAberto] = useState(false);
  const [aba, setAba] = useState<'secretaria' | 'unidade'>(() =>
    window.location.hash.includes('unidade') ? 'unidade' : 'secretaria',
  );

  useEffect(() => {
    if (rota.includes('unidade')) setAba('unidade');
    else if (rota === '#/gestao' || rota === '#/gestao/secretaria') setAba('secretaria');
  }, [rota]);

  const [authSecretaria, setAuthSecretariaRaw] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ma:gestao:auth:secretaria:v1') === 'true';
    } catch {
      return false;
    }
  });

  const [authUnidade, setAuthUnidadeRaw] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('ma:gestao:auth:unidade:v1');
    } catch {
      return null;
    }
  });

  const setAuthSecretaria = (val: boolean) => {
    setAuthSecretariaRaw(val);
    try {
      if (val) sessionStorage.setItem('ma:gestao:auth:secretaria:v1', 'true');
      else sessionStorage.removeItem('ma:gestao:auth:secretaria:v1');
    } catch {
      /* ignore */
    }
  };

  const setAuthUnidade = (escolaId: string | null) => {
    setAuthUnidadeRaw(escolaId);
    try {
      if (escolaId) sessionStorage.setItem('ma:gestao:auth:unidade:v1', escolaId);
      else sessionStorage.removeItem('ma:gestao:auth:unidade:v1');
    } catch {
      /* ignore */
    }
  };

  // Limpa legado de autologin antigo se existente
  useEffect(() => {
    try {
      localStorage.removeItem('ma:gestao:sessao:v2');
      localStorage.removeItem('ma:gestao:aba:v2');
    } catch {
      /* ignore */
    }
  }, []);

  const escola = authUnidade ? escolas.find((e) => e.id === authUnidade) ?? null : null;

  return (
    <div className="gestao">
      {/* Aviso exclusivo caso alguém acesse a rota #/gestao pelo celular */}
      <section className="gestao-bloqueio-mobile so-mobile" aria-labelledby="t-gestao-web-only">
        <div className="gestao-bloqueio-card">
          <div className="login-card-topo">
            <Sticker icon={padlock} palette={PALETTES.clay} loop={false} replayOnHover style={{ width: 52 }} />
            <span className="lp-tag">Exclusivo Versão Web</span>
          </div>
          <h1 id="t-gestao-web-only">Fluxo de Secretaria e Escola disponível apenas no computador</h1>
          <p className="legenda">
            O painel administrativo da <strong>Secretaria Municipal de Educação (SEDUC)</strong> e das{' '}
            <strong>Unidades Escolares de Patos - PB</strong> é exclusivo para a versão web em computadores e notebooks.
          </p>
          <p className="legenda">
            Pelo celular, acesse o portal público de consulta de vagas, checklist de documentos e emissão de protocolo
            com QR Code para pais e responsáveis.
          </p>
          <a className="btn btn-primario btn-largo" href="#">
            <span aria-hidden="true">←</span> Ir para Consulta de Vagas (Pais)
          </a>
        </div>
      </section>

      <div className="gestao-desktop-shell so-desktop">
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
                  onClick={() => {
                    setAuthSecretaria(false);
                    toast('Sessão da Secretaria de Educação encerrada.', { emoji: 'info', tom: 'info' });
                  }}
                >
                  <Icone nome="x" tamanho={14} /> Sair da Secretaria
                </button>
              )}

              {aba === 'unidade' && authUnidade && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-pequeno"
                  onClick={() => {
                    setAuthUnidade(null);
                    toast('Sessão da Unidade Escolar encerrada.', { emoji: 'info', tom: 'info' });
                  }}
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
                  onAbrirUnidade={(id) => {
                    setAuthUnidade(id);
                    setAba('unidade');
                    window.history.replaceState(null, '', '#/gestao/unidade');
                  }}
                  onAbrirLeitor={() => setLeitorQrAberto(true)}
                  onSair={() => {
                    setAuthSecretaria(false);
                    toast('Sessão da Secretaria encerrada com sucesso.', { emoji: 'info', tom: 'info' });
                  }}
                />
              ) : (
                <p className="aviso-suave">Carregando indicadores da Secretaria Municipal de Educação de Patos - PB…</p>
              )
            ) : (
              <LoginSecretaria
                onEntrar={() => {
                  setAuthSecretaria(true);
                  toast('Bem-vindo à Secretaria Municipal de Educação de Patos - PB!', { emoji: 'check-circle', tom: 'ok' });
                }}
              />
            )
          ) : authUnidade && escola ? (
            <PainelUnidade
              escola={escola}
              escolas={escolas}
              onTrocarEscola={(id) => setAuthUnidade(id)}
              onAbrirLeitor={() => setLeitorQrAberto(true)}
              onSair={() => {
                setAuthUnidade(null);
                toast('Sessão da Unidade encerrada.', { emoji: 'info', tom: 'info' });
              }}
            />
          ) : (
            <LoginUnidade
              escolas={escolas}
              onEntrar={(id) => {
                setAuthUnidade(id);
                const esc = escolas.find((e) => e.id === id);
                toast(`Acesso liberado: ${esc?.nome ?? 'Unidade Escolar'}`, { emoji: 'check-circle', tom: 'ok' });
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
            await vagasStore.atualizarStatusProtocolo(codigo, 'atendido');
            toast(`Matrícula do protocolo ${codigo} confirmada! 1 vaga ocupada.`, {
              emoji: 'check-circle',
              tom: 'ok',
            });
          }}
        />
      </div>
    </div>
  );
}

function PainelMacroSecretaria({
  painel,
  onAbrirUnidade,
  onAbrirLeitor,
  onSair,
}: {
  painel: PainelSecretariaDTO;
  onAbrirUnidade: (id: string) => void;
  onAbrirLeitor?: () => void;
  onSair: () => void;
}) {
  const agora = useAgora(15_000);
  const { kpis } = painel;

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
    </div>
  );
}

function PainelUnidade({
  escola,
  escolas,
  onTrocarEscola,
  onAbrirLeitor,
  onSair,
}: {
  escola: Escola;
  escolas: Escola[];
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

  return (
    <>
      <section className="painel-cabecalho">
        <div>
          <div className="seletor-unidade-rapido">
            <label htmlFor={seletorId}>Unidade ativa em Patos - PB:</label>
            <select id={seletorId} value={escola.id} onChange={(e) => onTrocarEscola(e.target.value)}>
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
            <button
              type="button"
              className="btn btn-primario btn-pequeno btn-escanear-qr"
              onClick={onAbrirLeitor}
              title="Abrir câmera para escanear QR Code do voucher presencial"
            >
              <Icone nome="qr-code" tamanho={16} />
              <span>Escanear QR Code</span>
            </button>
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
                        await vagasStore.atualizarStatusProtocolo(p.codigo, 'atendido');
                        toast(`Matrícula do protocolo ${p.codigo} confirmada! 1 vaga ocupada.`, {
                          emoji: 'check-circle',
                          tom: 'ok',
                        });
                      }}
                    >
                      <Icone nome="check" tamanho={15} /> Confirmar matrícula
                    </button>
                    <button
                      type="button"
                      className="btn btn-fantasma btn-pequeno"
                      onClick={async () => {
                        await vagasStore.atualizarStatusProtocolo(p.codigo, 'cancelado');
                        toast(`Protocolo ${p.codigo} cancelado.`, { emoji: 'info', tom: 'aviso' });
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
          onClick={() => {
            void vagasStore.confirmarDados(escola.id);
            toast('Quadro de vagas confirmado com sucesso!', { emoji: 'check-circle', tom: 'ok' });
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
  const [erro, setErro] = useState<string | null>(null);

  const emailId = useId();
  const senhaId = useId();
  const erroId = useId();

  function enviar(e: FormEvent) {
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

    const emailValido =
      emailLimpo === 'secretaria@patos.pb.gov.br' ||
      emailLimpo === 'admin' ||
      emailLimpo === 'seduc' ||
      emailLimpo === 'gestor.seduc@patos.pb.gov.br' ||
      emailLimpo.endsWith('@patos.pb.gov.br');

    const senhaValida =
      senhaLimpa === 'patos2026' ||
      senhaLimpa === 'seduc2026' ||
      senhaLimpa === 'admin123' ||
      senhaLimpa === '1234';

    if (!emailValido || !senhaValida) {
      setErro('Credenciais não autorizadas. Verifique o e-mail e a senha de acesso da SEDUC.');
      return;
    }

    onEntrar();
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

      <button type="submit" className="btn btn-primario btn-largo">
        Entrar na Secretaria de Educação <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function LoginUnidade({ escolas, onEntrar }: { escolas: Escola[]; onEntrar: (id: string) => void }) {
  const [escolaId, setEscolaId] = useState(escolas[0]?.id ?? '');
  const [gestor, setGestor] = useState('');
  const [pin, setPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selId = useId();
  const gestorId = useId();
  const pinId = useId();
  const erroId = useId();

  function enviar(e: FormEvent) {
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
      setErro('Informe o PIN de 4 dígitos da unidade escolar.');
      return;
    }

    const pinValido =
      pinLimpo === '2026' ||
      pinLimpo === '1234' ||
      pinLimpo === 'patos2026' ||
      pinLimpo === 'escola123';

    if (!pinValido) {
      setErro('PIN de segurança incorreto para esta unidade escolar.');
      return;
    }

    onEntrar(idAlvo);
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
            maxLength={8}
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

      <button type="submit" className="btn btn-primario btn-largo">
        Entrar no painel da unidade <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function LinhaOferta({ escolaId, oferta }: { escolaId: string; oferta: Oferta }) {
  const e = ETAPAS[oferta.etapa];
  const status = statusDaOferta(oferta);
  const set = (patch: Partial<Pick<Oferta, 'vagas' | 'fila'>>) =>
    void vagasStore.atualizarOferta(escolaId, oferta.etapa, oferta.periodo, patch);
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
