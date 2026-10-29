import { useMemo } from 'react';
import { Ocupacao, StatusPill } from '../components/ui';
import { pulsoDaCidade } from '../domain/busca';
import { ETAPAS, ORDEM_ETAPAS, STATUS_INFO, statusDaOferta } from '../domain/etapas';
import { tempoRelativo } from '../domain/geo';
import type { EtapaId } from '../domain/types';
import { useAgora, useFala } from '../hooks';
import { useCatalogo, useEscolas, useStatusApi } from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { bell, bulb, calendar, folder, padlock, pin, school, search, toggle, trophy } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';

interface Props {
  onComecar: (etapa?: EtapaId) => void;
  onVerEscola: (escolaId: string, etapa: EtapaId) => void;
}

export function Landing({ onComecar, onVerEscola }: Props) {
  const escolas = useEscolas();
  const catalogo = useCatalogo();
  const apiOnline = useStatusApi();
  const agora = useAgora();
  const { suportado, falando, falar, parar } = useFala();

  const pulso = useMemo(() => pulsoDaCidade(escolas), [escolas]);
  const totalVagas = Object.values(pulso).reduce((s, p) => s + p.vagas, 0);
  const totalEscolasComVaga = useMemo(
    () => escolas.filter((e) => e.ofertas.some((o) => o.vagas > 0)).length,
    [escolas],
  );

  // 3 unidades reais de Patos - PB demonstrando os 3 estados do semáforo em tempo real
  const vitrine = useMemo(() => {
    const aberta = escolas.find((e) => e.ofertas.some((o) => o.vagas > 3)) ?? escolas[0];
    const ultimas =
      escolas.find((e) => e.id !== aberta?.id && e.ofertas.some((o) => o.vagas > 0 && o.vagas <= 3)) ?? escolas[1];
    const espera =
      escolas.find(
        (e) => e.id !== aberta?.id && e.id !== ultimas?.id && e.ofertas.some((o) => o.vagas === 0),
      ) ?? escolas[2];

    return [aberta, ultimas, espera].filter(Boolean).map((escola) => {
      const oferta =
        escola === aberta
          ? escola.ofertas.find((o) => o.vagas > 3) ?? escola.ofertas[0]
          : escola === ultimas
            ? escola.ofertas.find((o) => o.vagas > 0 && o.vagas <= 3) ?? escola.ofertas[0]
            : escola.ofertas.find((o) => o.vagas === 0) ?? escola.ofertas[0];
      return { escola, oferta, status: statusDaOferta(oferta) };
    });
  }, [escolas]);

  const textoAudio =
    `Bem-vindo ao Matrícula Aberta de Patos, Paraíba! Consulte em segundos quais creches e escolas municipais perto do seu bairro têm vaga aberta agora, sem cadastro e sem CPF. ` +
    `Hoje temos ${totalVagas} vagas abertas em ${totalEscolasComVaga} unidades da Rede Municipal de Ensino de Patos. ` +
    `Toque em Consultar vagas agora ou escolha uma etapa de ensino abaixo para começar.`;

  return (
    <div className="landing">
      {/* ================= BLOCO 1: HERO + FAIXA DE ETAPAS INTEGRADA ================= */}
      <section className="lp-hero-wrapper" aria-labelledby="lp-titulo">
        <div className="lp-hero">
          <div className="lp-hero-texto">
            <div className="lp-selo-vivo" aria-live="polite">
              <span className="ponto-vivo" aria-hidden="true" />
              <span>
                Patos - PB ao vivo · <strong>{totalVagas} vagas abertas</strong> em {totalEscolasComVaga} unidades
                municipais
              </span>
            </div>

            <h1 id="lp-titulo">
              Vaga nas creches e escolas de <span className="lp-grifo">Patos - PB</span> sem fila na porta.
            </h1>

            <p className="lp-subtitulo">
              Descubra em 30 segundos onde há vagas no seu bairro (Jatobá, Belo Horizonte, Maternidade, Centro e toda a
              rede), compare unidades, receba alertas no WhatsApp e emita seu <strong>Protocolo com QR Code</strong>.{' '}
              <strong>Feito para pais e filhos usarem juntos.</strong>
            </p>

            <div className="lp-cta-linha">
              <button type="button" className="btn btn-primario btn-hero" onClick={() => onComecar()}>
                <span>Consultar vagas em Patos</span>
                <span aria-hidden="true">→</span>
              </button>
              {suportado && (
                <button
                  type="button"
                  className={`btn btn-secundario ${falando ? 'falando' : ''}`}
                  onClick={() => (falando ? parar() : falar(textoAudio))}
                  aria-pressed={falando}
                >
                  <span aria-hidden="true">{falando ? '⏹' : '🔊'}</span>
                  <span>{falando ? 'Parar áudio' : 'Ouvir explicação'}</span>
                </button>
              )}
            </div>

            <ul className="lp-garantias" aria-label="Garantias da plataforma">
              <li>
                <span className="lp-check" aria-hidden="true">✓</span> 100% anônimo na busca
              </li>
              <li>
                <span className="lp-check" aria-hidden="true">✓</span> Protocolo QR Code oficial
              </li>
              <li>
                <span className="lp-check" aria-hidden="true">✓</span> Alertas no WhatsApp (DDD 83)
              </li>
            </ul>
          </div>

          {/* Mostruário ao vivo enxuto e integrado */}
          <div className="lp-vitrine" aria-label="Unidades de Patos - PB em tempo real">
            <div className="lp-vitrine-moldura">
              <header className="lp-vitrine-topo">
                <div className="lp-vitrine-cabecalho-esq">
                  <div className="lp-vitrine-sticker" aria-hidden="true">
                    <Sticker icon={school} palette={PALETTES.riso} enter={0.1} replayOnHover style={{ width: 58 }} />
                  </div>
                  <div>
                    <strong className="lp-vitrine-titulo">Rede Municipal de Patos - PB</strong>
                    <span className="lp-vitrine-sub">
                      {apiOnline ? 'Sincronizado via SQLite + SSE · Toque para abrir' : 'Conectando à API de Patos…'}
                    </span>
                  </div>
                </div>
                <span className="lp-badge-sse">
                  <span className="ponto-vivo" aria-hidden="true" /> AO VIVO
                </span>
              </header>

              <div className="lp-vitrine-lista">
                {vitrine.map(({ escola, oferta, status }) => {
                  const etapa = ETAPAS[oferta.etapa];
                  return (
                    <button
                      key={escola.id}
                      type="button"
                      className={`lp-mini-card lp-mini-${status}`}
                      onClick={() => onVerEscola(escola.id, oferta.etapa)}
                    >
                      <div className="lp-mini-linha1">
                        <strong>{escola.nome}</strong>
                        <StatusPill status={status} />
                      </div>
                      <div className="lp-mini-linha2">
                        <span>
                          {etapa.nome} ({oferta.periodo === 'integral' ? 'Integral' : 'Parcial'}) · {escola.bairro}
                        </span>
                        <span className="lp-mini-num">{STATUS_INFO[status].frase(oferta.vagas, oferta.fila)}</span>
                      </div>
                      <Ocupacao vagas={oferta.vagas} capacidade={oferta.capacidade} status={status} />
                      <div className="lp-mini-rodape">
                        <span>Atualizado {tempoRelativo(escola.atualizadoEm, agora)}</span>
                        <span className="lp-mini-acao">Emitir protocolo →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Faixa única de disponibilidade por etapa na Rede Municipal de Patos */}
        <div className="lp-faixa-etapas" aria-label="Disponibilidade por faixa etária em Patos - PB">
          <div className="lp-faixa-topo">
            <div>
              <h2>Vagas abertas agora na rede de Patos - PB</h2>
              <p>Selecione a etapa de ensino da criança para filtrar imediatamente as creches e EMEFs com vaga:</p>
            </div>
            <span className="lp-faixa-dica">Não sabe a etapa? Digite só a data de nascimento no passo 1.</span>
          </div>

          <div className="lp-etapas-grid">
            {ORDEM_ETAPAS.map((id) => {
              const e = ETAPAS[id];
              const p = pulso[id];
              const status = statusDaOferta({ vagas: p.vagas });
              return (
                <button
                  key={id}
                  type="button"
                  className="lp-etapa-card"
                  style={{ ['--cor-etapa' as string]: e.cor }}
                  onClick={() => onComecar(id)}
                >
                  <div className="lp-etapa-card-topo">
                    <div>
                      <strong>{e.nome}</strong>
                      <small>{e.faixa}</small>
                    </div>
                    <span className="lp-etapa-icone" aria-hidden="true">{e.emoji}</span>
                  </div>

                  <div className="lp-etapa-card-meio">
                    <span className="lp-etapa-num">{p.vagas}</span>
                    <span className="lp-etapa-rotulo">vagas livres</span>
                  </div>

                  <Ocupacao vagas={p.vagas} capacidade={p.capacidade} status={status} />

                  <div className="lp-etapa-card-rodape">
                    <span>{p.escolasComVaga} unidades em Patos</span>
                    <span className="lp-etapa-cta">Consultar →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= BLOCO 2: COMO FUNCIONA (4 ETAPAS ENXUTAS) ================= */}
      <section id="como-funciona" className="lp-secao" aria-labelledby="t-passos">
        <div className="lp-secao-cabecalho">
          <span className="lp-tag">Jornada guiada em 4 passos</span>
          <h2 id="t-passos">Da consulta ao protocolo presencial com QR Code</h2>
        </div>

        <ol className="lp-passos-grade">
          <li className="lp-passo-card" onClick={() => onComecar()}>
            <div className="lp-passo-topo">
              <span className="lp-passo-num">01</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={calendar} palette={PALETTES.riso} offset={0} replayOnHover style={{ width: 82 }} />
              </div>
            </div>
            <h3>Idade da criança</h3>
            <p>
              Informe a data de nascimento. O sistema calcula a turma certa pelo corte nacional (31/03), sem pedir CPF.
            </p>
          </li>

          <li className="lp-passo-card" onClick={() => onComecar()}>
            <div className="lp-passo-topo">
              <span className="lp-passo-num">02</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={pin} palette={PALETTES.sunset} offset={35} replayOnHover style={{ width: 82 }} />
              </div>
            </div>
            <h3>Seu bairro em Patos - PB</h3>
            <p>
              Ative o GPS ou escolha entre os {catalogo.bairros.length} bairros catalogados de Patos. Filtre por turno
              integral e Sala AEE.
            </p>
          </li>

          <li className="lp-passo-card" onClick={() => onComecar()}>
            <div className="lp-passo-topo">
              <span className="lp-passo-num">03</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={search} palette={PALETTES.aqua} offset={70} replayOnHover style={{ width: 82 }} />
              </div>
            </div>
            <h3>Semáforo e comparação</h3>
            <p>
              Veja onde há vagas imediatas nas creches e EMEFs de Patos, compare até 3 unidades ou ative um alerta no
              WhatsApp.
            </p>
          </li>

          <li className="lp-passo-card" onClick={() => onComecar()}>
            <div className="lp-passo-topo">
              <span className="lp-passo-num">04</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={folder} palette={PALETTES.candy} offset={105} replayOnHover style={{ width: 82 }} />
              </div>
            </div>
            <h3>Checklist + Protocolo QR</h3>
            <p>
              Marque os documentos (Energisa/Cagepa, SUS, vacina) e emita seu protocolo <strong>PATOS-2027-XXXX</strong>{' '}
              com QR Code para atendimento rápido.
            </p>
          </li>
        </ol>
      </section>

      {/* ================= BLOCO 3: DIFERENCIAIS ENXUTOS (4 CARTÕES BENTO) ================= */}
      <section className="lp-secao" aria-labelledby="t-recursos">
        <div className="lp-secao-cabecalho">
          <span className="lp-tag">Inovação pública municipal</span>
          <h2 id="t-recursos">Tecnologia pensada para as famílias e para a Secretaria de Educação de Patos</h2>
        </div>

        <div className="lp-bento-4">
          <article className="lp-bento-card lp-bento-destaque">
            <div className="lp-bento-sticker" aria-hidden="true">
              <Sticker icon={bulb} palette={PALETTES.riso} replayOnHover style={{ width: 84 }} />
            </div>
            <div>
              <span className="lp-mini-tag">Inclusão digital familiar</span>
              <h3>Modo Ajudante + Leitura em Voz Alta</h3>
              <p>
                Muitas vezes os filhos ajudam os pais pelo celular. O <strong>Modo Ajudante</strong> traz dicas práticas
                em cada passo, acompanhado de <strong>áudio em voz alta</strong> e fonte ampliada (<strong>A+</strong>).
              </p>
            </div>
          </article>

          <article className="lp-bento-card">
            <div className="lp-bento-sticker" aria-hidden="true">
              <Sticker icon={bell} palette={PALETTES.sunset} offset={25} replayOnHover style={{ width: 76 }} />
            </div>
            <div>
              <span className="lp-mini-tag">Protocolo Presencial Digital</span>
              <h3>Pré-Agendamento com QR Code</h3>
              <p>
                Emita a senha oficial <strong>PATOS-2027-XXXX</strong> na Etapa 4. Quando a secretaria da escola
                confirma sua presença, a vaga é abatida automaticamente no banco de dados.
              </p>
            </div>
          </article>

          <article className="lp-bento-card">
            <div className="lp-bento-sticker" aria-hidden="true">
              <Sticker icon={trophy} palette={PALETTES.candy} offset={50} replayOnHover style={{ width: 76 }} />
            </div>
            <div>
              <span className="lp-mini-tag">Decisão rápida</span>
              <h3>Comparador de Creches e EMEFs</h3>
              <p>
                Compare até 3 unidades próximas em Patos - PB lado a lado: distância a pé, vagas livres, período
                integral, Sala AEE e horário de atendimento.
              </p>
            </div>
          </article>

          <article className="lp-bento-card">
            <div className="lp-bento-sticker" aria-hidden="true">
              <Sticker icon={toggle} palette={PALETTES.matcha} offset={75} replayOnHover style={{ width: 76 }} />
            </div>
            <div>
              <span className="lp-mini-tag">Gestão & Inteligência Pública</span>
              <h3>Painel da Unidade + Visão Macro da Secretaria</h3>
              <p>
                Enquanto as escolas atualizam vagas em 10 segundos, a <strong>Secretaria Municipal de Educação</strong>{' '}
                acompanha o mapa de demanda reprimida por bairro de Patos - PB em tempo real.
              </p>
              <a className="lp-link-direto" href="#/gestao">
                Abrir Painel da Secretaria e Unidades →
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* ================= BLOCO 4: FAQ + CHAMADA FINAL LADO A LADO ================= */}
      <section id="duvidas" className="lp-rodape-duplo" aria-labelledby="t-faq">
        <div className="lp-cta-lateral">
          <div className="lp-cta-lateral-topo">
            <Sticker icon={padlock} palette={PALETTES.clay} replayOnHover style={{ width: 76 }} />
            <span className="lp-tag">Patos - PB · 100% Gratuito</span>
          </div>
          <h2>Pronto para consultar as vagas do seu bairro em Patos?</h2>
          <p>
            A consulta não exige cadastro, não pede CPF e já gera seu protocolo de atendimento presencial com QR Code.
          </p>
          <div className="lp-cta-final-botoes">
            <button type="button" className="btn btn-primario btn-largo" onClick={() => onComecar()}>
              <span>Começar consulta agora</span>
              <span aria-hidden="true">→</span>
            </button>
            <a className="btn btn-secundario btn-largo" href="#/gestao">
              Painel da Secretaria / Escola
            </a>
          </div>
        </div>

        <div className="lp-faq-coluna">
          <h2 id="t-faq">Perguntas frequentes (Patos - PB)</h2>
          <div className="lp-faq">
            <details className="lp-faq-item" name="faq-matricula" open>
              <summary>Preciso informar CPF ou nome da criança para consultar as vagas?</summary>
              <p>
                <strong>Não.</strong> A busca é totalmente anônima. Você só informa o nome do responsável na última
                etapa se quiser emitir o <strong>Protocolo de Pré-Agendamento com QR Code</strong>.
              </p>
            </details>

            <details className="lp-faq-item" name="faq-matricula">
              <summary>Como funciona o Protocolo de Atendimento Presencial (PATOS-2027-XXXX)?</summary>
              <p>
                Ao escolher a creche ou escola em Patos - PB, você gera gratuitamente seu protocolo digital com QR Code
                e escolhe o dia e turno da visita. A secretaria da unidade já recebe seus dados na fila de recepção.
              </p>
            </details>

            <details className="lp-faq-item" name="faq-matricula">
              <summary>Como é calculada a turma pela data de corte de 31 de março?</summary>
              <p>
                Seguimos a diretriz nacional do MEC (Resolução CNE/CEB nº 2/2018) adotada pela Secretaria Municipal de
                Educação de Patos - PB: considera-se a idade completa até <strong>31 de março</strong> do ano letivo.
              </p>
            </details>

            <details className="lp-faq-item" name="faq-matricula">
              <summary>O que fazer quando a creche desejada está em lista de espera?</summary>
              <p>
                Toque em <strong>“Avise-me quando abrir”</strong> para registrar seu WhatsApp (DDD 83). Além de avisar
                você na hora em que abrir vaga, seu alerta ajuda a Secretaria de Educação de Patos a mapear onde abrir
                novas turmas.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
