import { useEffect, useId, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { extrairCodigoProtocolo } from '../domain/qr';
import type { Escola, ProtocoloVisita } from '../domain/types';
import { vagasStore } from '../services/vagasStore';
import { Icone } from './Icone';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  escolaAtual?: Escola;
  todasEscolas: Escola[];
  protocolos: ProtocoloVisita[];
  onConfirmarMatricula: (codigo: string) => Promise<void>;
}

function tocarSomBip() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      void ctx.close().catch(() => {});
    };
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    /* ignore */
  }
}

export function LeitorQrModal({
  aberto,
  onFechar,
  escolaAtual,
  todasEscolas,
  protocolos,
  onConfirmarMatricula,
}: Props) {
  const [modoAba, setModoAba] = useState<'camera' | 'manual'>('camera');
  const [cameraStatus, setCameraStatus] = useState<'iniciando' | 'ativa' | 'negada' | 'erro'>('iniciando');
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [protocoloEncontrado, setProtocoloEncontrado] = useState<ProtocoloVisita | null>(null);
  const [codigoNaoEncontrado, setCodigoNaoEncontrado] = useState<string | null>(null);
  const [processandoBaixa, setProcessandoBaixa] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const idInput = useId();

  // Para a câmera e limpa animações
  function pararCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Busca e exibe o protocolo a partir de uma string
  async function processarCodigoLido(codigoBruto: string) {
    const cod = extrairCodigoProtocolo(codigoBruto);
    if (!cod) return;

    tocarSomBip();
    const achadoLocal = protocolos.find((p) => p.codigo.toUpperCase() === cod.toUpperCase());
    if (achadoLocal) {
      setProtocoloEncontrado(achadoLocal);
      setCodigoNaoEncontrado(null);
      return;
    }

    const achadoRemoto = await vagasStore.buscarProtocoloPorCodigo(cod);
    if (achadoRemoto) {
      setProtocoloEncontrado(achadoRemoto);
      setCodigoNaoEncontrado(null);
    } else {
      setProtocoloEncontrado(null);
      setCodigoNaoEncontrado(cod);
    }
  }

  // Inicia captura da câmera quando o modal é aberto em modo 'camera' e nenhum protocolo está em foco
  useEffect(() => {
    if (!aberto || modoAba !== 'camera' || protocoloEncontrado) {
      pararCamera();
      return;
    }

    let cancelado = false;
    setCameraStatus('iniciando');
    setErroMsg(null);

    async function iniciarCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Navegador sem suporte a acesso de câmera.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraStatus('ativa');
          iniciarLoopLeitura();
        }
      } catch (err: unknown) {
        if (cancelado) return;
        console.warn('[Leitor QR] Erro ao acessar câmera:', err);
        const name = (err as { name?: string })?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraStatus('negada');
          setErroMsg('Permissão de acesso à câmera foi negada no navegador. Permita o acesso ou digite o código.');
        } else {
          setCameraStatus('erro');
          setErroMsg('Câmera não disponível no momento. Você pode localizar digitando o código do protocolo.');
        }
      }
    }

    void iniciarCamera();

    return () => {
      cancelado = true;
      pararCamera();
    };
  }, [aberto, modoAba, protocoloEncontrado]);

  // Loop de leitura com BarcodeDetector ou fallback para jsQR
  function iniciarLoopLeitura() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const temBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let detector: unknown = null;
    if (temBarcodeDetector) {
      try {
        detector = new (window as unknown as { BarcodeDetector: new (opt: unknown) => unknown }).BarcodeDetector({
          formats: ['qr_code'],
        });
      } catch {
        detector = null;
      }
    }

    let escaneando = true;

    async function tick() {
      if (!escaneando || !videoRef.current) return;
      const v = videoRef.current;

      if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.videoWidth > 0 && v.videoHeight > 0) {
        // Tenta BarcodeDetector nativo primeiro
        if (detector && typeof (detector as { detect?: (source: unknown) => Promise<Array<{ rawValue?: string }>> }).detect === 'function') {
          try {
            const barcodes = await (detector as { detect: (source: unknown) => Promise<Array<{ rawValue?: string }>> }).detect(v);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              escaneando = false;
              processarCodigoLido(barcodes[0].rawValue);
              return;
            }
          } catch {
            /* continua para fallback */
          }
        }

        // Fallback robusto com jsQR
        if (ctx) {
          canvas.width = Math.min(v.videoWidth, 640);
          canvas.height = Math.min(v.videoHeight, 480);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const resultado = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (resultado && resultado.data) {
            escaneando = false;
            processarCodigoLido(resultado.data);
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(() => {
        void tick();
      });
    }

    animFrameRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }

  // Tecla Escape para fechar
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const escolaDoProt = protocoloEncontrado
    ? todasEscolas.find((e) => e.id === protocoloEncontrado.escolaId)
    : null;
  const ehDestaEscola =
    !escolaAtual || (protocoloEncontrado && protocoloEncontrado.escolaId === escolaAtual.id);

  function resetarParaNovaLeitura() {
    setProtocoloEncontrado(null);
    setCodigoNaoEncontrado(null);
    setCodigoDigitado('');
    setModoAba('camera');
  }

  async function handleConfirmar() {
    if (!protocoloEncontrado) return;
    setProcessandoBaixa(true);
    try {
      await onConfirmarMatricula(protocoloEncontrado.codigo);
      // Atualiza o estado visual do protocolo
      setProtocoloEncontrado((ant) => (ant ? { ...ant, status: 'atendido' } : null));
    } finally {
      setProcessandoBaixa(false);
    }
  }

  function imprimirTermoEfetivacao() {
    if (!protocoloEncontrado) return;
    const p = protocoloEncontrado;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Termo de Matrícula - ${p.codigo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #171625; max-width: 760px; margin: 0 auto; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px solid #171625; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header h2 { margin: 4px 0 0; font-size: 16px; font-weight: 600; }
          .badge { display: inline-block; background: #E8F5E9; border: 2px solid #2E7D32; color: #1B5E20; padding: 6px 14px; border-radius: 6px; font-weight: bold; margin: 16px 0; font-size: 14px; }
          .dados { border: 1.5px solid #171625; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .dados table { width: 100%; border-collapse: collapse; }
          .dados td { padding: 8px 4px; vertical-align: top; }
          .dados td.label { font-weight: bold; width: 35%; color: #444; }
          .assinaturas { margin-top: 60px; display: flex; justify-content: space-between; }
          .assinatura { width: 45%; text-align: center; border-top: 1.5px solid #171625; padding-top: 8px; font-size: 13px; }
          .rodape { margin-top: 50px; text-align: center; font-size: 11px; color: #777; border-top: 1px dashed #ccc; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Prefeitura Municipal de Patos - PB</h1>
          <h2>Secretaria Municipal de Educação (SEDUC)</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #555;">Matrícula Aberta · Comprovante Oficial de Comparecimento e Efetivação</p>
        </div>

        <div style="text-align: center;">
          <span class="badge">✓ MATRÍCULA EFETIVADA COM SUCESSO</span>
          <p style="font-size: 22px; font-weight: 900; margin: 8px 0; font-family: monospace;">PROTOCOLO: ${p.codigo}</p>
        </div>

        <div class="dados">
          <table>
            <tr><td class="label">Unidade Escolar:</td><td><strong>${p.escolaNome}</strong></td></tr>
            <tr><td class="label">Endereço da Unidade:</td><td>${p.escolaEndereco} (${p.escolaBairro})</td></tr>
            <tr><td class="label">Responsável Legal:</td><td>${p.responsavel}</td></tr>
            <tr><td class="label">Telefone / WhatsApp:</td><td>${p.telefone ?? 'Não informado'}</td></tr>
            <tr><td class="label">Turma e Etapa:</td><td><strong>${p.turma}</strong> (${p.periodo === 'integral' ? 'Período Integral' : 'Meio Período'})</td></tr>
            <tr><td class="label">Documentos Apresentados:</td><td>${p.documentosMarcados.length} de ${p.totalObrigatorios} exigidos na Rede de Patos - PB</td></tr>
            <tr><td class="label">Data de Efetivação:</td><td>${new Date().toLocaleString('pt-BR')}</td></tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #444; line-height: 1.4;">
          Atestamos que o(a) responsável acima identificado(a) compareceu presencialmente à unidade escolar munido(a) da documentação exigida, efetivando a vaga solicitada para o ano letivo correspondente.
        </p>

        <div class="assinaturas">
          <div class="assinatura">
            <strong>${p.responsavel}</strong><br />
            Responsável Legal
          </div>
          <div class="assinatura">
            <strong>Secretaria / Direção Escolar</strong><br />
            ${p.escolaNome}
          </div>
        </div>

        <div class="rodape">
          Documento emitido eletronicamente via Sistema Matrícula Aberta (Patos - PB) em ${new Date().toLocaleString('pt-BR')}.
        </div>
        <script>
          window.print();
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="t-leitor-qr">
      <div className="modal-conteudo leitor-qr-modal">
        <header className="modal-topo">
          <div className="modal-titulo-bloco">
            <span className="modal-icone-badge" aria-hidden="true">
              <Icone nome="qr-code" tamanho={22} />
            </span>
            <div>
              <h2 id="t-leitor-qr">Escanear Protocolo Presencial</h2>
              <p className="legenda">
                {escolaAtual
                  ? `Recepção de alunos · ${escolaAtual.nome}`
                  : 'Recepção de alunos · Rede Municipal de Patos - PB'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-fechar-modal" onClick={onFechar} aria-label="Fechar leitor">
            <Icone nome="x" tamanho={18} />
          </button>
        </header>

        {/* Abas: Câmera ao vivo vs Digitar Código */}
        {!protocoloEncontrado && !codigoNaoEncontrado && (
          <div className="leitor-abas" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={modoAba === 'camera'}
              className={`leitor-aba-btn ${modoAba === 'camera' ? 'ativa' : ''}`}
              onClick={() => setModoAba('camera')}
            >
              <Icone nome="qr-code" tamanho={16} /> Câmera ao vivo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modoAba === 'manual'}
              className={`leitor-aba-btn ${modoAba === 'manual' ? 'ativa' : ''}`}
              onClick={() => {
                pararCamera();
                setModoAba('manual');
              }}
            >
              <Icone nome="list" tamanho={16} /> Digitar Código
            </button>
          </div>
        )}

        <div className="leitor-corpo">
          {/* CASO 1: PROTOCOLO LOCALIZADO COM SUCESSO */}
          {protocoloEncontrado ? (
            <div className="leitor-sucesso-bloco" aria-live="assertive">
              <div className="leitor-sucesso-topo">
                <span className="selo-protocolo selo-prot-atendido">
                  <Icone nome="check-circle" tamanho={16} /> Protocolo Identificado
                </span>
                <strong className="leitor-codigo-destaque">{protocoloEncontrado.codigo}</strong>
              </div>

              {!ehDestaEscola && escolaDoProt && (
                <div className="leitor-alerta-outra-escola" role="alert">
                  <Icone nome="alert-triangle" tamanho={18} />
                  <div>
                    <strong>Atenção: Unidade diferente!</strong>
                    <p>
                      Este protocolo foi gerado para <strong>{escolaDoProt.nome}</strong> ({escolaDoProt.bairro}).
                    </p>
                  </div>
                </div>
              )}

              <dl className="leitor-ficha-protocolo">
                <div>
                  <dt>Responsável</dt>
                  <dd>
                    <strong>{protocoloEncontrado.responsavel}</strong>
                    {protocoloEncontrado.telefone && (
                      <span className="tel-sub"> · {protocoloEncontrado.telefone}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Turma e Período</dt>
                  <dd>
                    {protocoloEncontrado.turma} (
                    {protocoloEncontrado.periodo === 'integral' ? 'Tempo Integral' : 'Meio Período'})
                  </dd>
                </div>
                <div>
                  <dt>Data e Turno Previstos</dt>
                  <dd>
                    {protocoloEncontrado.dataVisita.split('-').reverse().join('/')} ·{' '}
                    {protocoloEncontrado.turnoVisita === 'manha' ? 'Manhã (7h30–11h30)' : 'Tarde (13h30–17h)'}
                  </dd>
                </div>
                <div>
                  <dt>Checklist Documental</dt>
                  <dd>
                    <strong>
                      {protocoloEncontrado.documentosMarcados.length} de {protocoloEncontrado.totalObrigatorios}{' '}
                      documentos
                    </strong>{' '}
                    marcados como separados
                  </dd>
                </div>
                <div>
                  <dt>Situação Atual</dt>
                  <dd>
                    <span className={`selo-protocolo selo-prot-${protocoloEncontrado.status}`}>
                      {protocoloEncontrado.status === 'atendido'
                        ? 'Matrícula confirmada (Vaga ocupada)'
                        : protocoloEncontrado.status === 'cancelado'
                          ? 'Cancelado'
                          : 'Aguardando atendimento presencial'}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="leitor-acoes-confirmacao">
                {protocoloEncontrado.status === 'aguardando' && (
                  <button
                    type="button"
                    className="btn btn-primario btn-largo"
                    onClick={handleConfirmar}
                    disabled={processandoBaixa}
                  >
                    <Icone nome="check" tamanho={18} />
                    <span>{processandoBaixa ? 'Confirmando...' : 'Confirmar Matrícula (Dar Baixa na Vaga)'}</span>
                  </button>
                )}

                {protocoloEncontrado.status === 'atendido' && (
                  <div className="leitor-confirmado-msg" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icone nome="check-circle" tamanho={20} />
                      <span>Matrícula vinculada com sucesso! Vaga contabilizada no sistema.</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primario"
                      onClick={imprimirTermoEfetivacao}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      <Icone nome="printer" tamanho={16} />
                      <span>Imprimir Termo de Efetivação</span>
                    </button>
                  </div>
                )}

                <div className="leitor-botoes-secundarios">
                  <button type="button" className="btn btn-secundario" onClick={resetarParaNovaLeitura}>
                    <Icone nome="qr-code" tamanho={16} /> Escanear outro QR Code
                  </button>
                  <button type="button" className="btn btn-fantasma" onClick={onFechar}>
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          ) : codigoNaoEncontrado ? (
            /* CASO 2: CÓDIGO NÃO LOCALIZADO NO BANCO */
            <div className="leitor-nao-encontrado-bloco" role="alert">
              <span className="icone-alerta-grande" aria-hidden="true">
                <Icone nome="alert-triangle" tamanho={36} />
              </span>
              <h3>Protocolo não localizado</h3>
              <p>
                O código <strong>{codigoNaoEncontrado}</strong> não foi encontrado na base de dados de Patos - PB.
              </p>
              <div className="leitor-botoes-secundarios">
                <button type="button" className="btn btn-primario" onClick={resetarParaNovaLeitura}>
                  Tentar novamente
                </button>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={() => {
                    setCodigoDigitado(codigoNaoEncontrado);
                    setCodigoNaoEncontrado(null);
                    setModoAba('manual');
                  }}
                >
                  Digitar manualmente
                </button>
              </div>
            </div>
          ) : modoAba === 'camera' ? (
            /* CASO 3: CÂMERA AO VIVO COM VIEW FINDER / MIRA */
            <div className="leitor-camera-container">
              {cameraStatus === 'iniciando' && (
                <div className="leitor-camera-placeholder">
                  <span className="ponto-vivo" aria-hidden="true" />
                  <p>Iniciando câmera do dispositivo...</p>
                </div>
              )}

              {cameraStatus === 'negada' && (
                <div className="leitor-camera-placeholder leitor-erro">
                  <Icone nome="alert-triangle" tamanho={32} />
                  <p>{erroMsg}</p>
                  <button type="button" className="btn btn-secundario btn-pequeno" onClick={() => setModoAba('manual')}>
                    Digitar código manualmente
                  </button>
                </div>
              )}

              {cameraStatus === 'erro' && (
                <div className="leitor-camera-placeholder leitor-erro">
                  <Icone nome="info" tamanho={32} />
                  <p>{erroMsg}</p>
                  <button type="button" className="btn btn-secundario btn-pequeno" onClick={() => setModoAba('manual')}>
                    Localizar por código digitado
                  </button>
                </div>
              )}

              <video
                ref={videoRef}
                className={`leitor-video ${cameraStatus === 'ativa' ? 'visivel' : 'oculto'}`}
                playsInline
                muted
              />

              {cameraStatus === 'ativa' && (
                <div className="leitor-overlay-mira" aria-hidden="true">
                  <div className="leitor-quadro-mira">
                    <span className="canto canto-tl" />
                    <span className="canto canto-tr" />
                    <span className="canto canto-bl" />
                    <span className="canto canto-br" />
                    <div className="leitor-linha-laser" />
                  </div>
                  <p className="leitor-dica-mira">Centralize o QR Code no quadrado acima</p>
                </div>
              )}
            </div>
          ) : (
            /* CASO 4: FORMULÁRIO MANUAL */
            <form
              className="leitor-form-manual"
              onSubmit={(e) => {
                e.preventDefault();
                processarCodigoLido(codigoDigitado);
              }}
            >
              <label htmlFor={idInput}>Código oficial do protocolo presencial:</label>
              <div className="leitor-input-grupo">
                <input
                  id={idInput}
                  type="text"
                  placeholder="Ex: PATOS-2027-6119"
                  value={codigoDigitado}
                  onChange={(e) => setCodigoDigitado(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primario" disabled={!codigoDigitado.trim()}>
                  <Icone nome="check" tamanho={16} /> Buscar
                </button>
              </div>
              <p className="legenda">
                O código está impresso no cartão de visita e no cabeçalho do voucher no celular da família.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

