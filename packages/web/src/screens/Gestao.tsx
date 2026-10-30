import { useEffect, useId, useState, type FormEvent } from 'react';
import { Icone, IconeEtapa } from '../components/Icone';
import { toast } from '../components/Toasts';
import { Ocupacao, StatusPill } from '../components/ui';
import { ETAPAS, statusDaOferta } from '../domain/etapas';
import { desatualizado, tempoRelativo } from '../domain/geo';
import type { Escola, Oferta, PainelSecretariaDTO, ProtocoloVisita } from '../domain/types';
import { useAgora, usePersistido } from '../hooks';
import {
  useEscolas,
  useHistorico,
  usePainelSecretaria,
  useProtocolos,
  vagasStore,
} from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { school } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';

export function Gestao() {
  const escolas = useEscolas();
  const painelSecretaria = usePainelSecretaria();
  const [aba, setAba] = usePersistido<'unidade' | 'secretaria'>('ma:gestao:aba:v2', 'secretaria');
  const [sessao, setSessao] = usePersistido<string | null>('ma:gestao:sessao:v2', 'creche-manoel-quinidio');
  const escola = escolas.find((e) => e.id === sessao) ?? escolas[0];

  useEffect(() => {
    if (!sessao && escolas[0]) {
      setSessao(escolas[0].id);
    }
  }, [escolas, sessao, setSessao]);

  return (
    <div className="gestao">
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
              onClick={() => setAba('secretaria')}
            >
              <Icone nome="building" tamanho={16} /> Secretaria de Educação
            </button>
            <button
              type="button"
              className={`nav-link ${aba === 'unidade' ? 'ativo' : ''}`}
              onClick={() => setAba('unidade')}
            >
              <Icone nome="school" tamanho={16} /> Painel da Unidade
            </button>
          </nav>

          <div className="gestao-topo-acoes">
            <a className="btn btn-secundario btn-pequeno" href="#">
              ← Voltar ao portal dos pais
            </a>
          </div>
        </div>
      </header>

      <main className="gestao-conteudo">
        {aba === 'secretaria' ? (
          painelSecretaria ? (
            <PainelMacroSecretaria
              painel={painelSecretaria}
              onAbrirUnidade={(id) => {
                setSessao(id);
                setAba('unidade');
              }}
            />
          ) : (
            <p className="aviso-suave">Carregando indicadores da Secretaria Municipal de Educação de Patos - PB…</p>
          )
        ) : escola ? (
          <PainelUnidade
            escola={escola}
            escolas={escolas}
            onTrocarEscola={(id) => setSessao(id)}
            onSair={() => setSessao(null)}
          />
        ) : (
          <Login escolas={escolas} onEntrar={setSessao} />
        )}
      </main>
    </div>
  );
}

