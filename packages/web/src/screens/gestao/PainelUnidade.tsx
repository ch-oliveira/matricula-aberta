import { useId } from 'react';
import { Icone, IconeEtapa } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import { ETAPAS } from '../../domain/etapas';
import { desatualizado, tempoRelativo } from '../../domain/geo';
import {
  dataLocalISO,
  gerarCsv,
  type Escola,
  type ProtocoloVisita,
} from '../../domain/types';
import { useAgora } from '../../hooks';
import { useHistorico, useProtocolos, vagasStore } from '../../services/vagasStore';
import { LinhaOferta } from './ControlesOferta';

interface Props {
  escola: Escola;
  escolas: Escola[];
  podeTrocarLivremente: boolean;
  onTrocarEscola: (id: string) => void;
  onAbrirLeitor?: () => void;
  onSair: () => void;
}

export function PainelUnidade({
  escola,
  escolas,
  podeTrocarLivremente,
  onTrocarEscola,
  onAbrirLeitor,
  onSair,
}: Props) {
  const agora = useAgora(15_000);
  const historico = useHistorico().filter((h) => h.escolaId === escola.id);
  const protocolos = useProtocolos().filter((p) => p.escolaId === escola.id);
  const velho = desatualizado(escola.atualizadoEm, agora);
  const totalVagas = escola.ofertas.reduce((s, o) => s + o.vagas, 0);
  const totalFila = escola.ofertas.reduce((s, o) => s + o.fila, 0);
  const aguardandoAlerta = escola.alertasAtivos ?? 0;
  const protPendentes = protocolos.filter((p) => p.status === 'aguardando');
  const seletorId = useId();

  function exportarProtocolosUnidadeCsv() {
    const cabecalhos = [
      'Código',
      'Etapa',
      'Turma',
      'Período',
      'Responsável',
      'Telefone',
      'Data da Visita',
      'Turno',
      'Documentos Marcados',
      'Total Obrigatórios',
      'Status',
      'Reserva de Vaga',
      'Posição na Fila',
      'Data de Emissão',
    ];
    const linhas = protocolos.map((p) => [
      p.codigo,
      p.etapa,
      p.turma,
      p.periodo,
      p.responsavel,
      p.telefone ?? '',
      p.dataVisita,
      p.turnoVisita,
      p.documentosMarcados.length,
      p.totalObrigatorios,
      p.status,
      p.reservaVaga ? 'Sim (Vaga Pré-Reservada)' : 'Não (Fila de Espera)',
      p.posicaoFila ?? '',
      new Date(p.criadoEm).toLocaleString('pt-BR'),
    ]);
    const blob = new Blob([gerarCsv(cabecalhos, linhas)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protocolos-${escola.id}-${dataLocalISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast(`Planilha da unidade baixada!`, { emoji: 'check-circle', tom: 'ok' });
  }

  return (
    <>
      <section className="painel-cabecalho">
        <div>
          <div className="seletor-unidade-rapido">
            <label htmlFor={seletorId}>Unidade ativa em Patos - PB:</label>
            <select
              id={seletorId}
              value={escola.id}
              onChange={(e) => onTrocarEscola(e.target.value)}
              title={
                podeTrocarLivremente
                  ? 'Alternar unidade (sessão SEDUC ativa)'
                  : 'Trocar de unidade exigirá o PIN da outra escola'
              }
            >
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
          <button
            type="button"
            className="btn btn-fantasma btn-pequeno"
            onClick={onSair}
            title="Encerrar sessão desta unidade escolar"
          >
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
            <div className="acoes-botoes-topo">
              <button
                type="button"
                className="btn btn-secundario btn-pequeno"
                onClick={exportarProtocolosUnidadeCsv}
                title="Exportar protocolos desta unidade escolar em CSV"
              >
                <Icone nome="file-text" tamanho={15} />
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primario btn-pequeno btn-escanear-qr"
                onClick={onAbrirLeitor}
                title="Abrir câmera para escanear QR Code do voucher presencial"
              >
                <Icone nome="qr-code" tamanho={16} />
                <span>Escanear QR Code</span>
              </button>
            </div>
          )}
        </div>

        {/* Controle de Capacidade de Atendimento Presencial por Turno */}
        {(() => {
          const LIMITE_TURNO = 15;
          const qtdManha = protPendentes.filter((p) => p.turnoVisita === 'manha').length;
          const qtdTarde = protPendentes.filter((p) => p.turnoVisita === 'tarde').length;
          const percManha = Math.min(100, Math.round((qtdManha / LIMITE_TURNO) * 100));
          const percTarde = Math.min(100, Math.round((qtdTarde / LIMITE_TURNO) * 100));

          return (
            <div className="capacidade-turnos-grid">
              <div className="capacidade-turno-card">
                <div className="capacidade-turno-topo">
                  <strong className="capacidade-turno-titulo">
                    <Icone nome="cloud-sun" tamanho={15} /> Turno Manhã (07h30–11h30)
                  </strong>
                  <span className={`capacidade-turno-senhas ${qtdManha >= 12 ? 'texto-perigo' : 'texto-ok'}`}>
                    {qtdManha} / {LIMITE_TURNO} senhas
                  </span>
                </div>
                <div className="capacidade-turno-trilho">
                  <div
                    className={`capacidade-turno-barra ${qtdManha >= 12 ? 'barra-perigo' : 'barra-sucesso'}`}
                    style={{ width: `${percManha}%` }}
                  />
                </div>
              </div>

              <div className="capacidade-turno-card">
                <div className="capacidade-turno-topo">
                  <strong className="capacidade-turno-titulo">
                    <Icone nome="sun" tamanho={15} /> Turno Tarde (13h30–17h00)
                  </strong>
                  <span className={`capacidade-turno-senhas ${qtdTarde >= 12 ? 'texto-perigo' : 'texto-ok'}`}>
                    {qtdTarde} / {LIMITE_TURNO} senhas
                  </span>
                </div>
                <div className="capacidade-turno-trilho">
                  <div
                    className={`capacidade-turno-barra ${qtdTarde >= 12 ? 'barra-perigo' : 'barra-sucesso'}`}
                    style={{ width: `${percTarde}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

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
                    {p.reservaVaga && p.status === 'aguardando' && (
                      <span
                        className="status-fila-badge status-reservada"
                        title="Vaga pré-reservada aguardando confirmação presencial"
                      >
                        <span className="status-fila-ponto" aria-hidden="true" />
                        Pré-Reservada
                      </span>
                    )}
                    {p.motivoCancelamento === 'expirado_sem_comparecimento' && (
                      <span className="badge-expirado-aviso">
                        ⌛ Expirado (Vaga Devolvida)
                      </span>
                    )}
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
                        try {
                          await vagasStore.atualizarStatusProtocolo(p.codigo, 'atendido');
                          toast(`Matrícula do protocolo ${p.codigo} confirmada com sucesso!`, {
                            emoji: 'check-circle',
                            tom: 'ok',
                          });
                        } catch (err) {
                          toast(err instanceof Error ? err.message : 'Falha ao confirmar matrícula.', {
                            emoji: 'alert-triangle',
                            tom: 'aviso',
                          });
                        }
                      }}
                    >
                      <Icone nome="check" tamanho={15} /> Confirmar matrícula
                    </button>
                    <button
                      type="button"
                      className="btn btn-fantasma btn-pequeno"
                      onClick={async () => {
                        try {
                          await vagasStore.atualizarStatusProtocolo(p.codigo, 'cancelado');
                          toast(
                            `Protocolo ${p.codigo} cancelado. Se havia vaga pré-reservada, ela retornou para a escola.`,
                            { emoji: 'info', tom: 'aviso' },
                          );
                        } catch (err) {
                          toast(err instanceof Error ? err.message : 'Falha ao cancelar protocolo.', {
                            emoji: 'alert-triangle',
                            tom: 'aviso',
                          });
                        }
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
          onClick={async () => {
            try {
              await vagasStore.confirmarDados(escola.id);
              toast('Quadro de vagas confirmado com sucesso!', { emoji: 'check-circle', tom: 'ok' });
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Falha ao confirmar dados.', {
                emoji: 'alert-triangle',
                tom: 'aviso',
              });
            }
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

