import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from '../components/Toasts';
import { DicaAjudante, Ocupacao, StatusPill, TituloEtapa } from '../components/ui';
import { buscar } from '../domain/busca';
import { documentosPara } from '../domain/documentos';
import { ETAPAS, STATUS_INFO } from '../domain/etapas';
import { formatarDistancia, minutosAPe, tempoRelativo } from '../domain/geo';
import { gerarMatrizQrCode, type Busca, type ProtocoloVisita, type TurnoVisita } from '../domain/types';
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

function proximoDiaUtilISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
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
  const progressoId = useId();
  const respId = useId();
  const telId = useId();
  const dataId = useId();

  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [turnoVisita, setTurnoVisita] = useState<TurnoVisita>('manha');
  const [dataVisita, setDataVisita] = useState<string>(() => proximoDiaUtilISO());
  const [emitindo, setEmitindo] = useState(false);
  const [erroProt, setErroProt] = useState<string | null>(null);
  const [protocoloLocal, setProtocoloLocal] = useState<ProtocoloVisita | null>(null);

  // Sincroniza protocolo emitido para esta escola com o estado ao vivo do servidor (SSE)
  const codigoSalvo = meusCodigos[escolaId];
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

  if (!r) return <p className="aviso-suave">Unidade escolar não encontrada em Patos - PB. Volte e escolha outra 🙂</p>;
  const { escola, oferta, status, distanciaKm } = r;

  const mapa = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${escola.lat},${escola.lng}`)}`;
  const faltando = obrig.filter((d) => !marcados.includes(d.id)).map((d) => `▫️ ${d.nome}`);
  const msgWhats = encodeURIComponent(
    `🎒 *Matrícula Aberta · Patos - PB*\n\n` +
      (protocoloAtivo ? `🎟️ *Protocolo:* ${protocoloAtivo.codigo}\n` : '') +
      `🏫 ${escola.nome}\n📍 ${escola.endereco}\n🕗 ${escola.atendimento}\n` +
      `${STATUS_INFO[status].icone} ${STATUS_INFO[status].frase(oferta.vagas, oferta.fila)} (${ETAPAS[oferta.etapa].nome})\n\n` +
      (faltando.length ? `📋 Ainda falta separar:\n${faltando.join('\n')}\n\n` : '✅ Documentos todos separados!\n\n') +
      `🗺️ Como chegar: ${mapa}`,
  );

  const fala =
    `${escola.nome}, no bairro ${escola.bairro} em Patos, ${escola.endereco}. Atendimento: ${escola.atendimento.replace('·', ',')}. ` +
    `${STATUS_INFO[status].frase(oferta.vagas, oferta.fila)}. Leve estes documentos: ` +
    obrig.map((d) => d.nome).join('; ') +
    '. Você também pode emitir um protocolo digital com QR Code para agilizar o atendimento na secretaria.';

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
      });
      setProtocoloLocal(novo);
      setMeusCodigos((ant) => ({ ...ant, [escola.id]: novo.codigo }));
      toast(`Protocolo ${novo.codigo} emitido e enviado para a secretaria da escola!`, {
        emoji: '🎟️',
        tom: 'ok',
      });
    } catch {
      setErroProt('Não foi possível conectar ao servidor para emitir o protocolo. Tente novamente.');
    } finally {
      setEmitindo(false);
    }
  }

  const matrizQr = useMemo(
    () => (protocoloAtivo ? gerarMatrizQrCode(`${protocoloAtivo.codigo}|${protocoloAtivo.escolaId}`) : []),
    [protocoloAtivo],
  );

  return (
    <section className="etapa" aria-labelledby="t-visita">
      <TituloEtapa
        id="t-visita"
        emoji="✅"
        sticker={folder}
        titulo="Prepare a visita e emita sua senha"
        subtitulo="Confira os documentos da Rede Municipal de Patos - PB e gere seu protocolo digital com QR Code."
        fala={fala}
      />

      <article className={`card-escola card-${status} card-escolhida`}>
        <div className="card-topo">
          <span className="card-avatar" aria-hidden="true">🏫</span>
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
            <dt>🎒 Turma</dt>
            <dd>
              {turma ?? ETAPAS[oferta.etapa].nome} ({oferta.periodo === 'integral' ? 'Integral' : 'Meio período'})
            </dd>
          </div>
          <div>
            <dt>🕗 Atendimento</dt>
            <dd>{escola.atendimento}</dd>
          </div>
          <div>
            <dt>🚶 Distância</dt>
            <dd>
              {formatarDistancia(distanciaKm)} · {minutosAPe(distanciaKm)} min
            </dd>
          </div>
          <div>
            <dt>🔄 Atualizado</dt>
            <dd>{tempoRelativo(escola.atualizadoEm, agora)}</dd>
          </div>
        </dl>
        <div className="acoes-grade">
          <a className="btn btn-primario" href={mapa} target="_blank" rel="noopener">
            <span aria-hidden="true">🗺️</span> Como chegar
          </a>
          <a className="btn btn-secundario" href={`tel:${escola.telefone.replace(/\D/g, '')}`}>
            <span aria-hidden="true">📞</span> {escola.telefone}
          </a>
          <a className="btn btn-whats" href={`https://wa.me/?text=${msgWhats}`} target="_blank" rel="noopener">
            <span aria-hidden="true">💬</span> Enviar no WhatsApp
          </a>
          {status === 'espera' && (
            <button type="button" className="btn btn-secundario" onClick={() => onAlerta(escola.id)}>
              <span aria-hidden="true">🔔</span> Avise-me
            </button>
          )}
        </div>
      </article>

      {/* ================= PROTOCOLO DE PRÉ-AGENDAMENTO COM QR CODE ================= */}
      <div className="protocolo-box">
        <div className="protocolo-cabecalho">
          <div>
            <span className="lp-mini-tag">Atendimento Ágil · Patos - PB</span>
            <h2>🎟️ Protocolo de Pré-Agendamento Presencial</h2>
          </div>
          {protocoloAtivo && (
            <span className={`selo-protocolo selo-prot-${protocoloAtivo.status}`}>
              {protocoloAtivo.status === 'atendido'
                ? '✅ Matrícula confirmada'
                : protocoloAtivo.status === 'cancelado'
                  ? '✕ Cancelado'
                  : '⏳ Aguardando visita'}
            </span>
          )}
        </div>

        {protocoloAtivo ? (
          <div className="protocolo-bilhete" aria-live="polite">
            <div className="protocolo-qr-bloco">
              <svg
                className="protocolo-qr-svg"
                viewBox="0 0 23 23"
                role="img"
                aria-label={`QR Code do protocolo ${protocoloAtivo.codigo}`}
              >
                <rect x="0" y="0" width="23" height="23" fill="#FFFFFF" />
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

              <p className="protocolo-aviso">
                {protocoloAtivo.status === 'atendido' ? (
                  <>
                    🎉 <strong>Atendimento confirmado pela secretaria da unidade!</strong> A vaga foi vinculada ao seu
                    protocolo.
                  </>
                ) : (
                  <>
                    💡 A secretaria da <strong>{escola.nome}</strong> já recebeu seu pré-agendamento em tempo real.
                    Abra o <a href="#/gestao">Painel da Escola</a> para simular a recepção!
                  </>
                )}
              </p>

              <div className="protocolo-acoes">
                <a className="btn btn-whats btn-pequeno" href={`https://wa.me/?text=${msgWhats}`} target="_blank" rel="noopener">
                  💬 Salvar protocolo no WhatsApp
                </a>
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
                  min={new Date().toISOString().slice(0, 10)}
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
                    <span>🌤️ Manhã</span>
                  </label>
                  <label className="chip">
                    <input
                      type="radio"
                      name="turnoVisita"
                      checked={turnoVisita === 'tarde'}
                      onChange={() => setTurnoVisita('tarde')}
                    />
                    <span>☀️ Tarde</span>
                  </label>
                </div>
              </fieldset>
            </div>

            {erroProt && (
              <p className="erro-campo" role="alert">
                <span aria-hidden="true">⚠️</span> {erroProt}
              </p>
            )}

            <button type="submit" className="btn btn-primario btn-largo" disabled={emitindo}>
              <span aria-hidden="true">🎟️</span>{' '}
              {emitindo ? 'Gerando protocolo em Patos - PB…' : 'Emitir protocolo com QR Code'}
            </button>
          </form>
        )}
      </div>

      {/* ================= CHECKLIST DE DOCUMENTOS ================= */}
      <div className="checklist">
        <div className="checklist-topo">
          <h2 id={progressoId}>📋 Checklist de documentos (Patos - PB)</h2>
          <span className="checklist-contagem">
            {feitos}/{obrig.length}
          </span>
        </div>
        <progress className="barra-progresso" max={Math.max(1, obrig.length)} value={feitos} aria-labelledby={progressoId} />
        <p className="checklist-sub">
          {completo
            ? '🎉 Tudo pronto! Seus documentos obrigatórios estão completos.'
            : 'Marque os documentos que você já separou. Fica salvo no seu celular.'}
        </p>

        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id}>
              <label className={`doc ${marcados.includes(d.id) ? 'doc-ok' : ''}`}>
                <input type="checkbox" checked={marcados.includes(d.id)} onChange={() => alternar(d.id)} />
                <span className="doc-check" aria-hidden="true" />
                <span className="doc-emoji" aria-hidden="true">{d.emoji}</span>
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
      </div>

      <DicaAjudante ativo={ajudante}>
        Tire foto dos documentos com o celular e emita o protocolo acima — assim a secretaria da escola em Patos já
        adia a conferência na chegada.
      </DicaAjudante>

      <div className="como-funciona">
        <h2>Como funciona o atendimento presencial em Patos - PB?</h2>
        <ol>
          <li>
            <span aria-hidden="true">🎟️</span> Apresente o <strong>QR Code do protocolo</strong> e os documentos na
            secretaria da unidade.
          </li>
          <li>
            <span aria-hidden="true">⏱️</span> Com o protocolo pré-agendado, a conferência leva menos de 10 minutos.
          </li>
          <li>
            <span aria-hidden="true">📲</span> A secretaria confirma o protocolo no painel e a vaga é atualizada em
            tempo real.
          </li>
        </ol>
      </div>

      {festa && (
        <div className="confete" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ ['--i' as string]: i }}>
              {['🎉', '⭐', '🎈', '✨'][i % 4]}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
