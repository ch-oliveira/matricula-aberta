import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Icone } from '../components/Icone';
import { toast } from '../components/Toasts';
import { DicaAjudante, TituloEtapa } from '../components/ui';
import { buscar } from '../domain/busca';
import { ETAPAS, statusDaOferta } from '../domain/etapas';
import { gerarMatrizQrCodeReal as gerarMatrizQr } from '../domain/qr';
import {
  documentosPara,
  proximoDiaUtilISO,
  validarCpf,
  type Busca,
  type CriterioVulnerabilidadeId,
  type Documento,
  type ProtocoloVisita,
  type TurnoVisita,
} from '../domain/types';
import { useAgora, usePersistido } from '../hooks';
import { useCatalogo, useEscolas, useProtocolos, vagasStore } from '../services/vagasStore';
import { folder } from '../stickers/icons';
import { CardEscolaEscolhida } from './step-visita/CardEscolaEscolhida';
import { ChecklistDocumentos } from './step-visita/ChecklistDocumentos';
import { ComprovanteVoucher } from './step-visita/ComprovanteVoucher';
import { FormAgendamento } from './step-visita/FormAgendamento';

interface Props {
  busca: Busca;
  escolaId: string;
  ajudante: boolean;
  turma?: string | null;
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
  const protocoloServidor = useMemo(
    () => (codigoSalvo ? protocolosRede.find((p) => p.codigo === codigoSalvo) : undefined),
    [codigoSalvo, protocolosRede],
  );
  const protocoloAtivo = protocoloServidor ?? protocoloLocal;

  // Atualização em background do protocolo
  useEffect(() => {
    if (!codigoSalvo) return;
    vagasStore.buscarProtocoloPorCodigo(codigoSalvo).then((p) => {
      if (p) setProtocoloLocal(p);
    }).catch(() => {
      /* fallback offline silencioso */
    });
  }, [codigoSalvo]);

  const [festa, setFesta] = useState(false);
  const dispararFesta = () => {
    setFesta(true);
    setTimeout(() => setFesta(false), 2400);
  };

  const alternar = (id: string) => {
    setMarcados((ant) => {
      const existe = ant.includes(id);
      const novo = existe ? ant.filter((x) => x !== id) : [...ant, id];
      const obrig = docs.filter((d: Documento) => d.obrigatorio);
      if (!existe && novo.filter((x) => obrig.some((o: Documento) => o.id === x)).length === obrig.length) {
        dispararFesta();
        toast('Todos os documentos obrigatórios foram marcados!', { emoji: 'sparkles', tom: 'ok' });
      }
      return novo;
    });
  };

  if (!r) {
    return (
      <section className="etapa" aria-labelledby="t-visita">
        <p className="aviso-suave">Unidade não encontrada. Volte e escolha outra escola.</p>
      </section>
    );
  }

  const { escola, oferta, distanciaKm } = r;
  const status = statusDaOferta(oferta);
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${escola.nome}, ${escola.endereco}, Patos - PB`,
  )}`;

  const msgWhats = encodeURIComponent(
    `Olá! Estou acompanhando as vagas da *${escola.nome}* no Matrícula Aberta (Patos - PB).\n` +
      `Turma: ${turma ?? ETAPAS[oferta.etapa].nome} (${oferta.periodo === 'integral' ? 'Integral' : 'Meio período'})\n` +
      `Status: ${oferta.vagas > 0 ? `${oferta.vagas} vagas livres` : 'Lista de espera'}\n` +
      `Como chegar: ${mapa}`,
  );

  const msgWhatsComprovante = useMemo(() => {
    if (!protocoloAtivo) return msgWhats;
    const baseOrigem = typeof window !== 'undefined' ? `${window.location.origin}/#/consultar-protocolo` : '';
    return encodeURIComponent(
      `🏛️ *Comprovante de Agendamento — Matrícula Aberta (Patos - PB)*\n\n` +
        `🎫 *Protocolo:* ${protocoloAtivo.codigo}\n` +
        `🏫 *Unidade:* ${escola.nome} (${escola.bairro})\n` +
        `🎒 *Turma:* ${protocoloAtivo.turma} (${protocoloAtivo.periodo === 'integral' ? 'Integral' : 'Parcial'})\n` +
        `📅 *Data da Visita:* ${formatarDataBR(protocoloAtivo.dataVisita)} (${
          protocoloAtivo.turnoVisita === 'manha' ? 'Manhã: 7h30 às 11h30' : 'Tarde: 13h30 às 17h'
        })\n` +
        `👤 *Responsável:* ${protocoloAtivo.responsavel}\n\n` +
        (protocoloAtivo.reservaVaga
          ? `🔒 *Status: VAGA PRÉ-RESERVADA E GARANTIDA* até o término do turno agendado.\n\n`
          : `📋 *Status: Inscrição em Fila de Espera Oficial* (Posição: ${protocoloAtivo.posicaoFila ?? 1}º lugar).\n\n`) +
        `Apresente o QR Code na secretaria da escola no dia da visita.\n` +
        `🔗 *Recuperar meu comprovante / QR Code:* ${baseOrigem}\n` +
        `📍 *Como chegar:* ${mapa}`,
    );
  }, [protocoloAtivo, escola, msgWhats, mapa]);

