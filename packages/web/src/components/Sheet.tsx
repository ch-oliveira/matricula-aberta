import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icone } from './Icone';

interface Props {
  open: boolean;
  onClose: () => void;
  titulo: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
}

/**
 * Bottom-sheet acessível baseado no <dialog> nativo:
 * foco, Esc, gesto de voltar e inércia da página vêm de graça do navegador.
 */
export function Sheet({ open, onClose, titulo, children, rodape }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Fallback de "light dismiss" para navegadores sem suporte a closedby (ex.: Safari).
  useEffect(() => {
    const d = ref.current;
    if (!d || 'closedBy' in HTMLDialogElement.prototype) return;
    const fora = (e: PointerEvent) => {
      const r = d.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressionouFora = false;
    const down = (e: PointerEvent) => (pressionouFora = fora(e));
    const up = (e: PointerEvent) => {
      if (pressionouFora && fora(e)) d.close();
    };
    d.addEventListener('pointerdown', down);
    d.addEventListener('pointerup', up);
    return () => {
      d.removeEventListener('pointerdown', down);
      d.removeEventListener('pointerup', up);
    };
  }, []);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby={tituloId} onClose={onClose} {...{ closedby: 'any' }}>
      <div className="sheet-alca" aria-hidden="true" />
      <header className="sheet-topo">
        <h2 id={tituloId}>{titulo}</h2>
        <button type="button" className="btn-icone" aria-label="Fechar" onClick={() => ref.current?.close()}>
          <Icone nome="x" tamanho={18} />
        </button>
      </header>
      <div className="sheet-corpo">{children}</div>
      {rodape && <footer className="sheet-rodape">{rodape}</footer>}
    </dialog>
  );
}

