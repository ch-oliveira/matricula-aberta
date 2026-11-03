import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Icone, IconeDocumento, IconeUnidade } from '../components/Icone';
import { toast } from '../components/Toasts';
import { DicaAjudante, Ocupacao, StatusPill, TituloEtapa } from '../components/ui';
import { buscar } from '../domain/busca';
import { documentosPara } from '../domain/documentos';
import { ETAPAS, STATUS_INFO } from '../domain/etapas';
import { formatarDistancia, minutosAPe, tempoRelativo } from '../domain/geo';
import { gerarMatrizQrCodeReal } from '../domain/qr';
import {
  dataLocalISO,
  formatarCpfOuCertidao,
  LISTA_CRITERIOS_VULNERABILIDADE,
  proximoDiaUtilISO,
  type Busca,
  type CriterioVulnerabilidadeId,
  type ProtocoloVisita,
  type TurnoVisita,
} from '../domain/types';
import { useAgora, usePersistido } from '../hooks';
import { mascararTelefone } from '../services/alertas';
import { useCatalogo, useEscolas, useProtocolos, vagasStore } from '../services/vagasStore';
import { folder } from '../stickers/icons';

interface Props {
  busca: Busca;
  escolaId: string;
  ajudante: boolean;
  turma: string | null;
  onAlerta: (escolaId: string) => void;
}

function formatarDataBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

