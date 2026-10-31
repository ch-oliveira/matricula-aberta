import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * Normaliza siglas, horários e pontuações para que a leitura em voz alta
 * soe fluida, acolhedora e natural em português brasileiro.
 */
export function humanizarTextoParaFala(texto: string): string {
  return texto
    .replace(/Patos\s*[-–·]\s*PB/gi, 'Patos, na Paraíba')
    .replace(/\bCMEI\b/g, 'Creche Municipal')
    .replace(/\bEMEI\b/g, 'Pré-escola Municipal')
    .replace(/\bEMEF\b/g, 'Escola Municipal')
    .replace(/\bFund\.\s*I\b/gi, 'Ensino Fundamental um')
    .replace(/\bFund\.\s*II\b/gi, 'Ensino Fundamental dois')
    .replace(/\bFundamental\s+I\b/g, 'Ensino Fundamental um')
    .replace(/\bFundamental\s+II\b/g, 'Ensino Fundamental dois')
    .replace(/\b1º\s+ao\s+5º\s+ano\b/gi, 'do primeiro ao quinto ano')
    .replace(/\b6º\s+ao\s+9º\s+ano\b/gi, 'do sexto ao nono ano')
    .replace(/\bQR\s*Code\b/gi, 'código Q R')
    .replace(/\bCPF\b/g, 'C P F')
    .replace(/\bRG\b/g, 'R G')
    .replace(/\bSUS\b/g, 'S U S')
    .replace(/\bUBS\b/g, 'Posto de Saúde')
    .replace(/\bSEDUC\b/g, 'Secretaria de Educação')
    .replace(/\bSeg\s+a\s+sex\b/gi, 'de segunda a sexta')
    .replace(/(\d{1,2})h30\b/gi, '$1 e meia')
    .replace(/(\d{1,2})h\s*(?:às|a|-|–)\s*(\d{1,2})h\b/gi, 'das $1 às $2 horas')
    .replace(/(\d{1,2})h\b/gi, '$1 horas')
    .replace(/(\d+)\s*km\b/gi, '$1 quilômetros')
    .replace(/\s*[·;]\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

const VOZES_ROBOTICAS_PENALIZADAS =
  /eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|espeak|compact/i;

/**
 * Seleciona a voz mais humana e natural disponível no navegador para pt-BR,
 * descartando vozes caricatas/sintéticas do sistema (ex.: Eddy, Flo, Grandpa).
 */
function escolherMelhorVozPtBr(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const vozes = window.speechSynthesis.getVoices();
  if (!vozes.length) return null;

  const candidatas = vozes.filter((v) => v.lang.toLowerCase().startsWith('pt'));
  if (!candidatas.length) return null;

  let melhor = candidatas[0];
  let maiorNota = -9999;

  for (const v of candidatas) {
    const lang = v.lang.toLowerCase().replace('_', '-');
    const nome = `${v.name} ${v.voiceURI}`.toLowerCase();
    let nota = 0;

    // Prioridade máxima para Português do Brasil (pt-BR) sobre pt-PT
    if (lang === 'pt-br' || lang.startsWith('pt-br')) nota += 120;
    else if (lang.startsWith('pt')) nota += 20;

    // Penaliza fortemente vozes robóticas/caricatas do macOS/sistema
    if (VOZES_ROBOTICAS_PENALIZADAS.test(nome)) nota -= 300;

    // Bônus para vozes neurais e naturais modernas
    if (/natural|neural|online/i.test(nome)) nota += 95;
    if (/francisca|thalita|antonio|leila|julio/i.test(nome)) nota += 85;
    if (/google\s+portugu[eê]s\s+do\s+brasil/i.test(nome)) nota += 80;
    if (/premium|enhanced|aprimorada/i.test(nome)) nota += 65;
    if (/luciana|felipe|fernanda|caterin/i.test(nome)) nota += 55;
    if (v.default) nota += 10;

    if (nota > maiorNota) {
      maiorNota = nota;
      melhor = v;
    }
  }

  return melhor;
}

let audioGlobalAtivo: HTMLAudioElement | null = null;
let cancelarSessaoGlobal: (() => void) | null = null;

/**
 * Leitura em voz alta humanizada (Voz Neural pt-BR com fallback inteligente
 * para a melhor voz natural do navegador e pausas prosódicas entre frases).
 */
export function useFala() {
  const suportado =
    typeof window !== 'undefined' && ('Audio' in window || 'speechSynthesis' in window);
  const [falando, setFalando] = useState(false);
  const sessaoRef = useRef(0);

  // Pré-carrega o catálogo de vozes do navegador de forma assíncrona
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
    const aoMudarVozes = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', aoMudarVozes);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', aoMudarVozes);
    };
  }, []);

  const parar = useCallback(() => {
    sessaoRef.current += 1;
    if (cancelarSessaoGlobal) {
      const fn = cancelarSessaoGlobal;
      cancelarSessaoGlobal = null;
      fn();
    }
    if (audioGlobalAtivo) {
      audioGlobalAtivo.pause();
      audioGlobalAtivo.src = '';
      audioGlobalAtivo = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFalando(false);
  }, []);

  useEffect(() => {
    return () => {
      sessaoRef.current += 1;
    };
  }, []);

  const falarComWebSpeech = useCallback((textoNormalizado: string, idSessao: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setFalando(false);
      return;
    }

    window.speechSynthesis.cancel();
    const voz = escolherMelhorVozPtBr();
    const sentencas = textoNormalizado
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentencas.length === 0) {
      setFalando(false);
      return;
    }

    const ehNeuralLocal = voz ? /natural|neural|online|google/i.test(voz.name) : false;
    let indice = 0;

    const falarProxima = () => {
      if (sessaoRef.current !== idSessao || indice >= sentencas.length) {
        if (sessaoRef.current === idSessao) setFalando(false);
        return;
      }

      const u = new SpeechSynthesisUtterance(sentencas[indice]);
      u.lang = 'pt-BR';
      if (voz) u.voice = voz;
      u.rate = ehNeuralLocal ? 1.02 : 0.99;
      u.pitch = 1.0;

      u.onend = () => {
        indice += 1;
        falarProxima();
      };
      u.onerror = () => {
        if (sessaoRef.current === idSessao) setFalando(false);
      };

      window.speechSynthesis.speak(u);
    };

    falarProxima();
  }, []);

  const falar = useCallback(
    (texto: string) => {
      if (!suportado) return;
      parar();

      const idSessao = sessaoRef.current + 1;
      sessaoRef.current = idSessao;
      cancelarSessaoGlobal = () => {
        sessaoRef.current += 1;
        setFalando(false);
      };

      const textoHumanizado = humanizarTextoParaFala(texto);
      if (!textoHumanizado) return;

      setFalando(true);

      // Se estiver online, prioriza o motor de Voz Neural pt-BR da aplicação
      if (typeof Audio !== 'undefined' && navigator.onLine !== false) {
        const url = `/api/v1/tts?q=${encodeURIComponent(textoHumanizado)}`;
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.playbackRate = 1.04;
        audioGlobalAtivo = audio;

        let caiuParaFallback = false;
        const acionarFallback = () => {
          if (caiuParaFallback || sessaoRef.current !== idSessao) return;
          caiuParaFallback = true;
          if (audioGlobalAtivo === audio) audioGlobalAtivo = null;
          falarComWebSpeech(textoHumanizado, idSessao);
        };

        audio.onended = () => {
          if (sessaoRef.current === idSessao) {
            if (audioGlobalAtivo === audio) audioGlobalAtivo = null;
            setFalando(false);
          }
        };

        audio.onerror = acionarFallback;

        audio.play().catch(acionarFallback);
        return;
      }

      falarComWebSpeech(textoHumanizado, idSessao);
    },
    [suportado, parar, falarComWebSpeech],
  );

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