  const fala =
    `Você escolheu a unidade ${escola.nome}, localizada no bairro ${escola.bairro}, em ${escola.endereco}. ` +
    `O atendimento funciona ${escola.atendimento.replace('·', ',')}. ` +
    `Abaixo você confere o checklist de documentos exigidos pela Secretaria de Educação de Patos e pode emitir seu protocolo oficial com QR Code.`;

  async function gerarProtocolo(e: FormEvent) {
    e.preventDefault();
    if (!responsavel.trim()) {
      setErroProt('Informe o nome do pai, mãe ou responsável para constar no protocolo.');
      return;
    }
    const docLimpo = documentoEstudante.replace(/\D/g, '');
    if (docLimpo.length > 0) {
      if (docLimpo.length === 11 && !validarCpf(docLimpo)) {
        setErroProt('O CPF informado da criança possui dígitos verificadores inválidos. Confira os números digitados.');
        return;
      }
      if (docLimpo.length < 6) {
        setErroProt('Informe um CPF válido (11 dígitos) ou o número completo da Certidão de Nascimento.');
        return;
      }
    }
    setEmitindo(true);
    setErroProt(null);
    try {
      const prot = await vagasStore.emitirProtocoloVisita({
        escolaId: escola.id,
        etapa: oferta.etapa,
        turma: turma ?? ETAPAS[oferta.etapa].nome,
        periodo: oferta.periodo,
        responsavel: responsavel.trim(),
        documentoEstudante: documentoEstudante.trim() || undefined,
        telefone: telefone.trim() || undefined,
        dataVisita,
        turnoVisita,
        documentosMarcados: marcados,
        totalObrigatorios: docs.filter((d: Documento) => d.obrigatorio).length,
        criteriosPrioridade: criteriosSelecionados.length > 0 ? criteriosSelecionados : undefined,
      });

      setProtocoloLocal(prot);
      setMeusCodigos((ant) => ({ ...ant, [escola.id]: prot.codigo }));
      const token = prot.tokenCancelamento;
      if (token) {
        setMeusTokens((ant) => ({ ...ant, [prot.codigo]: token }));
      }
      dispararFesta();
      toast(
        prot.reservaVaga
          ? `Protocolo ${prot.codigo} emitido com VAGA PRÉ-RESERVADA!`
          : `Protocolo ${prot.codigo} gerado! Inscrito na lista de espera.`,
        { emoji: 'ticket', tom: 'ok' },
      );
    } catch (err) {
      setErroProt(err instanceof Error ? err.message : 'Falha ao gerar protocolo.');
    } finally {
      setEmitindo(false);
    }
  }

