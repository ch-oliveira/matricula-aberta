import { useCallback, useEffect, useState } from 'react';

/** Estado persistido em localStorage (funciona offline). */
export function usePersistido<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? (JSON.parse(raw) as T) : inicial;
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      /* ignore */
    }
  }, [chave, valor]);
  return [valor, setValor] as const;
}

/** Relógio que "anda" para atualizar textos como "há 3 min". */
export function useAgora(intervalo = 30_000) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return agora;
}

/** 🔊 Leitura em voz alta (Web Speech API). */
export function useFala() {
  const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [falando, setFalando] = useState(false);

  const falar = useCallback(
    (texto: string) => {
      if (!suportado) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR';
      u.rate = 0.95;
      const voz = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (voz) u.voice = voz;
      u.onend = () => setFalando(false);
      u.onerror = () => setFalando(false);
      setFalando(true);
      window.speechSynthesis.speak(u);
    },
    [suportado],
  );

  const parar = useCallback(() => {
    if (!suportado) return;
    window.speechSynthesis.cancel();
    setFalando(false);
  }, [suportado]);

  return { suportado, falando, falar, parar };
}

export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

/**
 * Alternador de tema (claro/escuro) sincronizado com <meta name="color-scheme">
 * seguindo o padrão de dois estados (sistema vs. override explícito).
 */
export function useTema() {
  const resolver = useCallback((): 'light' | 'dark' => {
    try {
      const salvo = localStorage.getItem('color-scheme');
      if (salvo === 'light' || salvo === 'dark') return salvo;
    } catch {
      /* ignore */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const [tema, setTema] = useState<'light' | 'dark'>(resolver);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    const sincronizar = () => {
      try {
        const salvo = localStorage.getItem('color-scheme');
        if (meta) meta.content = salvo ?? 'light dark';
      } catch {
        /* ignore */
      }
      setTema(resolver());
    };
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      mql.removeEventListener('change', sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, [resolver]);

  const alternarTema = useCallback(() => {
    const atual = resolver();
    const alvo: 'light' | 'dark' = atual === 'dark' ? 'light' : 'dark';
    const sistema: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    try {
      if (alvo !== sistema) {
        localStorage.setItem('color-scheme', alvo);
        if (meta) meta.content = alvo;
      } else {
        localStorage.removeItem('color-scheme');
        if (meta) meta.content = 'light dark';
      }
    } catch {
      if (meta) meta.content = alvo;
    }
    setTema(alvo);
  }, [resolver]);

  return { tema, alternarTema };
}


