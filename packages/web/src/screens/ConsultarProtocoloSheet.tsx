import { useId, useState, type FormEvent } from 'react';
import { Icone } from '../components/Icone';
import { Sheet } from '../components/Sheet';
import { toast } from '../components/Toasts';
import { extrairCodigoProtocolo } from '../domain/qr';
import { vagasStore } from '../services/vagasStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onProtocoloEncontrado: (escolaId: string, codigo: string) => void;
}

export function ConsultarProtocoloSheet({ open, onClose, onProtocoloEncontrado }: Props) {
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputId = useId();

  async function consultar(e: FormEvent) {
    e.preventDefault();
    const codLimpo = extrairCodigoProtocolo(codigo);
    if (!codLimpo || codLimpo.length < 5) {
      setErro('Digite um código de protocolo válido (ex.: PATOS-2027-4821).');
      return;
    }

    setBuscando(true);
    setErro(null);

    try {
      const protocolo = await vagasStore.buscarProtocoloPorCodigo(codLimpo);
      if (!protocolo) {
        setErro(`Protocolo "${codLimpo}" não foi localizado na base de Patos - PB. Confira os dígitos.`);
        return;
      }

      toast(`Protocolo ${protocolo.codigo} localizado com sucesso!`, {
        emoji: 'check-circle',
        tom: 'ok',
      });
      onProtocoloEncontrado(protocolo.escolaId, protocolo.codigo);
      setCodigo('');
      onClose();
    } catch {
      setErro('Erro de conexão ao buscar protocolo. Tente novamente.');
    } finally {
      setBuscando(false);
    }
  }

  function fechar() {
    setErro(null);
    setCodigo('');
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={fechar}
      titulo={
        <>
          <Icone nome="ticket" tamanho={18} /> Consultar ou Recuperar Protocolo
        </>
      }
    >
      <form onSubmit={consultar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p className="legenda" style={{ margin: 0, lineHeight: 1.45 }}>
          Já agendou uma visita e quer visualizar sua senha, QR Code ou checklist em outro celular ou computador? Digite o código oficial emitido pelo sistema:
        </p>

        <div className="campo">
          <label htmlFor={inputId}>Número do Protocolo (PATOS-AAAA-XXXX)</label>
          <input
            id={inputId}
            type="text"
            placeholder="Ex.: PATOS-2027-4821"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setErro(null);
            }}
            autoCapitalize="characters"
            autoCorrect="off"
            style={{ fontWeight: 700, letterSpacing: '0.5px' }}
          />
        </div>

        {erro && (
          <p className="erro-campo" role="alert">
            <Icone nome="alert-triangle" tamanho={16} /> {erro}
          </p>
        )}

        <button type="submit" className="btn btn-primario btn-largo" disabled={buscando}>
          <Icone nome="search" tamanho={16} />
          <span>{buscando ? 'Buscando protocolo em Patos…' : 'Localizar meu Protocolo'}</span>
        </button>

        <p className="legenda" style={{ fontSize: '0.82rem', color: '#676479', margin: 0 }}>
          💡 Dica: O número do protocolo foi enviado no comprovante gerado ou no WhatsApp da família.
        </p>
      </form>
    </Sheet>
  );
}

