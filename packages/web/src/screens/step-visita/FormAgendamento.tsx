import type { FormEvent } from 'react';
import { Icone } from '../../components/Icone';
import { mascararTelefone } from '../../services/alertas';
import {
  dataLocalISO,
  formatarCpfOuCertidao,
  LISTA_CRITERIOS_VULNERABILIDADE,
  validarCpf,
  type CriterioVulnerabilidadeId,
  type TurnoVisita,
} from '../../domain/types';

interface Props {
  respId: string;
  docEstudanteId: string;
  telId: string;
  dataId: string;
  responsavel: string;
  setResponsavel: (v: string) => void;
  documentoEstudante: string;
  setDocumentoEstudante: (v: string) => void;
  telefone: string;
  setTelefone: (v: string) => void;
  dataVisita: string;
  setDataVisita: (v: string) => void;
  turnoVisita: TurnoVisita;
  setTurnoVisita: (v: TurnoVisita) => void;
  criteriosSelecionados: CriterioVulnerabilidadeId[];
  setCriteriosSelecionados: React.Dispatch<React.SetStateAction<CriterioVulnerabilidadeId[]>>;
  erroProt: string | null;
  setErroProt: (v: string | null) => void;
  emitindo: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function FormAgendamento({
  respId,
  docEstudanteId,
  telId,
  dataId,
  responsavel,
  setResponsavel,
  documentoEstudante,
  setDocumentoEstudante,
  telefone,
  setTelefone,
  dataVisita,
  setDataVisita,
  turnoVisita,
  setTurnoVisita,
  criteriosSelecionados,
  setCriteriosSelecionados,
  erroProt,
  setErroProt,
  emitindo,
  onSubmit,
}: Props) {
  return (
    <form className="protocolo-form" onSubmit={onSubmit} noValidate>
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
          {(() => {
            const d = documentoEstudante.replace(/\D/g, '');
            if (d.length === 11) {
              const valido = validarCpf(d);
              return (
                <small
                  style={{
                    fontSize: '0.78rem',
                    color: valido ? '#166534' : '#B91C1C',
                    fontWeight: 600,
                    marginTop: '4px',
                    display: 'block',
                  }}
                >
                  {valido
                    ? '✓ CPF válido verificado pelos dígitos oficiais.'
                    : '⚠️ CPF inválido: confira se os 11 dígitos foram digitados corretamente.'}
                </small>
              );
            }
            return (
              <small style={{ fontSize: '0.78rem', color: '#676479', marginTop: '4px', display: 'block' }}>
                Garante a vaga única da criança na rede municipal (evita duplicidades).
              </small>
            );
          })()}
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
  );
}