  async function executarCancelamento() {
    if (!protocoloAtivo) return;
    const token = meusTokens[protocoloAtivo.codigo];
    if (!token) {
      toast('Token de autorização do protocolo não localizado neste dispositivo.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
      return;
    }
    setCancelando(true);
    try {
      await vagasStore.cancelarProtocoloPorCidadao(protocoloAtivo.codigo, token);
      toast('Agendamento cancelado com sucesso. A vaga foi liberada para a escola.', {
        emoji: 'check-circle',
        tom: 'ok',
      });
      setConfirmandoCancelamento(false);
      setProtocoloLocal((ant) =>
        ant ? { ...ant, status: 'cancelado', motivoCancelamento: 'cancelado_cidadao' } : null,
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao cancelar agendamento.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
    } finally {
      setCancelando(false);
    }
  }

  const payloadQr = useMemo(() => {
    if (!protocoloAtivo) return '';
    return `MATRICULA-PATOS|${protocoloAtivo.codigo}|${escola.id}|${protocoloAtivo.turma}|${protocoloAtivo.dataVisita}|${protocoloAtivo.turnoVisita}`;
  }, [protocoloAtivo, escola.id]);

  const matrizQr = useMemo(() => {
    if (!payloadQr) return [];
    return gerarMatrizQr(payloadQr);
  }, [payloadQr]);

  async function baixarCartaoImagem() {
    if (!protocoloAtivo || matrizQr.length === 0) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1250;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo e borda externa estilo Ticket Patos-PB
      ctx.fillStyle = '#FCF8F2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 6;
      ctx.strokeStyle = '#181528';
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Topo Institucional
      ctx.fillStyle = '#5538D4';
      ctx.fillRect(30, 30, canvas.width - 60, 150);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Matrícula Aberta · Patos - PB', canvas.width / 2, 95);

      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Comprovante Oficial de Pré-Agendamento Presencial', canvas.width / 2, 140);

      // Código do Protocolo
      ctx.fillStyle = '#181528';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('PROTOCOLO OFICIAL', canvas.width / 2, 230);

      ctx.fillStyle = '#5538D4';
      ctx.font = '900 48px monospace';
      ctx.fillText(protocoloAtivo.codigo, canvas.width / 2, 290);

      // Caixa do QR Code
      const qrTamanhoPixels = 420;
      const qrInicioX = (canvas.width - qrTamanhoPixels) / 2;
      const qrInicioY = 320;
      const celulaTam = qrTamanhoPixels / (matrizQr.length + 2);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrInicioX - 10, qrInicioY - 10, qrTamanhoPixels + 20, qrTamanhoPixels + 20);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#181528';
      ctx.strokeRect(qrInicioX - 10, qrInicioY - 10, qrTamanhoPixels + 20, qrTamanhoPixels + 20);

      ctx.fillStyle = '#171625';
      for (let rIdx = 0; rIdx < matrizQr.length; rIdx++) {
        for (let cIdx = 0; cIdx < matrizQr[rIdx].length; cIdx++) {
          if (matrizQr[rIdx][cIdx]) {
            ctx.fillRect(
              qrInicioX + (cIdx + 1) * celulaTam,
              qrInicioY + (rIdx + 1) * celulaTam,
              Math.ceil(celulaTam),
              Math.ceil(celulaTam),
            );
          }
        }
      }

      // Detalhes do Agendamento
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(50, 780, canvas.width - 100, 360);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#181528';
      ctx.strokeRect(50, 780, canvas.width - 100, 360);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#181528';

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Unidade Escolar:', 74, 845);
      ctx.font = '500 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${escola.nome} (${escola.bairro})`, 250, 845);

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('Endereço:', 74, 885);
      ctx.font = '500 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(escola.endereco, 180, 885);

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

      <CardEscolaEscolhida
        escola={escola}
        oferta={oferta}
        turma={turma}
        status={status}
        distanciaKm={distanciaKm}
        agora={agora}
        mapa={mapa}
        msgWhats={msgWhats}
        onAlerta={onAlerta}
      />

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
          <ComprovanteVoucher
            protocolo={protocoloAtivo}
            escola={escola}
            matrizQr={matrizQr}
            confirmandoCancelamento={confirmandoCancelamento}
            setConfirmandoCancelamento={setConfirmandoCancelamento}
            cancelando={cancelando}
            onExecutarCancelamento={executarCancelamento}
            onBaixarCartaoImagem={baixarCartaoImagem}
            msgWhatsComprovante={msgWhatsComprovante}
            onEmitirOutroProtocolo={() => {
              setProtocoloLocal(null);
              setMeusCodigos((ant) => {
                const copia = { ...ant };
                delete copia[escola.id];
                return copia;
              });
            }}
          />
        ) : (
          <FormAgendamento
            respId={respId}
            docEstudanteId={docEstudanteId}
            telId={telId}
            dataId={dataId}
            responsavel={responsavel}
            setResponsavel={setResponsavel}
            documentoEstudante={documentoEstudante}
            setDocumentoEstudante={setDocumentoEstudante}
            telefone={telefone}
            setTelefone={setTelefone}
            dataVisita={dataVisita}
            setDataVisita={setDataVisita}
            turnoVisita={turnoVisita}
            setTurnoVisita={setTurnoVisita}
            criteriosSelecionados={criteriosSelecionados}
            setCriteriosSelecionados={setCriteriosSelecionados}
            erroProt={erroProt}
            setErroProt={setErroProt}
            emitindo={emitindo}
            onSubmit={gerarProtocolo}
          />
        )}
      </div>

      {/* ================= CHECKLIST DE DOCUMENTOS ================= */}
      <ChecklistDocumentos
        docs={docs}
        marcados={marcados}
        progressoId={progressoId}
        onAlternarDoc={alternar}
        fotosDocs={fotosDocs}
        setFotosDocs={setFotosDocs}
      />

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
