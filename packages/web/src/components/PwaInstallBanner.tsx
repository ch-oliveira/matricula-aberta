import { useEffect, useState } from 'react';
import { toast } from './Toasts';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [mostrarGuiaIos, setMostrarGuiaIos] = useState(false);

  useEffect(() => {
    // Se o aplicativo já estiver rodando instalado em modo standalone, não exibe
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    const dispensado = sessionStorage.getItem('ma:pwa-dismissed');
    if (dispensado === 'true') {
      return;
    }

    // Escuta o evento nativo do Chrome/Edge/Android
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisivel(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // No iOS Safari não há o evento 'beforeinstallprompt'
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIos) {
      // Exibe sutilmente após 2 segundos no iPhone
      const timer = setTimeout(() => {
        setVisivel(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!visivel) return null;

  async function handleInstalar() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          toast('Aplicativo instalado com sucesso na sua tela de início!', { tom: 'ok', emoji: 'sparkles' });
          setVisivel(false);
        }
      } catch {
        /* ignore */
      }
      setDeferredPrompt(null);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setMostrarGuiaIos(true);
      return;
    }

    toast('Para instalar, abra o menu de 3 pontos do navegador e selecione "Instalar aplicativo".', { tom: 'info', emoji: 'info' });
  }

  function handleDispensar() {
    setVisivel(false);
    sessionStorage.setItem('ma:pwa-dismissed', 'true');
  }

  return (
    <>
      <aside
        role="region"
        aria-label="Instalar aplicativo"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          right: '16px',
          maxWidth: '540px',
          margin: '0 auto',
          zIndex: 9000,
          background: '#FFD24C',
          color: '#181528',
          border: '3px solid #181528',
          borderRadius: '16px',
          boxShadow: '4px 4px 0 #181528',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          animation: 'pwaSlideUp 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <img
            src="/icon-192.png"
            alt="Ícone Matrícula PB"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              border: '2px solid #181528',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.2 }}>
              Baixar App Matrícula PB
            </div>
            <div style={{ fontSize: '0.78rem', color: '#3A3347', marginTop: '2px' }}>
              Acesso rápido e offline às vagas da sua região
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleInstalar}
            style={{
              background: '#5B3FD9',
              color: '#FFFFFF',
              border: '2px solid #181528',
              borderRadius: '10px',
              boxShadow: '2px 2px 0 #181528',
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={handleDispensar}
            aria-label="Fechar aviso"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              fontWeight: 900,
              color: '#181528',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </aside>

      {mostrarGuiaIos && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(24, 21, 40, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setMostrarGuiaIos(false)}
        >
          <div
            style={{
              background: '#FFF8EE',
              color: '#181528',
              border: '3px solid #181528',
              borderRadius: '20px',
              boxShadow: '6px 6px 0 #181528',
              padding: '20px',
              maxWidth: '420px',
              width: '100%',
              marginBottom: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>Como instalar no iPhone (iOS)</div>
              <button
                type="button"
                onClick={() => setMostrarGuiaIos(false)}
                style={{
                  background: '#FF6B4A',
                  color: '#fff',
                  border: '2px solid #181528',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <ol style={{ paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.6, margin: '10px 0 16px' }}>
              <li>
                No Safari do iPhone, toque no botão de <strong>Compartilhar</strong> (ícone de um quadrado com uma seta para cima na barra inferior).
              </li>
              <li>Role para baixo até encontrar a opção <strong>"Adicionar à Tela de Início"</strong> (ícone ➕).</li>
              <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
            </ol>
            <button
              type="button"
              onClick={() => setMostrarGuiaIos(false)}
              style={{
                width: '100%',
                background: '#5B3FD9',
                color: '#fff',
                border: '2px solid #181528',
                borderRadius: '12px',
                padding: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '3px 3px 0 #181528',
              }}
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
