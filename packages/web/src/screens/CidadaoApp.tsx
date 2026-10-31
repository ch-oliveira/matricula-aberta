import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Icone } from '../components/Icone';
import { Stepper } from '../components/Stepper';
import { toast } from '../components/Toasts';
import { buscar, pulsoDaCidade, resumo } from '../domain/busca';
import { calcularEtapa, ETAPAS } from '../domain/etapas';
import { distanciaKm } from '../domain/geo';
import type { Busca, EtapaId } from '../domain/types';
import { usePersistido, useTema } from '../hooks';
import { alertasStore, notificar } from '../services/alertas';
import { useCatalogo, useEscolas, vagasStore } from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { bell, bulb, school } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';
import { AlertSheet } from './AlertSheet';
import { CompareSheet } from './CompareSheet';
import { Landing } from './Landing';
import { StepOnde } from './StepOnde';
import { StepQuem } from './StepQuem';
import { StepVagas } from './StepVagas';
import { StepVisita } from './StepVisita';

const BUSCA_INICIAL: Busca = {
  nascimento: null,
  etapa: null,
  local: null,
  raioKm: 3,
  periodo: 'tanto-faz',
  soAcessivel: false,
};

/** Troca de tela com View Transitions quando disponível (melhoria progressiva). */
function transicionar(fn: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduz) doc.startViewTransition(() => flushSync(fn));
  else fn();
}