export function StepVisita({ busca, escolaId, ajudante, turma, onAlerta }: Props) {
  const escolas = useEscolas();
  const catalogo = useCatalogo();
  const protocolosRede = useProtocolos();
  const agora = useAgora();

  const r = useMemo(
    () => buscar(escolas, { ...busca, raioKm: 999, soAcessivel: false }).find((x) => x.escola.id === escolaId),
    [escolas, busca, escolaId],
  );
  const docs = useMemo(() => documentosPara(catalogo.documentos, busca.etapa), [catalogo.documentos, busca.etapa]);
  const [marcados, setMarcados] = usePersistido<string[]>('ma:checklist:v1', []);
  const [meusCodigos, setMeusCodigos] = usePersistido<Record<string, string>>('ma:protocolos:por-escola:v1', {});
  const [meusTokens, setMeusTokens] = usePersistido<Record<string, string>>('ma:protocolos:tokens:v1', {});
  const progressoId = useId();
  const respId = useId();
  const telId = useId();
  const dataId = useId();
  const docEstudanteId = useId();

  const [responsavel, setResponsavel] = useState('');
  const [documentoEstudante, setDocumentoEstudante] = useState('');
  const [telefone, setTelefone] = useState('');
  const [turnoVisita, setTurnoVisita] = useState<TurnoVisita>('manha');
  const [dataVisita, setDataVisita] = useState<string>(() => proximoDiaUtilISO(1));
  const [criteriosSelecionados, setCriteriosSelecionados] = useState<CriterioVulnerabilidadeId[]>([]);
  const [emitindo, setEmitindo] = useState(false);
  const [erroProt, setErroProt] = useState<string | null>(null);
  const [protocoloLocal, setProtocoloLocal] = useState<ProtocoloVisita | null>(null);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [fotosDocs, setFotosDocs] = usePersistido<Record<string, string>>('ma:docs:fotos:v1', {});

  // Sincroniza protocolo emitido para esta escola com o estado ao vivo do servidor
  const codigoSalvo = meusCodigos[escolaId];

  useEffect(() => {
    if (!codigoSalvo) return;
    void vagasStore.buscarProtocoloPorCodigo(codigoSalvo);
  }, [codigoSalvo, agora]);

  const protocoloAtivo = useMemo(() => {
    if (codigoSalvo) {
      const doServidor = protocolosRede.find((p) => p.codigo === codigoSalvo);
      if (doServidor) return doServidor;
    }
    if (protocoloLocal && protocoloLocal.escolaId === escolaId) {
      return protocolosRede.find((p) => p.codigo === protocoloLocal.codigo) ?? protocoloLocal;
    }
    return null;
  }, [codigoSalvo, protocolosRede, protocoloLocal, escolaId]);

  const obrig = docs.filter((d) => d.obrigatorio);
  const feitos = obrig.filter((d) => marcados.includes(d.id)).length;
  const completo = obrig.length > 0 && feitos === obrig.length;

  const [festa, setFesta] = useState(false);
  const anterior = useRef(completo);
  useEffect(() => {
    const virouCompleto = completo && !anterior.current;
    anterior.current = completo;
    if (!virouCompleto) return;
    setFesta(true);
    const t = setTimeout(() => setFesta(false), 2200);
    return () => clearTimeout(t);
  }, [completo]);

  if (!r) return <p className="aviso-suave">Unidade escolar não encontrada em Patos - PB. Volte e escolha outra.</p>;
  const { escola, oferta, status, distanciaKm } = r;

  const mapa = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${escola.lat},${escola.lng}`)}`;
  const faltando = obrig.filter((d) => !marcados.includes(d.id)).map((d) => `- ${d.nome}`);
  const msgWhats = encodeURIComponent(
    `*Matrícula Aberta · Patos - PB*\n\n` +
      (protocoloAtivo ? `*Protocolo:* ${protocoloAtivo.codigo}\n` : '') +
      `${escola.nome}\n${escola.endereco}\nAtendimento: ${escola.atendimento}\n` +
      `${STATUS_INFO[status].frase(oferta.vagas, oferta.fila)} (${ETAPAS[oferta.etapa].nome})\n\n` +
      (faltando.length ? `Ainda falta separar:\n${faltando.join('\n')}\n\n` : 'Documentos todos separados!\n\n') +
      `Como chegar: ${mapa}`,
  );

  const fala =
    `Você escolheu a unidade ${escola.nome}, localizada no bairro ${escola.bairro}, em ${escola.endereco}. ` +
    `O atendimento funciona ${escola.atendimento.replace('·', ',')}. ` +
    `No momento, a turma está assim: ${STATUS_INFO[status].frase(oferta.vagas, oferta.fila)}. ` +
    `Para fazer a matrícula sem precisar dar duas viagens, leve os seguintes documentos: ` +
    obrig.map((d) => d.nome).join(', ') +
    '. Mais abaixo, você pode informar seu nome para gerar o protocolo digital e ser atendido mais rápido na secretaria.';

  function alternar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function gerarProtocolo(e: FormEvent) {
    e.preventDefault();
    if (!responsavel.trim()) {
      setErroProt('Informe o nome do pai, mãe ou responsável para constar no protocolo.');
      return;
    }
    setEmitindo(true);
    setErroProt(null);
    try {
      const novo = await vagasStore.emitirProtocoloVisita({
        escolaId: escola.id,
        etapa: oferta.etapa,
        turma: turma ?? ETAPAS[oferta.etapa].nome,
        periodo: oferta.periodo,
        responsavel: responsavel.trim(),
        telefone: telefone || undefined,
        nascimento: busca.nascimento ?? undefined,
        turnoVisita,
        dataVisita,
        documentosMarcados: marcados,
        totalObrigatorios: obrig.length,
        documentoEstudante: documentoEstudante.trim() || undefined,
        criteriosPrioridade: criteriosSelecionados.length > 0 ? criteriosSelecionados : undefined,
      });
      setProtocoloLocal(novo);
      setMeusCodigos((ant) => ({ ...ant, [escola.id]: novo.codigo }));
      if (novo.tokenCancelamento) {
        setMeusTokens((ant) => ({ ...ant, [novo.codigo]: novo.tokenCancelamento! }));
      }
      toast(`Protocolo ${novo.codigo} emitido e enviado para a secretaria da escola!`, {
        emoji: 'ticket',
        tom: 'ok',
      });
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Não foi possível emitir o protocolo. Tente novamente.';
      setErroProt(msg);
    } finally {
      setEmitindo(false);
    }
  }

  async function executarCancelamento() {
    if (!protocoloAtivo) return;
    const token = meusTokens[protocoloAtivo.codigo] || protocoloAtivo.tokenCancelamento;
    if (!token) {
      toast('Token de cancelamento não localizado neste aparelho. Procure a secretaria da escola.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
      return;
    }
    setCancelando(true);
    try {
      const cancelado = await vagasStore.cancelarProtocoloPorCidadao(protocoloAtivo.codigo, token);
      setProtocoloLocal(cancelado);
      setMeusCodigos((ant) => {
        const copia = { ...ant };
        delete copia[escola.id];
        return copia;
      });
      toast('Agendamento cancelado com sucesso. A vaga foi devolvida para a rede escolar de Patos!', {
        emoji: 'check-circle',
        tom: 'ok',
      });
      setConfirmandoCancelamento(false);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Falha ao cancelar agendamento.';
      toast(msg, { emoji: 'alert-triangle', tom: 'aviso' });
    } finally {
      setCancelando(false);
    }
  }

  const matrizQr = useMemo(
    () => (protocoloAtivo ? gerarMatrizQrCodeReal(protocoloAtivo.codigo) : []),
    [protocoloAtivo],
  );

  function baixarCartaoImagem() {
    if (!protocoloAtivo) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1260;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo principal
      ctx.fillStyle = '#FAF7F0';
      ctx.fillRect(0, 0, 900, 1260);

      // Borda Neo-brutalista
      ctx.strokeStyle = '#171625';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 860, 1220);

      // Faixa Superior (Amarelo / Sol de Patos)
      ctx.fillStyle = '#FFE072';
      ctx.fillRect(24, 24, 852, 140);
      ctx.fillStyle = '#171625';
      ctx.strokeRect(24, 24, 852, 140);

      // Textos do Cabeçalho
      ctx.fillStyle = '#171625';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('PREFEITURA MUNICIPAL DE PATOS - PB', 48, 68);
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText('SECRETARIA MUNICIPAL DE EDUCAÇÃO', 48, 108);
      ctx.font = '600 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('MATRÍCULA ABERTA · PROTOCOLO OFICIAL DE PRÉ-AGENDAMENTO', 48, 138);

      // Caixa da Escola
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(50, 195, 800, 140);
      ctx.strokeStyle = '#171625';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 195, 800, 140);

      ctx.fillStyle = '#171625';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillText(escola.nome, 74, 245);
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#4A485A';
      ctx.fillText(escola.endereco, 74, 280);
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#227B4E';
      ctx.fillText(`Atendimento: ${escola.atendimento}`, 74, 312);

      // Bloco do Código de Protocolo
      ctx.fillStyle = '#171625';
      ctx.fillRect(50, 360, 800, 100);
      ctx.fillStyle = '#FFE072';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('NÚMERO DO PROTOCOLO (APRESENTE ESTA TELA)', 74, 395);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 44px monospace, system-ui';
      ctx.fillText(protocoloAtivo.codigo, 74, 442);

      // Desenhar o QR Code padrão ISO
      const qrTamanho = 320;
      const qrX = (900 - qrTamanho) / 2;
      const qrY = 490;
      const numCelulas = matrizQr.length || 21;
      const celula = qrTamanho / numCelulas;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 16, qrY - 16, qrTamanho + 32, qrTamanho + 32);
      ctx.strokeStyle = '#171625';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX - 16, qrY - 16, qrTamanho + 32, qrTamanho + 32);

      ctx.fillStyle = '#171625';
      matrizQr.forEach((linha, rIdx) => {
        linha.forEach((preenchido, cIdx) => {
          if (preenchido) {
            ctx.fillRect(qrX + cIdx * celula, qrY + rIdx * celula, celula + 0.5, celula + 0.5);
          }
        });
      });

      // Legenda do QR Code
      ctx.fillStyle = '#171625';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Apresente este QR Code na secretaria da creche/escola', 450, 855);
      ctx.textAlign = 'left';

      // Dados da Matrícula
      ctx.fillStyle = '#F3EFE6';
      ctx.fillRect(50, 885, 800, 240);
      ctx.strokeStyle = '#171625';
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 885, 800, 240);

      ctx.fillStyle = '#171625';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Responsável:', 74, 925);
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(protocoloAtivo.responsavel, 220, 925);

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Data da Visita:', 74, 965);
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `${formatarDataBR(protocoloAtivo.dataVisita)} · Turno: ${
          protocoloAtivo.turnoVisita === 'manha' ? 'Manhã (7h30–11h30)' : 'Tarde (13h30–17h)'
        }`,
        220,
        965,
      );

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Turma Solicitada:', 74, 1005);
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `${protocoloAtivo.turma} (${protocoloAtivo.periodo === 'integral' ? 'Tempo Integral' : 'Meio Período'})`,
        250,
        1005,
      );

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Checklist Documental:', 74, 1045);
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `${protocoloAtivo.documentosMarcados.length} de ${protocoloAtivo.totalObrigatorios} documentos obrigatórios separados`,
        300,
        1045,
      );

      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#227B4E';
      ctx.fillText(
        protocoloAtivo.reservaVaga
          ? `✓ VAGA PRÉ-RESERVADA · COMPARECER ATÉ ${formatarDataBR(protocoloAtivo.dataVisita)} (${protocoloAtivo.turnoVisita === 'manha' ? '12:30' : '18:00'})`
          : '✓ PROTOCOLO DE FILA DE ESPERA OFICIAL DE PATOS - PB',
        74,
        1095,
      );

      // Rodapé Offline
      ctx.fillStyle = '#676479';
      ctx.font = '500 15px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Este comprovante tem validade oficial e funciona 100% offline (não precisa de internet na escola).',
        450,
        1170,
      );
      ctx.fillText(
        `Emitido em: ${new Date().toLocaleDateString('pt-BR')} · Sistema Matrícula Aberta (Patos - PB)`,
        450,
        1195,
      );

      // Trigger Download
      const link = document.createElement('a');
      link.download = `protocolo-${protocoloAtivo.codigo}-patos.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast('Cartão com QR Code baixado no seu celular/computador!', {
        emoji: 'check-circle',
        tom: 'ok',
      });
    } catch {
      toast('Não foi possível gerar o arquivo. Você pode tirar um print da tela!', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
    }
  }

  return (
    <section className="etapa" aria-labelledby="t-visita">
      <TituloEtapa
        id="t-visita"
        emoji="check-circle"
        sticker={folder}
        titulo="Prepare a visita e emita sua senha"
        subtitulo="Confira os documentos da Rede Municipal de Patos - PB e gere seu protocolo digital com QR Code."
        fala={fala}
      />

      <article className={`card-escola card-${status} card-escolhida`}>
        <div className="card-topo">
          <span className="card-avatar" aria-hidden="true">
            <IconeUnidade tipo={escola.tipo} tamanho={24} />
          </span>
          <div className="card-nome">
            <h2>{escola.nome}</h2>
            <p>{escola.endereco}</p>
          </div>
        </div>
        <div className="card-status">
          <StatusPill status={status} grande />
          <span className="card-numero">{STATUS_INFO[status].frase(oferta.vagas, oferta.fila)}</span>
        </div>
        <Ocupacao vagas={oferta.vagas} capacidade={oferta.capacidade} status={status} />
        <dl className="info-grade">
          <div>
            <dt><Icone nome="backpack" tamanho={15} /> Turma</dt>
            <dd>
              {turma ?? ETAPAS[oferta.etapa].nome} ({oferta.periodo === 'integral' ? 'Integral' : 'Meio período'})
            </dd>
          </div>
          <div>
            <dt><Icone nome="clock" tamanho={15} /> Atendimento</dt>
            <dd>{escola.atendimento}</dd>
          </div>
          <div>
            <dt><Icone nome="walk" tamanho={15} /> Distância</dt>
            <dd>
              {formatarDistancia(distanciaKm)} · {minutosAPe(distanciaKm)} min
            </dd>
          </div>
          <div>
            <dt><Icone nome="refresh" tamanho={15} /> Atualizado</dt>
            <dd>{tempoRelativo(escola.atualizadoEm, agora)}</dd>
          </div>
        </dl>
        <div className="acoes-grade">
          <a className="btn btn-primario" href={mapa} target="_blank" rel="noopener noreferrer">
            <Icone nome="map" tamanho={16} /> Como chegar
          </a>
          <a className="btn btn-secundario" href={`tel:${escola.telefone.replace(/\D/g, '')}`}>
            <Icone nome="phone" tamanho={16} /> {escola.telefone}
          </a>
          <a className="btn btn-whats" href={`https://wa.me/?text=${msgWhats}`} target="_blank" rel="noopener noreferrer">
            <Icone nome="message" tamanho={16} /> Enviar no WhatsApp
          </a>
          {status === 'espera' && (
            <button type="button" className="btn btn-secundario" onClick={() => onAlerta(escola.id)}>
              <Icone nome="bell" tamanho={16} /> Avise-me
            </button>
          )}
        </div>
      </article>

      {/* ================= PROTOCOLO DE PRÉ-AGENDAMENTO COM QR CODE ================= */}
      <div className="protocolo-box">
        <div className="protocolo-cabecalho">
          <div>
            <span className="lp-mini-tag">Atendimento Ágil · Patos - PB</span>
            <h2><Icone nome="ticket" tamanho={20} /> Protocolo de Pré-Agendamento Presencial</h2>
          </div>
          {protocoloAtivo && (
            <span className={`selo-protocolo selo-prot-${protocoloAtivo.status}`}>
              {protocoloAtivo.status === 'atendido' ? (
                <>
                  <Icone nome="check-circle" tamanho={15} /> Matrícula confirmada
                </>
              ) : protocoloAtivo.status === 'cancelado' ? (
                <>
                  <Icone nome="x" tamanho={15} /> Cancelado
                </>
              ) : (
                <>
                  <Icone nome="hourglass" tamanho={15} /> Aguardando visita
                </>
              )}
            </span>
          )}
        </div>

        {protocoloAtivo ? (
          <div className="protocolo-bilhete" aria-live="polite">
            <div className="protocolo-qr-bloco">
              <svg
                className="protocolo-qr-svg"
                viewBox={`0 0 ${matrizQr.length + 2} ${matrizQr.length + 2}`}
                role="img"
                aria-label={`QR Code do protocolo ${protocoloAtivo.codigo}`}
              >
                <rect x="0" y="0" width={matrizQr.length + 2} height={matrizQr.length + 2} fill="#FFFFFF" />
                {matrizQr.map((linha, rIdx) =>
                  linha.map((preenchido, cIdx) =>
                    preenchido ? (
                      <rect key={`${rIdx}-${cIdx}`} x={cIdx + 1} y={rIdx + 1} width="1" height="1" fill="#171625" />
                    ) : null,
                  ),
                )}
              </svg>
              <small>Apresente na secretaria</small>
            </div>

            <div className="protocolo-dados">
              <div className="protocolo-codigo-linha">
                <span>PROTOCOLO OFICIAL</span>
                <strong className="protocolo-codigo">{protocoloAtivo.codigo}</strong>
              </div>
              <dl className="protocolo-meta">
                <div>
                  <dt>Responsável</dt>
                  <dd>{protocoloAtivo.responsavel}</dd>
                </div>
                <div>
                  <dt>Data e turno previsto</dt>
                  <dd>
                    {formatarDataBR(protocoloAtivo.dataVisita)} ·{' '}
                    {protocoloAtivo.turnoVisita === 'manha' ? 'Manhã (7h30–11h30)' : 'Tarde (13h30–17h)'}
                  </dd>
                </div>
                <div>
                  <dt>Turma solicitada</dt>
                  <dd>
                    {protocoloAtivo.turma} ({protocoloAtivo.periodo === 'integral' ? 'Integral' : 'Parcial'})
                  </dd>
                </div>
                <div>
                  <dt>Checklist de documentos</dt>
                  <dd>
                    {protocoloAtivo.documentosMarcados.length}/{protocoloAtivo.totalObrigatorios} separados
                  </dd>
                </div>
              </dl>

              {protocoloAtivo.pontosPrioridade !== undefined && protocoloAtivo.pontosPrioridade > 0 && (
                <div
                  style={{
                    background: '#EEF2FF',
                    border: '1.5px solid #C7D2FE',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    margin: '10px 0',
                    fontSize: '0.86rem',
                    color: '#3730A3',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>⚖️ Prioridade Regulatória: {protocoloAtivo.pontosPrioridade} pontos</strong>
                  <div style={{ fontSize: '0.78rem', marginTop: '2px', color: '#4F46E5' }}>
                    Critérios legais declarados para auditoria da fila pública. Apresente os comprovantes no comparecimento.
                  </div>
                </div>
              )}

              {protocoloAtivo.reservaVaga && protocoloAtivo.status === 'aguardando' && (
                <div
                  className="aviso-reserva-garantida"
                  style={{
                    background: '#E8F5E9',
                    border: '2px solid #2E7D32',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    margin: '12px 0',
                    color: '#1B5E20',
                    fontSize: '0.92rem',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>🔒 Vaga Pré-Reservada e Garantida:</strong>
                  <div>
                    1 vaga foi debitada do quadro escolar e está reservada para você até{' '}
                    <strong>{formatarDataBR(protocoloAtivo.dataVisita)}</strong> às{' '}
                    <strong>{protocoloAtivo.turnoVisita === 'manha' ? '12h30' : '18h00'}</strong> (fim do turno).
                    Após este horário, se não houver comparecimento, o agendamento expira e a vaga retorna para a rede.
                  </div>
                </div>
              )}

              {!protocoloAtivo.reservaVaga && protocoloAtivo.status === 'aguardando' && (
                <div
                  className="aviso-reserva-fila"
                  style={{
                    background: '#FFF3E0',
                    border: '2px solid #E65100',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    margin: '12px 0',
                    color: '#BF360C',
                    fontSize: '0.92rem',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>📋 Inscrição em Fila de Espera Oficial:</strong>
                  <div>
                    No momento todas as vagas estão preenchidas. Você é o{' '}
                    <strong>{protocoloAtivo.posicaoFila ?? 1}º lugar</strong> na lista de espera oficial para{' '}
                    {protocoloAtivo.turma} nesta unidade. A secretaria chamará conforme ordem cronológica.
                  </div>
                </div>
              )}

              {protocoloAtivo.status === 'cancelado' && (
                <div
                  style={{
                    background: '#FFEBEE',
                    border: '2px solid #C62828',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    margin: '12px 0',
                    color: '#B71C1C',
                    fontSize: '0.92rem',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>⚠️ Protocolo Cancelado / Expirado:</strong>
                  <div>
                    {protocoloAtivo.motivoCancelamento === 'expirado_sem_comparecimento'
                      ? 'O prazo limite de comparecimento encerrou. A vaga pré-reservada foi devolvida para a rede escolar.'
                      : protocoloAtivo.motivoCancelamento === 'cancelado_cidadao'
                        ? 'Este agendamento foi cancelado por você. A vaga foi liberada imediatamente para outra família.'
                        : 'Este agendamento foi cancelado. A vaga reservada retornou para o quadro de vagas.'}
                  </div>
                </div>
              )}

              <p className="protocolo-aviso">
                {protocoloAtivo.status === 'atendido' ? (
                  <>
                    <Icone nome="sparkles" tamanho={16} />{' '}
                    <strong>Atendimento confirmado pela secretaria da unidade!</strong> A vaga foi efetivada e
                    vinculada à criança.
                  </>
                ) : protocoloAtivo.status === 'cancelado' ? (
                  <>
                    <Icone nome="alert-triangle" tamanho={16} />{' '}
                    Para obter uma nova vaga, faça uma nova busca e emita um novo protocolo.
                  </>
                ) : (
                  <>
                    <Icone nome="lightbulb" tamanho={16} /> A secretaria da <strong>{escola.nome}</strong> já recebeu
                    seu pré-agendamento. Apresente este QR Code com os documentos na data agendada.
                  </>
                )}
              </p>

              {confirmandoCancelamento && protocoloAtivo.status === 'aguardando' && (
                <div
                  style={{
                    background: '#FFF3E0',
                    border: '2px solid #E65100',
                    borderRadius: '8px',
                    padding: '14px',
                    margin: '12px 0',
                    color: '#171625',
                  }}
                >
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    Tem certeza que deseja cancelar seu agendamento?
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#555' }}>
                    Sua vaga pré-reservada será <strong>devolvida imediatamente</strong> para o quadro da escola e ficará disponível para outros pais.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-perigo btn-pequeno"
                      disabled={cancelando}
                      onClick={executarCancelamento}
                    >
                      {cancelando ? 'Cancelando…' : 'Sim, cancelar e liberar vaga'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-fantasma btn-pequeno"
                      disabled={cancelando}
                      onClick={() => setConfirmandoCancelamento(false)}
                    >
                      Voltar (manter minha vaga)
                    </button>
                  </div>
                </div>
              )}

              <div className="protocolo-acoes">
                <button
                  type="button"
                  className="btn btn-primario btn-pequeno"
                  onClick={baixarCartaoImagem}
                  title="Salvar voucher do protocolo em alta definição no celular"
                >
                  <Icone nome="file-text" tamanho={15} /> Baixar Cartão no Celular (PNG)
                </button>
                <button
                  type="button"
                  className="btn btn-secundario btn-pequeno"
                  onClick={() => window.print()}
                  title="Imprimir ou salvar em PDF"
                >
                  <Icone nome="printer" tamanho={15} /> Imprimir Comprovante
                </button>
                <a className="btn btn-whats btn-pequeno" href={`https://wa.me/?text=${msgWhats}`} target="_blank" rel="noopener noreferrer">
                  <Icone nome="message" tamanho={15} /> Salvar no WhatsApp
                </a>
                {protocoloAtivo.status === 'aguardando' && !confirmandoCancelamento && (
                  <button
                    type="button"
                    className="btn btn-fantasma btn-pequeno"
                    style={{ color: '#C62828' }}
                    onClick={() => setConfirmandoCancelamento(true)}
                  >
                    <Icone nome="x" tamanho={15} /> Cancelar Agendamento
                  </button>
                )}
                <button
                  type="button"
                  className="link-sutil"
                  onClick={() => {
                    setProtocoloLocal(null);
                    setMeusCodigos((ant) => {
                      const copia = { ...ant };
                      delete copia[escola.id];
                      return copia;
                    });
                  }}
                >
                  Emitir outro protocolo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form className="protocolo-form" onSubmit={gerarProtocolo} noValidate>
            <div
              style={{
                background: '#FFF9C4',
                border: '2px solid #F57F17',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                color: '#5D4037',
                fontSize: '0.92rem',
                lineHeight: '1.4',
              }}
            >
              <strong>⚡ Pré-Reserva com Vaga Garantida (Patos - PB):</strong>
              <div>
                Ao emitir seu protocolo, 1 vaga é imediatamente debitada do quadro escolar e reservada para você até o dia e turno escolhidos.
                Se você informar seu WhatsApp abaixo, enviaremos avisos no dia e 1 hora antes para lembrá-lo da documentação e do prazo.
              </div>
            </div>
            <p className="legenda">
              Gere gratuitamente sua senha digital. A secretaria da unidade em Patos - PB visualiza sua chegada e o
              status dos seus documentos antes mesmo de você sair de casa.
            </p>
            <div className="protocolo-campos">
              <div className="campo">
                <label htmlFor={respId}>Nome do pai, mãe ou responsável</label>
                <input
                  id={respId}
                  type="text"
                  placeholder="Ex.: Maria das Graças Nóbrega"
                  value={responsavel}
                  onChange={(e) => {
                    setResponsavel(e.target.value);
                    setErroProt(null);
                  }}
                />
              </div>

              <div className="campo">
                <label htmlFor={docEstudanteId}>CPF ou Certidão de Nascimento da criança</label>
                <input
                  id={docEstudanteId}
                  type="text"
                  placeholder="Ex.: 000.000.000-00 ou nº da certidão"
                  value={documentoEstudante}
                  onChange={(e) => {
                    setDocumentoEstudante(formatarCpfOuCertidao(e.target.value));
                    setErroProt(null);
                  }}
                />
                <small style={{ fontSize: '0.78rem', color: '#676479', marginTop: '4px', display: 'block' }}>
                  Garante a vaga única da criança na rede municipal (evita duplicidades).
                </small>
              </div>

              <div className="campo">
                <label htmlFor={telId}>WhatsApp para contato (opcional)</label>
                <input
                  id={telId}
                  type="tel"
                  inputMode="tel"
                  placeholder="(83) 99612-3456"
                  value={telefone}
                  onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                />
              </div>

              <div className="campo">
                <label htmlFor={dataId}>Dia da visita</label>
                <input
                  id={dataId}
                  type="date"
                  min={dataLocalISO()}
                  value={dataVisita}
                  onChange={(e) => setDataVisita(e.target.value)}
                />
              </div>

              <fieldset className="grupo" style={{ margin: 0 }}>
                <legend>Turno de preferência</legend>
                <div className="chips chips-iguais">
                  <label className="chip">
                    <input
                      type="radio"
                      name="turnoVisita"
                      checked={turnoVisita === 'manha'}
                      onChange={() => setTurnoVisita('manha')}
                    />
                    <span><Icone nome="cloud-sun" tamanho={15} /> Manhã</span>
                  </label>
                  <label className="chip">
                    <input
                      type="radio"
                      name="turnoVisita"
                      checked={turnoVisita === 'tarde'}
                      onChange={() => setTurnoVisita('tarde')}
                    />
                    <span><Icone nome="sun" tamanho={15} /> Tarde</span>
                  </label>
                </div>
              </fieldset>
            </div>

            {/* Critérios de Prioridade e Ação Social (Pilar B - Regulação) */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '10px',
                padding: '14px',
                margin: '16px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Icone nome="shield" tamanho={18} />
                <strong style={{ fontSize: '0.92rem', color: '#1E293B' }}>
                  Critérios de Prioridade e Ação Social (Opcional)
                </strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 10px', lineHeight: '1.4' }}>
                Marque se a criança ou família se enquadra nos critérios da legislação municipal de Patos-PB (Marco Legal da 1ª Infância e ECA). Garante pontuação na fila auditável.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {LISTA_CRITERIOS_VULNERABILIDADE.filter((c) => c.id !== 'medida_protetiva').map((c) => {
                  const marcado = criteriosSelecionados.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: marcado ? '#F1F5F9' : 'transparent',
                        border: marcado ? '1px solid #94A3B8' : '1px solid transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => {
                          setCriteriosSelecionados((prev) =>
                            marcado ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                          );
                        }}
                        style={{ marginTop: '3px', accentColor: '#2563EB' }}
                      />
                      <div>
                        <strong style={{ color: '#0F172A' }}>+{c.pontos} pts: {c.nome}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                          {c.descricao} (Apresentar: <em>{c.documentoExigido}</em>)
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {erroProt && (
              <p className="erro-campo" role="alert">
                <Icone nome="alert-triangle" tamanho={16} /> {erroProt}
              </p>
            )}

            <button type="submit" className="btn btn-primario btn-largo" disabled={emitindo}>
              <Icone nome="ticket" tamanho={17} />{' '}
              {emitindo ? 'Gerando protocolo em Patos - PB…' : 'Emitir protocolo com QR Code'}
            </button>
          </form>
        )}
      </div>

      {/* ================= CHECKLIST DE DOCUMENTOS ================= */}
      <div className="checklist">
        <div className="checklist-topo">
          <h2 id={progressoId}><Icone nome="list" tamanho={20} /> Checklist de documentos (Patos - PB)</h2>
          <span className="checklist-contagem">
            {feitos}/{obrig.length}
          </span>
        </div>
        <progress className="barra-progresso" max={Math.max(1, obrig.length)} value={feitos} aria-labelledby={progressoId} />
        <p className="checklist-sub">
          {completo ? (
            <>
              <Icone nome="sparkles" tamanho={16} /> Tudo pronto! Seus documentos obrigatórios estão completos.
            </>
          ) : (
            'Marque os documentos que você já separou. Fica salvo no seu celular.'
          )}
        </p>

        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id}>
              <label className={`doc ${marcados.includes(d.id) ? 'doc-ok' : ''}`}>
                <input type="checkbox" checked={marcados.includes(d.id)} onChange={() => alternar(d.id)} />
                <span className="doc-check" aria-hidden="true" />
                <span className="doc-emoji" aria-hidden="true">
                  <IconeDocumento id={d.id} icone={d.emoji} tamanho={22} />
                </span>
                <span className="doc-textos">
                  <span className="doc-nome">
                    {d.nome}
                    {!d.obrigatorio && <em className="doc-opcional">se tiver</em>}
                  </span>
                  <span className="doc-dica">{d.dica}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: '16px', padding: '14px', background: 'var(--surface, #FFF)', border: '2px dashed var(--line, #171625)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Icone nome="camera" tamanho={18} />
            <strong style={{ fontSize: '0.92rem' }}>Fotografar documentos para levar no celular (Opcional)</strong>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#676479' }}>
            Você pode fotografar os documentos agora. As fotos ficam salvas no seu aparelho para agilizar a conferência na escola.
          </p>
          <label className="btn btn-secundario btn-pequeno" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <Icone nome="camera" tamanho={15} />
            <span>Tirar foto ou anexar imagem</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const url = ev.target?.result as string;
                  setFotosDocs((ant) => ({ ...ant, [Date.now()]: url }));
                  toast('Foto do documento salva no seu celular!', { emoji: 'check-circle', tom: 'ok' });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {Object.keys(fotosDocs).length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {Object.entries(fotosDocs).map(([k, foto]) => (
                <div key={k} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '2px solid var(--line, #171625)' }}>
                  <img src={foto} alt="Documento anexado" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    style={{ position: 'absolute', top: 0, right: 0, background: '#D32F2F', color: '#fff', border: 'none', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => {
                      setFotosDocs((ant) => {
                        const cp = { ...ant };
                        delete cp[k];
                        return cp;
                      });
                    }}
                    title="Remover foto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= GUIA LOCAL: ONDE EMITIR EM PATOS - PB ================= */}
      <div className="guia-documentos-patos" aria-labelledby="t-onde-emitir">
        <div className="guia-documentos-topo">
          <span className="guia-documentos-icone" aria-hidden="true">
            <Icone nome="map" tamanho={22} />
          </span>
          <div>
            <h3 id="t-onde-emitir">Não tem algum documento? Onde emitir em Patos - PB:</h3>
            <p>Serviços públicos gratuitos na cidade para regularizar a documentação da criança</p>
          </div>
        </div>

        <div className="guia-locais-grade">
          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Documentos Pessoais</span>
              <h4>Casa da Cidadania · Patos - PB</h4>
            </div>
            <p className="guia-local-desc">
              Emissão de RG / Carteira de Identidade Nacional (CIN), CPF e 2ª via de Certidão.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> <strong>Guedes Shopping (1º piso)</strong> · R. Pedro Firmino, Centro / Alça Sudeste · Seg a sex, 7h às 17h
            </p>
          </article>

          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Saúde da Criança</span>
              <h4>UBS do seu bairro (Postos de Saúde)</h4>
            </div>
            <p className="guia-local-desc">
              Emissão do Cartão SUS e atualização da caderneta de vacinação exigida para matrícula.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> Em qualquer UBS de Patos (ex.: UBS Aderbal Martins no Belo Horizonte, UBS Jatobá, UBS Centro)
            </p>
          </article>

          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Prioridade Social</span>
              <h4>CRAS / CadÚnico (Bolsa Família)</h4>
            </div>
            <p className="guia-local-desc">
              Comprovante do Número do NIS e atualização do CadÚnico para prioridade em vagas de creche.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> CRAS Geralda Medeiros (São Sebastião) · CRAS Capitão Manoel Gomes (Belo Horizonte) · CRAS Morro
            </p>
          </article>

          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Residência & Histórico</span>
              <h4>SEDUC & Concessionárias</h4>
            </div>
            <p className="guia-local-desc">
              Fatura da Energisa PB ou Cagepa; Declaração de transferência na secretaria da escola anterior ou SEDUC.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> SEDUC: R. Horácio Nóbrega, Belo Horizonte / Centro · Atendimento das 7h às 13h
            </p>
          </article>
        </div>
      </div>

      <DicaAjudante ativo={ajudante}>
        Tire foto dos documentos com o celular e emita o protocolo acima — assim a secretaria da escola em Patos já
        adia a conferência na chegada.
      </DicaAjudante>

      <div className="como-funciona">
        <h2>Como funciona o atendimento presencial em Patos - PB?</h2>
        <ol>
          <li>
            <span aria-hidden="true"><Icone nome="ticket" tamanho={18} /></span> Apresente o <strong>QR Code do protocolo</strong> e os documentos na
            secretaria da unidade.
          </li>
          <li>
            <span aria-hidden="true"><Icone nome="timer" tamanho={18} /></span> Com o protocolo pré-agendado, a conferência leva menos de 10 minutos.
          </li>
          <li>
            <span aria-hidden="true"><Icone nome="smartphone" tamanho={18} /></span> A secretaria confirma o protocolo no painel e a vaga é atualizada em
            tempo real.
          </li>
        </ol>
      </div>

      {festa && (
        <div className="confete" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ ['--i' as string]: i }}>
              <Icone nome={(['sparkles', 'star', 'award', 'check-circle'] as const)[i % 4]} tamanho={20} />
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
