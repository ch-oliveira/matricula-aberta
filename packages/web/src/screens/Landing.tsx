import { useMemo } from 'react';
import { CenaEscola3D } from '../components/CenaEscola3D';
import { Icone, IconeEtapa } from '../components/Icone';
import { pulsoDaCidade } from '../domain/busca';
import { ETAPAS, ORDEM_ETAPAS } from '../domain/etapas';
import type { EtapaId } from '../domain/types';
import { useFala } from '../hooks';
import { useEscolas } from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { calendar, folder, padlock, pin } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';

interface Props {
  onComecar: (etapa?: EtapaId) => void;
  onVerEscola: (escolaId: string, etapa: EtapaId) => void;
  protocoloAtivo?: { escolaId: string; codigo: string; escolaNome: string } | null;
  onAbrirProtocolo?: (escolaId: string) => void;
}

export function Landing({ onComecar, protocoloAtivo, onAbrirProtocolo }: Props) {
  const escolas = useEscolas();
  const { suportado, falando, falar, parar } = useFala();

  const pulso = useMemo(() => pulsoDaCidade(escolas), [escolas]);
  const totalVagas = Object.values(pulso).reduce((s, p) => s + p.vagas, 0);
  const totalEscolasComVaga = useMemo(
    () => escolas.filter((e) => e.ofertas.some((o) => o.vagas > 0)).length,
    [escolas],
  );

  const textoAudio =
    `Olá! Bem-vindo ao Matrícula Aberta de Patos, na Paraíba. ` +
    `Aqui você descobre rapidinho quais creches e escolas municipais perto da sua casa têm vaga aberta agora, sem precisar de cadastro nem de CPF. ` +
    `Neste momento, temos ${totalVagas} vagas disponíveis em ${totalEscolasComVaga} unidades da nossa rede municipal. ` +
    `Para começar, toque no botão Consultar vagas em Patos, ou escolha a idade da criança logo abaixo.`;

  return (
    <div className="landing">
      {/* Banner de protocolo ativo caso o cidadão já tenha emitido senha */}
      {protocoloAtivo && onAbrirProtocolo && (
        <aside className="lp-banner-protocolo" role="status" aria-label="Protocolo ativo">
          <div className="lp-banner-protocolo-conteudo">
            <span className="lp-banner-protocolo-tag">
              <Icone nome="ticket" tamanho={16} /> Protocolo emitido
            </span>
            <p>
              Você já tem uma senha ativa: <strong>{protocoloAtivo.codigo}</strong> na{' '}
              <strong>{protocoloAtivo.escolaNome}</strong>.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primario btn-pequeno"
            onClick={() => onAbrirProtocolo(protocoloAtivo.escolaId)}
          >
            <span>Ver meu QR Code</span>
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      )}

      {/* ================= BLOCO 1: HERO DIRETO COM PERSONAGEM 3D + ATALHOS POR ETAPA ================= */}
      <section className="lp-hero-wrapper" aria-labelledby="lp-titulo">
        <div className="lp-hero">
          <div className="lp-hero-texto">
            <div className="lp-selo-vivo" aria-live="polite">
              <span className="ponto-vivo" aria-hidden="true" />
              <span>
                Patos - PB ao vivo · <strong>{totalVagas} vagas abertas</strong> em {totalEscolasComVaga} unidades
              </span>
            </div>

            <h1 id="lp-titulo">
              Vaga nas creches e escolas de <span className="lp-grifo">Patos - PB</span> sem fila na porta.
            </h1>

            <p className="lp-subtitulo">
              Consulte em 30 segundos onde há vagas no seu bairro, confira os documentos necessários e emita seu{' '}
              <strong>Protocolo com QR Code</strong> para atendimento rápido na escola.
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
                  <Icone nome={falando ? 'stop' : 'volume'} tamanho={16} />
                  <span>{falando ? 'Parar áudio' : 'Ouvir explicação'}</span>
                </button>
              )}
            </div>

            <ul className="lp-garantias" aria-label="Garantias da plataforma">
              <li>
                <span className="lp-check" aria-hidden="true"><Icone nome="check" tamanho={13} /></span> Sem cadastro na busca
              </li>
              <li>
                <span className="lp-check" aria-hidden="true"><Icone nome="check" tamanho={13} /></span> Protocolo QR Code oficial
              </li>
              <li>
                <span className="lp-check" aria-hidden="true"><Icone nome="check" tamanho={13} /></span> Alertas no WhatsApp (DDD 83)
              </li>
            </ul>
          </div>

          {/* Apenas a Mãe e o Filho em 3D Interativo (clicáveis, olham pro mouse e riem) */}
          <div className="lp-hero-ilustracao">
            <CenaEscola3D />
          </div>
        </div>

        {/* Faixa direta de atalho por etapa */}
        <div className="lp-faixa-etapas" aria-label="Escolha a etapa de ensino">
          <div className="lp-faixa-topo">
            <h2>Ou comece clicando direto na etapa da criança:</h2>
            <span className="lp-faixa-dica">Não sabe a etapa? Calculamos pela data de nascimento.</span>
          </div>

          <div className="lp-etapas-grid">
            {ORDEM_ETAPAS.map((id) => {
              const e = ETAPAS[id];
              const p = pulso[id];
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
                    <span className="lp-etapa-icone" aria-hidden="true">
                      <IconeEtapa etapa={id} tamanho={24} />
                    </span>
                  </div>

                  <div className="lp-etapa-card-rodape">
                    <span className="lp-etapa-vagas-pill">
                      <strong>{p.vagas}</strong> vagas livres
                    </span>
                    <span className="lp-etapa-cta" aria-hidden="true">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= BLOCO 2: COMO FUNCIONA EM 3 PASSOS DIRETOS ================= */}
      <section id="como-funciona" className="lp-secao" aria-labelledby="t-passos">
        <div className="lp-secao-cabecalho">
          <span className="lp-tag">Rápido e sem burocracia</span>
          <h2 id="t-passos">Como garantir o atendimento em 3 passos</h2>
        </div>

        <ol className="lp-passos-grade lp-passos-3">
          <li
            className="lp-passo-card"
            role="button"
            tabIndex={0}
            onClick={() => onComecar()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onComecar();
              }
            }}
          >
            <div className="lp-passo-topo">
              <span className="lp-passo-num">01</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={calendar} palette={PALETTES.riso} offset={0} replayOnHover style={{ width: 72 }} />
              </div>
            </div>
            <h3>Idade da criança</h3>
            <p>
              Informe a data de nascimento ou a etapa. O sistema indica a turma certa pelo corte do MEC (31/03).
            </p>
          </li>

          <li
            className="lp-passo-card"
            role="button"
            tabIndex={0}
            onClick={() => onComecar()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onComecar();
              }
            }}
          >
            <div className="lp-passo-topo">
              <span className="lp-passo-num">02</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={pin} palette={PALETTES.sunset} offset={35} replayOnHover style={{ width: 72 }} />
              </div>
            </div>
            <h3>Bairro no mapa de Patos</h3>
            <p>
              Toque no seu bairro no mapa interativo de Patos - PB para ver as creches e escolas mais próximas com vaga.
            </p>
          </li>

          <li
            className="lp-passo-card"
            role="button"
            tabIndex={0}
            onClick={() => onComecar()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onComecar();
              }
            }}
          >
            <div className="lp-passo-topo">
              <span className="lp-passo-num">03</span>
              <div className="lp-passo-sticker" aria-hidden="true">
                <Sticker icon={folder} palette={PALETTES.candy} offset={70} replayOnHover style={{ width: 72 }} />
              </div>
            </div>
            <h3>Checklist e Protocolo QR</h3>
            <p>
              Confira os documentos necessários e emita o protocolo <strong>PATOS-2027-XXXX</strong> para levar à escola.
            </p>
          </li>
        </ol>
      </section>

      {/* ================= BLOCO 3: DÚVIDAS RÁPIDAS + ACESSO GESTÃO ================= */}
      <section id="duvidas" className="lp-rodape-duplo" aria-labelledby="t-faq">
        <div className="lp-cta-lateral">
          <div className="lp-cta-lateral-topo">
            <Sticker icon={padlock} palette={PALETTES.clay} replayOnHover style={{ width: 68 }} />
            <span className="lp-tag">Patos - PB · 100% Gratuito</span>
          </div>
          <h2>Vai matricular ou transferir seu filho?</h2>
          <p>
            Consulte as vagas abertas perto da sua casa agora mesmo, sem precisar de senha ou CPF, e gere seu protocolo digital.
          </p>
          <div className="lp-cta-final-botoes">
            <button type="button" className="btn btn-primario btn-largo" onClick={() => onComecar()}>
              <span>Consultar vagas agora</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="lp-faq-coluna">
          <h2 id="t-faq">Dúvidas rápidas</h2>
          <div className="lp-faq">
            <details className="lp-faq-item" name="faq-matricula" open>
              <summary>Preciso informar CPF para consultar as vagas?</summary>
              <p>
                <strong>Não.</strong> A consulta é 100% livre e anônima. Você só informa seu nome no último passo se
                quiser gerar o <strong>Protocolo com QR Code</strong>.
              </p>
            </details>

            <details className="lp-faq-item" name="faq-matricula">
              <summary>Como funciona o protocolo presencial (PATOS-2027-XXXX)?</summary>
              <p>
                Ao escolher a unidade, você agenda o dia e turno (manhã ou tarde) e leva o QR Code com os documentos do
                checklist direto à secretaria da escola, sem enfrentar fila na madrugada.
              </p>
            </details>

            <details className="lp-faq-item" name="faq-matricula">
              <summary>E se a creche do meu bairro estiver sem vaga no momento?</summary>
              <p>
                Basta tocar em <strong>“Avise-me”</strong> para receber um alerta no seu WhatsApp (DDD 83) assim que
                abrir vaga na unidade escolhida.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
