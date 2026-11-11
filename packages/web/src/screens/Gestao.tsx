import { useEffect, useRef, useState } from 'react';
import { Icone } from '../components/Icone';
import { LeitorQrModal } from '../components/LeitorQrModal';
import { toast } from '../components/Toasts';
import { useHashRoute } from '../hooks';
import {
  useEscolas,
  usePainelSecretaria,
  useProtocolos,
  useSessaoSecretaria,
  useSessaoUnidade,
  vagasStore,
} from '../services/vagasStore';
import { PALETTES } from '../stickers/fun';
import { school } from '../stickers/icons';
import { Sticker } from '../stickers/Sticker';
import { LoginSecretaria, LoginUnidade } from './gestao/LoginGestao';
import { PainelMacroSecretaria } from './gestao/PainelMacroSecretaria';
import { PainelUnidade } from './gestao/PainelUnidade';

export function Gestao() {
  const escolas = useEscolas();
  const protocolos = useProtocolos();
  const painelSecretaria = usePainelSecretaria();
  const sessaoSecretaria = useSessaoSecretaria();
  const sessaoUnidade = useSessaoUnidade();
  const rota = useHashRoute();
  const [leitorQrAberto, setLeitorQrAberto] = useState(false);
  const [aba, setAba] = useState<'secretaria' | 'unidade'>(() =>
    window.location.hash.includes('unidade') ? 'unidade' : 'secretaria',
  );
  // Permite que um gestor autenticado na SEDUC inspecione qualquer unidade no Painel da Unidade
  const [escolaInspecionadaSeduc, setEscolaInspecionadaSeduc] = useState<string | null>(null);

  useEffect(() => {
    if (rota.includes('unidade')) setAba('unidade');
    else if (rota === '#/gestao' || rota === '#/gestao/secretaria') setAba('secretaria');
  }, [rota]);

  // Limpa legado de autologin antigo se existente
  useEffect(() => {
    try {
      localStorage.removeItem('ma:gestao:sessao:v2');
      localStorage.removeItem('ma:gestao:aba:v2');
    } catch {
      /* ignore */
    }
  }, []);

  // Toast discreto em telas pequenas sugerindo a aba Unidade para leitura de QR Code
  const avisoMobileExibidoRef = useRef(false);
  useEffect(() => {
    if (
      aba === 'secretaria' &&
      !avisoMobileExibidoRef.current &&
      typeof window !== 'undefined' &&
      window.innerWidth <= 768
    ) {
      avisoMobileExibidoRef.current = true;
      toast('Dica: para bipar QR Code no celular ou tablet, use a aba Painel da Unidade.', {
        emoji: 'info',
        tom: 'info',
      });
    }
  }, [aba]);

  const authSecretaria = Boolean(sessaoSecretaria);
  const idUnidadeAtiva =
    sessaoUnidade?.escolaId ?? (authSecretaria ? escolaInspecionadaSeduc : null);
  const authUnidade = Boolean(idUnidadeAtiva);
  const escola = idUnidadeAtiva ? escolas.find((e) => e.id === idUnidadeAtiva) ?? null : null;

  function sairSecretaria() {
    vagasStore.encerrarSessaoGestao('secretaria');
    setEscolaInspecionadaSeduc(null);
    toast('Sessão da Secretaria de Educação encerrada.', { emoji: 'info', tom: 'info' });
  }

  function sairUnidade() {
    if (sessaoUnidade) {
      vagasStore.encerrarSessaoGestao('unidade');
    }
    setEscolaInspecionadaSeduc(null);
    toast('Sessão da Unidade Escolar encerrada.', { emoji: 'info', tom: 'info' });
  }

  return (
    <div className="gestao">
      <div className="gestao-shell">
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
              <a className="btn btn-secundario btn-pequeno" href="#" title="Voltar ao portal dos pais">
                <Icone nome="arrow-left" tamanho={13} />
                <span className="btn-voltar-texto-longo">Portal dos Pais</span>
                <span className="btn-voltar-texto-curto">Voltar</span>
              </a>

              {aba === 'secretaria' && authSecretaria && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-pequeno"
                  onClick={sairSecretaria}
                  title="Encerrar sessão da Secretaria"
                >
                  <Icone nome="x" tamanho={14} /> Sair
                </button>
              )}

              {aba === 'unidade' && authUnidade && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-pequeno"
                  onClick={sairUnidade}
                  title="Encerrar sessão da Unidade"
                >
                  <Icone nome="x" tamanho={14} /> Sair
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="gestao-conteudo">
          {aba === 'secretaria' ? (
            authSecretaria ? (
              painelSecretaria ? (
                <PainelMacroSecretaria
                  painel={painelSecretaria}
                  protocolos={protocolos}
                  onAbrirUnidade={(id) => {
                    setEscolaInspecionadaSeduc(id);
                    setAba('unidade');
                    window.history.replaceState(null, '', '#/gestao/unidade');
                  }}
                  onAbrirLeitor={() => setLeitorQrAberto(true)}
                />
              ) : (
                <p className="aviso-suave">Carregando indicadores da Secretaria Municipal de Educação de Patos - PB…</p>
              )
            ) : (
              <LoginSecretaria
                onEntrar={() => {
                  toast('Bem-vindo à Secretaria Municipal de Educação de Patos - PB!', {
                    emoji: 'check-circle',
                    tom: 'ok',
                  });
                }}
              />
            )
          ) : authUnidade && escola ? (
            <PainelUnidade
              escola={escola}
              escolas={escolas}
              podeTrocarLivremente={authSecretaria}
              onTrocarEscola={(id) => {
                if (authSecretaria) {
                  setEscolaInspecionadaSeduc(id);
                } else {
                  vagasStore.encerrarSessaoGestao('unidade');
                  toast('Faça login com o PIN da unidade selecionada.', { emoji: 'info', tom: 'info' });
                }
              }}
              onAbrirLeitor={() => setLeitorQrAberto(true)}
              onSair={sairUnidade}
            />
          ) : (
            <LoginUnidade
              escolas={escolas}
              onEntrar={(id) => {
                const esc = escolas.find((e) => e.id === id);
                toast(`Acesso liberado: ${esc?.nome ?? 'Unidade Escolar'}`, {
                  emoji: 'check-circle',
                  tom: 'ok',
                });
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
            try {
              await vagasStore.atualizarStatusProtocolo(codigo, 'atendido');
              toast(`Matrícula do protocolo ${codigo} confirmada com sucesso!`, {
                emoji: 'check-circle',
                tom: 'ok',
              });
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Falha ao confirmar protocolo.', {
                emoji: 'alert-triangle',
                tom: 'aviso',
              });
              throw err;
            }
          }}
        />
      </div>
    </div>
  );
}