function PainelMacroSecretaria({
  painel,
  onAbrirUnidade,
}: {
  painel: PainelSecretariaDTO;
  onAbrirUnidade: (id: string) => void;
}) {
  const agora = useAgora(15_000);
  const { kpis } = painel;

  return (
    <div className="secretaria-grid">
      <section className="painel-cabecalho secretaria-hero">
        <div>
          <span className="lp-tag">Visão Executiva em Tempo Real · IBGE {painel.codigoIbge}</span>
          <h1>{painel.orgao}</h1>
          <p>
            Monitoramento integrado de vagas livres, demanda reprimida por bairro de <strong>Patos - PB</strong>,
            alertas ativos no WhatsApp e protocolos presenciais.
          </p>
        </div>
        <div className="secretaria-acoes-topo">
          <button
            type="button"
            className="btn btn-secundario btn-pequeno"
            onClick={() => {
              void vagasStore.resetar();
              toast('Dados oficiais de demonstração de Patos - PB restaurados.', { emoji: 'refresh', tom: 'info' });
            }}
          >
            <Icone nome="refresh" tamanho={15} /> Restaurar cenários de Patos-PB
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
      <section className="sec-bloco" aria-labelledby="t-demanda-bairros">
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

        <div className="tabela-responsiva">
          <table className="tabela-secretaria">
            <thead>
              <tr>
                <th>Bairro (Patos - PB)</th>
                <th>Unidades</th>
                <th>Vagas livres</th>
                <th>
                  Fila + Alertas <Icone nome="bell" tamanho={14} />
                </th>
                <th>Déficit líquido</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {painel.demandaPorBairro.map((b) => (
                <tr key={b.bairro}>
                  <td>
                    <strong>{b.bairro}</strong>
                    <small className="celula-sub">{b.zona}</small>
                  </td>
                  <td>{b.unidades}</td>
                  <td>
                    <strong>{b.vagasLivres}</strong> <small className="celula-sub">/ {b.capacidadeTotal}</small>
                  </td>
                  <td>
                    <strong>{b.demandaReprimida}</strong>{' '}
                    <small className="celula-sub">
                      ({b.filaEspera} fila · {b.alertasAtivos} alertas)
                    </small>
                  </td>
                  <td>
                    {b.deficitVagas > 0 ? (
                      <strong className="texto-perigo">−{b.deficitVagas} vagas</strong>
                    ) : (
                      <span className="texto-ok">Suprido</span>
                    )}
                  </td>
                  <td>
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
  onSair,
}: {
  escola: Escola;
  escolas: Escola[];
  onTrocarEscola: (id: string) => void;
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
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={onSair}>
            Trocar PIN
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
            alertas ativos no banco <Icone nome="bell" tamanho={14} />
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
              Protocolos gerados pelos pais na Etapa 4. Ao confirmar a matrícula, o sistema ocupa automaticamente 1 vaga
              na turma correspondente e registra na auditoria.
            </p>
          </div>
        </div>

        {protocolos.length === 0 ? (
          <p className="legenda">
            Nenhum protocolo emitido para esta unidade ainda. Gere um protocolo na Etapa 4 da consulta pública para ver
            aparecer aqui instantaneamente!
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
          Ao ajustar as vagas nos botões <strong>+</strong> e <strong>−</strong> abaixo, o banco SQLite de Patos - PB é
          atualizado e todas as telas abertas (pais e Secretaria) recebem a mudança via <strong>SSE na hora</strong>.
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
            toast('Quadros de vagas confirmados no servidor de Patos - PB!', { emoji: 'check-circle', tom: 'ok' });
          }}
        >
          <Icone nome="thumbs-up" tamanho={16} /> Confirmar quadro de vagas hoje
        </button>
        <button
          type="button"
          className="link-sutil"
          onClick={() => {
            void vagasStore.resetar();
            toast('Dados iniciais de Patos - PB restaurados.', { emoji: 'refresh' });
          }}
        >
          Restaurar dados iniciais de Patos - PB
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

function Login({ escolas, onEntrar }: { escolas: Escola[]; onEntrar: (id: string) => void }) {
  const [id, setId] = useState(escolas[0]?.id ?? '');
  const [pin, setPin] = useState('1234');
  const [erro, setErro] = useState<string | null>(null);
  const selId = useId();
  const pinId = useId();
  const erroId = useId();

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setErro('O PIN tem 4 números (Demonstração: qualquer PIN de 4 dígitos, ex. 1234).');
      return;
    }
    onEntrar(id || escolas[0]?.id);
  }

  return (
    <form className="login-card" onSubmit={enviar} noValidate>
      <p className="login-emoji" aria-hidden="true">
        <Icone nome="school" tamanho={40} />
      </p>
      <h1>Acesso da Unidade · Patos - PB</h1>
      <p className="legenda">Selecione a creche ou escola municipal de Patos - PB para gerenciar suas vagas e protocolos.</p>
      <div className="campo">
        <label htmlFor={selId}>Unidade escolar de Patos - PB</label>
        <select id={selId} name="unidade" value={id} onChange={(e) => setId(e.target.value)}>
          {escolas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome} — {e.bairro}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor={pinId}>PIN do servidor (4 dígitos)</label>
        <input
          id={pinId}
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setErro(null);
          }}
          aria-describedby={erro ? erroId : undefined}
          placeholder="••••"
        />
        {erro && (
          <p id={erroId} className="erro-campo" role="alert">
            <Icone nome="alert-triangle" tamanho={16} /> {erro}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primario btn-largo">
        Entrar no painel da unidade
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
