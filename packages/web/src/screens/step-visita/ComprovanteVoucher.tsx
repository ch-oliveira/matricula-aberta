import { Icone } from '../../components/Icone';
import type { Escola, ProtocoloVisita } from '../../domain/types';

interface Props {
  protocolo: ProtocoloVisita;
  escola: Escola;
  matrizQr: boolean[][];
  confirmandoCancelamento: boolean;
  setConfirmandoCancelamento: (v: boolean) => void;
  cancelando: boolean;
  onExecutarCancelamento: () => void;
  onBaixarCartaoImagem: () => void;
  msgWhatsComprovante: string;
  onEmitirOutroProtocolo: () => void;
}

function formatarDataBR(iso: string): string {
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

export function ComprovanteVoucher({
  protocolo,
  escola,
  matrizQr,
  confirmandoCancelamento,
  setConfirmandoCancelamento,
  cancelando,
  onExecutarCancelamento,
  onBaixarCartaoImagem,
  msgWhatsComprovante,
  onEmitirOutroProtocolo,
}: Props) {
  return (
    <div className="protocolo-bilhete" aria-live="polite">
      <div className="protocolo-qr-bloco">
        <svg
          className="protocolo-qr-svg"
          viewBox={`0 0 ${matrizQr.length + 2} ${matrizQr.length + 2}`}
          role="img"
          aria-label={`QR Code do protocolo ${protocolo.codigo}`}
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
          <strong className="protocolo-codigo">{protocolo.codigo}</strong>
        </div>
        <dl className="protocolo-meta">
          <div>
            <dt>Responsável</dt>
            <dd>{protocolo.responsavel}</dd>
          </div>
          <div>
            <dt>Data e turno previsto</dt>
            <dd>
              {formatarDataBR(protocolo.dataVisita)} ·{' '}
              {protocolo.turnoVisita === 'manha' ? 'Manhã (7h30–11h30)' : 'Tarde (13h30–17h)'}
            </dd>
          </div>
          <div>
            <dt>Turma solicitada</dt>
            <dd>
              {protocolo.turma} ({protocolo.periodo === 'integral' ? 'Integral' : 'Parcial'})
            </dd>
          </div>
          <div>
            <dt>Checklist de documentos</dt>
            <dd>
              {protocolo.documentosMarcados.length}/{protocolo.totalObrigatorios} separados
            </dd>
          </div>
        </dl>

        {protocolo.pontosPrioridade !== undefined && protocolo.pontosPrioridade > 0 && (
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
            <strong>⚖️ Prioridade Regulatória: {protocolo.pontosPrioridade} pontos</strong>
            <div style={{ fontSize: '0.78rem', marginTop: '2px', color: '#4F46E5' }}>
              Critérios legais declarados para auditoria da fila pública. Apresente os comprovantes no comparecimento.
            </div>
          </div>
        )}

        {protocolo.reservaVaga && protocolo.status === 'aguardando' && (
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
              <strong>{formatarDataBR(protocolo.dataVisita)}</strong> às{' '}
              <strong>{protocolo.turnoVisita === 'manha' ? '12h30' : '18h00'}</strong> (fim do turno).
              Após este horário, se não houver comparecimento, o agendamento expira e a vaga retorna para a rede.
            </div>
          </div>
        )}

        {!protocolo.reservaVaga && protocolo.status === 'aguardando' && (
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
              <strong>{protocolo.posicaoFila ?? 1}º lugar</strong> na lista de espera oficial para{' '}
              {protocolo.turma} nesta unidade. A secretaria chamará conforme ordem cronológica.
            </div>
          </div>
        )}

        {protocolo.status === 'cancelado' && (
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
              {protocolo.motivoCancelamento === 'expirado_sem_comparecimento'
                ? 'O prazo limite de comparecimento encerrou. A vaga pré-reservada foi devolvida para a rede escolar.'
                : protocolo.motivoCancelamento === 'cancelado_cidadao'
                  ? 'Este agendamento foi cancelado por você. A vaga foi liberada imediatamente para outra família.'
                  : 'Este agendamento foi cancelado. A vaga reservada retornou para o quadro de vagas.'}
            </div>
          </div>
        )}

        <p className="protocolo-aviso">
          {protocolo.status === 'atendido' ? (
            <>
              <Icone nome="sparkles" tamanho={16} />{' '}
              <strong>Atendimento confirmado pela secretaria da unidade!</strong> A vaga foi efetivada e
              vinculada à criança.
            </>
          ) : protocolo.status === 'cancelado' ? (
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

        {confirmandoCancelamento && protocolo.status === 'aguardando' && (
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
                onClick={onExecutarCancelamento}
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
            onClick={onBaixarCartaoImagem}
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
          <a
            className="btn btn-whats btn-pequeno"
            href={`https://wa.me/?text=${msgWhatsComprovante}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Enviar dados completos do protocolo e link para recuperar no WhatsApp"
          >
            <Icone nome="message" tamanho={15} /> Enviar Comprovante no WhatsApp
          </a>
          {protocolo.status === 'aguardando' && !confirmandoCancelamento && (
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
            onClick={onEmitirOutroProtocolo}
          >
            Emitir outro protocolo
          </button>
        </div>
      </div>
    </div>
  );
}