export function CidadaoApp() {
  const escolas = useEscolas();
  const catalogo = useCatalogo();
  const [modo, setModo] = usePersistido<'landing' | 'consulta'>('ma:modo:v1', 'landing');
  const [busca, setBuscaRaw] = usePersistido<Busca>('ma:busca:v1', BUSCA_INICIAL);
  const [passo, setPasso] = usePersistido<number>('ma:passo:v1', 0);
  const [escolhida, setEscolhida] = usePersistido<string | null>('ma:escolhida:v1', null);
  const [ajudante, setAjudante] = usePersistido('ma:ajudante:v1', false);
  const [fonteGrande, setFonteGrande] = usePersistido('ma:fonte:v1', false);
  const { tema, alternarTema } = useTema();

  const [comparar, setComparar] = useState<string[]>([]);
  const [compOpen, setCompOpen] = useState(false);
  const [alerta, setAlerta] = useState<{ open: boolean; escolaId?: string }>({ open: false });
  const [destaque, setDestaque] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [meusCodigos] = usePersistido<Record<string, string>>('ma:protocolos:por-escola:v1', {});

  const protocoloMaisRecente = useMemo(() => {
    const entries = Object.entries(meusCodigos);
    if (entries.length === 0) return null;
    const [escId, cod] = entries[entries.length - 1];
    const esc = escolas.find((e) => e.id === escId);
    return { escolaId: escId, codigo: cod, escolaNome: esc?.nome ?? 'Unidade Municipal' };
  }, [meusCodigos, escolas]);

  const setBusca = (fn: (b: Busca) => Busca) => {
    setErro(null);
    setBuscaRaw(fn);
  };

  const calc = busca.nascimento ? calcularEtapa(busca.nascimento) : null;
  const turma = calc && calc.ok ? calc.turma : null;

  const pulso = useMemo(() => pulsoDaCidade(escolas), [escolas]);
  const resAtual = useMemo(() => resumo(buscar(escolas, busca)), [escolas, busca]);

  // Tamanho da fonte (acessibilidade)
  useEffect(() => {
    document.documentElement.dataset.fonte = fonteGrande ? 'grande' : 'normal';
  }, [fonteGrande]);

  // Eventos em tempo real vindos do servidor SSE → toasts, destaque no card e alertas
  const buscaRef = useRef(busca);
  buscaRef.current = busca;
  useEffect(
    () =>
      vagasStore.onEvento((ev) => {
        const b = buscaRef.current;
        const abriu = ev.para > ev.de;
        if (b.etapa === ev.etapa && b.local) {
          const esc = vagasStore.getEscolas().find((e) => e.id === ev.escolaId);
          const perto = esc && distanciaKm(b.local, esc) <= b.raioKm;
          if (perto && abriu) {
            toast(`Abriu vaga de ${ETAPAS[ev.etapa].nome} na ${ev.escolaNome}!`, { emoji: 'sparkles', tom: 'ok' });
            setDestaque(ev.escolaId);
            setTimeout(() => setDestaque(null), 2600);
          } else if (perto) {
            toast(`${ev.escolaNome}: 1 vaga foi preenchida.`, { emoji: 'trending-down', tom: 'aviso' });
          }
        }
        if (!abriu) return;
        for (const a of alertasStore.get()) {
          if (a.etapa !== ev.etapa) continue;
          if (a.periodo !== 'tanto-faz' && a.periodo !== ev.periodo) continue;
          const esc = vagasStore.getEscolas().find((e) => e.id === ev.escolaId);
          const bate = a.escolaId ? a.escolaId === ev.escolaId : esc && distanciaKm(a.local, esc) <= a.raioKm;
          if (!bate) continue;
          const msg = `Abriu vaga de ${ETAPAS[ev.etapa].nome} na ${ev.escolaNome} (Patos - PB)!`;
          toast(`Seu alerta tocou: ${msg}`, { emoji: 'bell', tom: 'ok' });
          if (a.canal === 'push') notificar('Matrícula Aberta · Patos-PB', msg);
          break;
        }
      }),
    [],
  );

  // Foco no título ao trocar de etapa (leitores de tela + teclado)
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  }, [passo, modo]);

  const maxLiberado = !busca.etapa ? 0 : !busca.local ? 1 : !escolhida ? 2 : 3;

  useEffect(() => {
    if (passo > maxLiberado) setPasso(maxLiberado);
  }, [passo, maxLiberado, setPasso]);

  function ir(p: number) {
    transicionar(() => {
      setModo('consulta');
      setPasso(p);
    });
  }

  function abrirProtocolo(escolaId: string) {
    const esc = escolas.find((e) => e.id === escolaId);
    const bairro = catalogo.bairros.find((b) => b.rotulo === esc?.bairro) ?? catalogo.centro;
    transicionar(() => {
      setBuscaRaw((b) => ({ ...b, local: b.local ?? bairro }));
      setEscolhida(escolaId);
      setPasso(3);
      setModo('consulta');
    });
  }

  function comecarDaLanding(etapaPre?: EtapaId) {
    transicionar(() => {
      if (etapaPre) {
        setBuscaRaw((b) => ({ ...b, etapa: etapaPre, nascimento: null }));
        setPasso(1); // Atalho direto para escolha do bairro (Etapa 2)
      } else {
        setPasso(0);
      }
      setModo('consulta');
    });
  }

  function verEscolaDaLanding(escolaId: string, etapa: EtapaId) {
    const esc = escolas.find((e) => e.id === escolaId);
    const bairro = catalogo.bairros.find((b) => b.rotulo === esc?.bairro) ?? catalogo.centro;
    transicionar(() => {
      setBuscaRaw((b) => ({ ...b, etapa, local: b.local ?? bairro, raioKm: 5 }));
      setEscolhida(escolaId);
      setPasso(3);
      setModo('consulta');
    });
  }

  function avancar() {
    if (passo === 0 && !busca.etapa) {
      setErro('Coloque a data de nascimento ou toque em uma etapa abaixo.');
      return;
    }
    if (passo === 1 && !busca.local) {
      setErro('Toque em “Usar minha localização” ou escolha seu bairro em Patos - PB.');
      return;
    }
    ir(passo + 1);
  }

  function escolher(id: string) {
    setEscolhida(id);
    setCompOpen(false);
    ir(3);
  }

  function novaBusca() {
    setBuscaRaw(BUSCA_INICIAL);
    setEscolhida(null);
    setComparar([]);
    ir(0);
  }

  return (
    <div className="app-shell">
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className="topo">
        <div className="topo-interno">
          <a
            className="marca"
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              transicionar(() => setModo('landing'));
            }}
          >
            <div className="marca-sticker" aria-hidden="true">
              <Sticker icon={school} palette={PALETTES.riso} loop={false} replayOnHover style={{ width: 42 }} />
            </div>
            <span className="marca-nome">
              Matrícula<b>Aberta</b>
              <small>Rede Municipal · Patos - PB</small>
            </span>
          </a>

          <nav className="topo-nav" aria-label="Navegação principal">
            <button
              type="button"
              className={`nav-link ${modo === 'landing' ? 'ativo' : ''}`}
              onClick={() => transicionar(() => setModo('landing'))}
            >
              Visão geral
            </button>
            <button
              type="button"
              className={`nav-link ${modo === 'consulta' ? 'ativo' : ''}`}
              onClick={() => transicionar(() => setModo('consulta'))}
            >
              Consultar vagas
            </button>
          </nav>

          <div className="topo-acoes">
            <div className="topo-grupo-acess" role="group" aria-label="Preferências e acessibilidade">
              {protocoloMaisRecente && (
                <button
                  type="button"
                  className="btn-barra btn-barra-protocolo"
                  onClick={() => abrirProtocolo(protocoloMaisRecente.escolaId)}
                  title={`Abrir protocolo ativo ${protocoloMaisRecente.codigo}`}
                >
                  <Icone nome="ticket" tamanho={16} /> <span className="rotulo-topo">Meu Protocolo</span>
                </button>
              )}

              <button
                type="button"
                className={`btn-barra ${ajudante ? 'ativo' : ''}`}
                aria-pressed={ajudante}
                onClick={() => {
                  setAjudante((v) => {
                    const novo = !v;
                    toast(novo ? 'Modo Ajudante ativado: dicas visíveis em cada etapa.' : 'Modo Ajudante desativado.', {
                      emoji: 'user-heart',
                      tom: novo ? 'ok' : 'info',
                    });
                    return novo;
                  });
                }}
                title="Mostra dicas para o filho ou neto que está ajudando os pais"
              >
                <Icone nome="user-heart" tamanho={16} /> <span className="rotulo-topo">Ajudante</span>
              </button>

              <button
                type="button"
                className={`btn-barra ${fonteGrande ? 'ativo' : ''}`}
                aria-pressed={fonteGrande}
                onClick={() => setFonteGrande((v) => !v)}
                aria-label="Aumentar tamanho das letras"
                title="Aumentar tamanho das letras"
              >
                A+
              </button>

              <button
                type="button"
                className="btn-barra"
                onClick={alternarTema}
                aria-label={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                title={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                <Icone nome={tema === 'dark' ? 'sun' : 'moon'} tamanho={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="conteudo" className="conteudo-container">
        {modo === 'landing' ? (
          <Landing
            onComecar={comecarDaLanding}
            onVerEscola={verEscolaDaLanding}
            protocoloAtivo={protocoloMaisRecente}
            onAbrirProtocolo={abrirProtocolo}
          />
        ) : (
          <div className="consulta-grid">
            <div className="consulta-principal">
              {protocoloMaisRecente && passo !== 3 && (
                <aside className="banner-atalho-protocolo" role="status" aria-label="Acesso rápido ao protocolo">
                  <div className="banner-atalho-conteudo">
                    <span className="banner-atalho-tag">
                      <Icone nome="ticket" tamanho={15} /> Protocolo emitido
                    </span>
                    <p>
                      Você já tem a senha <strong>{protocoloMaisRecente.codigo}</strong> para{' '}
                      <strong>{protocoloMaisRecente.escolaNome}</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primario btn-pequeno"
                    onClick={() => abrirProtocolo(protocoloMaisRecente.escolaId)}
                  >
                    Ver meu QR Code <span aria-hidden="true">→</span>
                  </button>
                </aside>
              )}

              <Stepper atual={passo} maxLiberado={maxLiberado} onIr={ir} />

              <div className="palco-etapa">
                {passo === 0 && <StepQuem busca={busca} setBusca={setBusca} ajudante={ajudante} erro={erro} />}
                {passo === 1 && <StepOnde busca={busca} setBusca={setBusca} ajudante={ajudante} erro={erro} />}
                {passo === 2 && (
                  <StepVagas
                    busca={busca}
                    setBusca={setBusca}
                    ajudante={ajudante}
                    comparar={comparar}
                    setComparar={setComparar}
                    destaqueId={destaque}
                    onEscolher={escolher}
                    onAlerta={(escolaId) => setAlerta({ open: true, escolaId })}
                    onAbrirComparador={() => setCompOpen(true)}
                  />
                )}
                {passo === 3 && escolhida && (
                  <StepVisita
                    busca={busca}
                    escolaId={escolhida}
                    ajudante={ajudante}
                    turma={turma}
                    onAlerta={(escolaId) => setAlerta({ open: true, escolaId })}
                  />
                )}

                {passo !== 2 && (
                  <div className="barra-acao">
                    {passo === 0 ? (
                      <button
                        type="button"
                        className="btn btn-fantasma"
                        onClick={() => transicionar(() => setModo('landing'))}
                      >
                        <span aria-hidden="true">←</span> Visão geral
                      </button>
                    ) : (
                      <button type="button" className="btn btn-fantasma" onClick={() => ir(passo - 1)}>
                        <span aria-hidden="true">←</span> Voltar
                      </button>
                    )}

                    {passo < 2 && (
                      <button type="button" className="btn btn-primario btn-crescer" onClick={avancar}>
                        {passo === 0 ? 'Continuar para seu bairro em Patos' : 'Ver vagas disponíveis'}{' '}
                        <span aria-hidden="true">→</span>
                      </button>
                    )}

                    {passo === 3 && (
                      <button type="button" className="btn btn-secundario btn-crescer" onClick={novaBusca}>
                        Nova consulta
                      </button>
                    )}
                  </div>
                )}

                {passo === 2 && comparar.length === 0 && (
                  <div className="barra-acao">
                    <button type="button" className="btn btn-fantasma" onClick={() => ir(1)}>
                      <span aria-hidden="true">←</span> Alterar bairro
                    </button>
                    <button
                      type="button"
                      className="btn btn-secundario btn-crescer"
                      onClick={() => setAlerta({ open: true })}
                    >
                      Criar alerta de vaga
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna lateral no desktop: resumo vivo + apoio familiar */}
            <aside className="consulta-lateral" aria-label="Resumo da sua consulta em Patos - PB">
              <div className="painel-resumo">
                <div className="painel-resumo-topo">
                  <Sticker icon={school} palette={PALETTES.riso} replayOnHover style={{ width: 54 }} />
                  <div>
                    <h2>Resumo · Patos - PB</h2>
                    <p>Sua consulta na rede municipal</p>
                  </div>
                </div>

                <dl className="resumo-lista">
                  <div className={busca.etapa ? 'preenchido' : ''}>
                    <dt>01 · Etapa de ensino</dt>
                    <dd>
                      {busca.etapa ? (
                        <>
                          <strong>{turma ?? ETAPAS[busca.etapa].nome}</strong>
                          <small>{ETAPAS[busca.etapa].faixa}</small>
                        </>
                      ) : (
                        <span>Selecione na etapa 1</span>
                      )}
                    </dd>
                  </div>

                  <div className={busca.local ? 'preenchido' : ''}>
                    <dt>02 · Bairro em Patos - PB</dt>
                    <dd>
                      {busca.local ? (
                        <>
                          <strong>{busca.local.rotulo}</strong>
                          <small>
                            Raio de {busca.raioKm} km ·{' '}
                            {busca.periodo === 'tanto-faz'
                              ? 'Qualquer período'
                              : busca.periodo === 'integral'
                                ? 'Integral'
                                : 'Meio período'}
                          </small>
                        </>
                      ) : (
                        <span>Defina na etapa 2</span>
                      )}
                    </dd>
                  </div>

                  <div className={busca.etapa ? 'preenchido' : ''}>
                    <dt>03 · Disponibilidade</dt>
                    <dd>
                      {busca.etapa && busca.local ? (
                        <>
                          <strong>{resAtual.vagas} vagas livres</strong> em {resAtual.total}{' '}
                          {resAtual.total === 1 ? 'unidade' : 'unidades'}
                        </>
                      ) : busca.etapa ? (
                        <>
                          <strong>{pulso[busca.etapa].vagas} vagas</strong> de {ETAPAS[busca.etapa].nome} em Patos - PB
                        </>
                      ) : (
                        <span>Aguardando etapa</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {busca.etapa && busca.local && (
                  <button
                    type="button"
                    className="btn btn-secundario btn-largo"
                    onClick={() => setAlerta({ open: true })}
                  >
                    <Sticker icon={bell} palette={PALETTES.sunset} style={{ width: 26 }} />
                    <span>Receber alerta no WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="painel-familia">
                <div className="painel-familia-topo">
                  <Sticker icon={bulb} palette={PALETTES.matcha} replayOnHover style={{ width: 48 }} />
                  <div>
                    <h3>Modo Ajudante</h3>
                    <p>Auxiliando pais ou avós?</p>
                  </div>
                </div>
                <p className="painel-familia-texto">
                  Exibe dicas rápidas do que perguntar em cada etapa e onde emitir cada documento em Patos - PB.
                </p>
                <button
                  type="button"
                  className={`btn btn-pequeno btn-largo ${ajudante ? 'btn-primario' : 'btn-secundario'}`}
                  aria-pressed={ajudante}
                  onClick={() => setAjudante((v) => !v)}
                >
                  {ajudante ? (
                    <>
                      Modo Ajudante ativo <Icone nome="check" tamanho={15} />
                    </>
                  ) : (
                    'Ativar Modo Ajudante'
                  )}
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="rodape" aria-label="Informações institucionais e navegação">
        <div className="rodape-interno">
          <div className="rodape-grade">
            {/* Coluna 1: Identidade + Atendimento SEDUC */}
            <div className="rodape-col rodape-col-identidade">
              <a
                className="marca rodape-marca"
                href="#inicio"
                onClick={(e) => {
                  e.preventDefault();
                  transicionar(() => setModo('landing'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="marca-sticker" aria-hidden="true">
                  <Sticker icon={school} palette={PALETTES.riso} loop={false} replayOnHover style={{ width: 36 }} />
                </div>
                <span className="marca-nome">
                  Matrícula<b>Aberta</b>
                  <small>Rede Municipal · Patos - PB</small>
                </span>
              </a>

              <address className="rodape-endereco-compacto">
                <strong>{catalogo.orgao}</strong>
                <span>
                  <Icone nome="pin" tamanho={14} /> {catalogo.enderecoSecretaria}
                </span>
                <span>
                  <Icone nome="phone" tamanho={14} />{' '}
                  <a href={`tel:+55${catalogo.telefoneSecretaria.replace(/\D/g, '')}`}>
                    {catalogo.telefoneSecretaria}
                  </a>{' '}
                  · Seg a sex, 7h30 às 13h30
                </span>
              </address>
            </div>

            {/* Coluna 2: Navegação rápida para a Família */}
            <nav className="rodape-col rodape-col-nav" aria-label="Atalhos para pais e responsáveis">
              <h2 className="rodape-titulo">Para a Família</h2>
              <ul className="rodape-lista-links">
                <li>
                  <button
                    type="button"
                    className="rodape-item-link"
                    onClick={() => {
                      transicionar(() => setModo('landing'));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <Icone nome="home" tamanho={14} /> Visão geral
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="rodape-item-link"
                    onClick={() => transicionar(() => setModo('consulta'))}
                  >
                    <Icone nome="map" tamanho={14} /> Consultar vagas
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="rodape-item-link"
                    onClick={() => setAlerta({ open: true })}
                  >
                    <Icone nome="bell" tamanho={14} /> Alerta no WhatsApp
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="rodape-item-link"
                    onClick={() => {
                      transicionar(() => setModo('landing'));
                      setTimeout(() => {
                        document.getElementById('duvidas')?.scrollIntoView({ behavior: 'smooth' });
                      }, 60);
                    }}
                  >
                    <Icone nome="info" tamanho={14} /> Dúvidas rápidas
                  </button>
                </li>
              </ul>
            </nav>

            {/* Coluna 3 (Exclusivo Versão Web / Desktop): Fluxo de Secretaria e Escola */}
            <div className="rodape-col rodape-col-gestao so-desktop">
              <div className="rodape-gestao-card">
                <div className="rodape-gestao-cabecalho">
                  <span className="rodape-gestao-tag">
                    <Icone nome="school" tamanho={12} /> Exclusivo Web
                  </span>
                  <h2 className="rodape-gestao-titulo">Secretaria / Escola</h2>
                </div>
                <p className="rodape-gestao-texto">
                  Gestão de vagas da SEDUC e recepção de protocolos QR Code nas unidades.
                </p>
                <div className="rodape-gestao-acoes">
                  <a className="btn btn-primario btn-pequeno" href="#/gestao">
                    <Icone nome="landmark" tamanho={14} />
                    <span>Secretaria</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a className="btn btn-secundario btn-pequeno" href="#/gestao/unidade">
                    <Icone nome="qr-code" tamanho={14} />
                    <span>Unidade Escolar</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rodape-base">
            <p className="rodape-copyright">
              © {new Date().getFullYear()} <strong>Prefeitura Municipal de Patos - PB</strong> · Consulta pública 100%
              gratuita e anônima (LGPD).
            </p>

            <button
              type="button"
              className="rodape-pill-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="Voltar ao topo da página"
            >
              Voltar ao topo ↑
            </button>
          </div>
        </div>
      </footer>

      <CompareSheet open={compOpen} onClose={() => setCompOpen(false)} busca={busca} ids={comparar} onEscolher={escolher} />
      <AlertSheet
        open={alerta.open}
        onClose={() => setAlerta({ open: false })}
        busca={busca}
        escolaId={alerta.escolaId}
      />
    </div>
  );
}
