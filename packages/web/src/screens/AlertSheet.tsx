import { useId, useState, type FormEvent } from 'react';
import { Sheet } from '../components/Sheet';
import { toast } from '../components/Toasts';
import { ETAPAS } from '../domain/etapas';
import type { Busca } from '../domain/types';
import { alertasStore, mascararTelefone, pedirPermissaoPush, useAlertas, type Canal } from '../services/alertas';
import { useEscolas } from '../services/vagasStore';

interface Props {
  open: boolean;
  onClose: () => void;
  busca: Busca;
  escolaId?: string;
}

export function AlertSheet({ open, onClose, busca, escolaId }: Props) {
  const escolas = useEscolas();
  const alertas = useAlertas();
  const escola = escolas.find((e) => e.id === escolaId);
  const [canal, setCanal] = useState<Canal>('whatsapp');
  const [tel, setTel] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState(false);
  const telId = useId();
  const erroId = useId();
  const etapa = busca.etapa ? ETAPAS[busca.etapa] : null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!busca.etapa || !busca.local) return;
    if (canal === 'whatsapp' && tel.replace(/\D/g, '').length < 10) {
      setErro('Digite o celular com DDD (ex.: (83) 99612-3456).');
      document.getElementById(telId)?.focus();
      return;
    }
    if (!aceite) {
      setErro('Para avisar você, precisamos da sua autorização (caixinha abaixo).');
      return;
    }
    if (canal === 'push') {
      const ok = await pedirPermissaoPush();
      if (!ok) {
        setErro('O navegador bloqueou as notificações. Tente pelo WhatsApp.');
        return;
      }
    }
    alertasStore.criar({
      canal,
      telefone: canal === 'whatsapp' ? tel : undefined,
      etapa: busca.etapa,
      periodo: busca.periodo,
      local: busca.local,
      raioKm: busca.raioKm,
      escolaId: escola?.id,
      escolaNome: escola?.nome,
    });
    setErro(null);
    setCriado(true);
    toast('Alerta registrado na Rede Municipal de Patos - PB!', { emoji: '🔔', tom: 'ok' });
  }

  function fechar() {
    setCriado(false);
    setErro(null);
    onClose();
  }

  const alvo = escola ? escola.nome : `unidades até ${busca.raioKm} km de ${busca.local?.rotulo} (Patos - PB)`;

  return (
    <Sheet open={open} onClose={fechar} titulo="🔔 Me avise quando abrir vaga">
      {criado ? (
        <div className="alerta-ok">
          <p className="alerta-ok-emoji" aria-hidden="true">🎉</p>
          <p>
            <strong>Alerta gravado no servidor!</strong> Assim que abrir vaga de {etapa?.nome} em {alvo}, você recebe
            uma mensagem assim:
          </p>
          <div className={`bolha ${canal === 'whatsapp' ? 'bolha-whats' : 'bolha-push'}`}>
            <strong>{canal === 'whatsapp' ? 'Matrícula Aberta · Patos-PB 🎒' : '🔔 Matrícula Aberta · Patos-PB'}</strong>
            <p>
              Oba! Abriu 1 vaga de {etapa?.nome} na {escola?.nome ?? 'Creche Municipal Tia Luci'} em Patos - PB. Toque
              para emitir seu protocolo de visita 👉
            </p>
          </div>
          <p className="legenda">
            Você pode cancelar a qualquer momento respondendo SAIR ou aqui no aplicativo. O alerta expira automaticamente
            em 90 dias (LGPD).
          </p>
          <button type="button" className="btn btn-primario btn-largo" onClick={fechar}>
            Entendi
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          <p className="alerta-alvo">
            <span aria-hidden="true">{etapa?.emoji}</span> <strong>{etapa?.nome}</strong> em <strong>{alvo}</strong>
          </p>

          <fieldset className="grupo">
            <legend>Como prefere ser avisado?</legend>
            <div className="opcoes-canal">
              <label className="opcao-canal">
                <input
                  type="radio"
                  name="canal"
                  value="whatsapp"
                  checked={canal === 'whatsapp'}
                  onChange={() => setCanal('whatsapp')}
                />
                <span className="opcao-emoji" aria-hidden="true">💬</span>
                <span>
                  <strong>WhatsApp</strong>
                  <small>Mensagem no seu celular</small>
                </span>
              </label>
              <label className="opcao-canal">
                <input
                  type="radio"
                  name="canal"
                  value="push"
                  checked={canal === 'push'}
                  onChange={() => setCanal('push')}
                />
                <span className="opcao-emoji" aria-hidden="true">📲</span>
                <span>
                  <strong>Notificação</strong>
                  <small>Sem informar telefone</small>
                </span>
              </label>
            </div>
          </fieldset>

          {canal === 'whatsapp' && (
            <div className="campo">
              <label htmlFor={telId}>Celular com DDD (ex.: 83)</label>
              <input
                id={telId}
                name="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(83) 99612-3456"
                value={tel}
                onChange={(e) => {
                  setTel(mascararTelefone(e.target.value));
                  setErro(null);
                }}
                aria-describedby={erro ? erroId : undefined}
                enterKeyHint="done"
              />
            </div>
          )}

          <label className="toggle-linha toggle-aceite">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => {
                setAceite(e.target.checked);
                setErro(null);
              }}
            />
            <span>
              <strong>Autorizo receber avisos de vagas da Rede Municipal de Patos - PB</strong>
              <small>Usamos seu contato exclusivamente para alerta de vaga escolar (LGPD).</small>
            </span>
          </label>

          {erro && (
            <p id={erroId} className="erro-campo" role="alert">
              <span aria-hidden="true">⚠️</span> {erro}
            </p>
          )}

          <button type="submit" className="btn btn-primario btn-largo">
            <span aria-hidden="true">🔔</span> Criar alerta
          </button>

          {alertas.length > 0 && (
            <div className="meus-alertas">
              <h3>Alertas ativos na rede ({alertas.length})</h3>
              <ul>
                {alertas.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <span>
                      {a.canal === 'whatsapp' ? '💬' : '📲'} {ETAPAS[a.etapa].nome} ·{' '}
                      {a.escolaNome ?? `${a.raioKm} km de ${a.local.rotulo}`}
                      {a.telefone ? ` (${a.telefone})` : ''}
                    </span>
                    <button type="button" className="link-sutil" onClick={() => alertasStore.remover(a.id)}>
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}
    </Sheet>
  );
}
