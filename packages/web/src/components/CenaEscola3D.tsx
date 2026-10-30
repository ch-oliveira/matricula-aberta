import { useEffect, useRef, useState } from 'react';
import { Icone } from './Icone';

interface Particula {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
}

const FALAS_FILHO = [
  'Hahaha! Bora pra escola, mãe!',
  'Ebaaa! Minha mochila já tá pronta!',
  'Haha! Faz cócegas não!',
  'Vou fazer um monte de amigos!',
];

const FALAS_MAE = [
  'Hahaha! Sem fila na porta esse ano!',
  'Tudo certinho pra sua matrícula, filho!',
  'Haha! Que alegria ir pra escola!',
  'Bora lá, meu amor!',
];

/**
 * Toca um som curto e alegre de risadinha/mola via Web Audio API (sem arquivos externos).
 */
function tocarSomAlegria(tipo: 'filho' | 'mae') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notas = tipo === 'filho' ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 493.88, 587.33, 783.99];
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t0 = ctx.currentTime + i * 0.065;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t0 + 0.055);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.08);
    });
  } catch {
    /* Web Audio bloqueado ou indisponível */
  }
}

export function CenaEscola3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [olhar, setOlhar] = useState({ x: 0, y: 0 });
  const [rindoMae, setRindoMae] = useState(false);
  const [rindoFilho, setRindoFilho] = useState(false);
  const [fala, setFala] = useState<{ quem: 'mae' | 'filho'; texto: string } | null>(null);
  const [particulas, setParticulas] = useState<Particula[]>([]);
  const idxFalaRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Olhos e cabeças acompanham suavemente o ponteiro na tela
  useEffect(() => {
    function aoMover(e: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 280));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 240));
      setOlhar({ x: dx, y: dy });
    }
    window.addEventListener('mousemove', aoMover, { passive: true });
    return () => window.removeEventListener('mousemove', aoMover);
  }, []);

  function explodirAlegria(quem: 'mae' | 'filho') {
    tocarSomAlegria(quem);
    idxFalaRef.current += 1;

    if (quem === 'filho') {
      setRindoFilho(true);
      setRindoMae(true);
      setFala({
        quem: 'filho',
        texto: FALAS_FILHO[idxFalaRef.current % FALAS_FILHO.length],
      });
    } else {
      setRindoMae(true);
      setRindoFilho(true);
      setFala({
        quem: 'mae',
        texto: FALAS_MAE[idxFalaRef.current % FALAS_MAE.length],
      });
    }

    const emojis = ['sparkles', 'star', 'backpack', 'award', 'sun', 'check-circle'];
    const baseX = quem === 'filho' ? 34 : 64;
    const baseY = quem === 'filho' ? 42 : 24;
    const novas: Particula[] = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: baseX + (Math.random() * 24 - 12),
      y: baseY + (Math.random() * 14 - 7),
      vx: (Math.random() - 0.5) * 35,
      vy: -25 - Math.random() * 30,
      emoji: emojis[i % emojis.length],
    }));
    setParticulas(novas);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setRindoFilho(false);
      setRindoMae(false);
      setParticulas([]);
    }, 1500);
  }

  const pupilX = olhar.x * 4.2;
  const pupilY = olhar.y * 3.2;
  const headTiltMae = olhar.x * 3.5;
  const headTiltFilho = olhar.x * 4.5;

  return (
    <div
      ref={containerRef}
      className={`dupla3d-palco ${rindoMae || rindoFilho ? 'dupla3d-rindo' : ''}`}
      style={{
        ['--tilt-x' as string]: `${(olhar.x * 6).toFixed(2)}deg`,
        ['--tilt-y' as string]: `${(-olhar.y * 5).toFixed(2)}deg`,
      }}
    >
      {/* Balão de risada / fala quando clicado */}
      {fala && (
        <div
          key={fala.texto}
          className={`dupla3d-balao dupla3d-balao-${fala.quem}`}
          role="status"
          aria-live="polite"
        >
          {fala.texto}
        </div>
      )}

      {/* Partículas de risada/alegria ao clicar */}
      <div className="dupla3d-particulas" aria-hidden="true">
        {particulas.map((p) => (
          <span
            key={p.id}
            className="dupla3d-particula"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              ['--tx' as string]: `${p.vx}px`,
              ['--ty' as string]: `${p.vy}px`,
            }}
          >
            <Icone nome={p.emoji} tamanho={20} />
          </span>
        ))}
      </div>

      {/* Personagens 3D Volumétricos Articulados (Apenas Mãe e Filho) */}
      <svg
        className="dupla3d-svg"
        viewBox="0 0 520 460"
        role="img"
        aria-label="Mãe e filho em 3D indo para a escola. Clique neles para vê-los rir e pular."
      >
        <defs>
          {/* Sombreamento 3D Clay / Pixar-style */}
          <radialGradient id="pele-mae" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#d98a5c" />
            <stop offset="65%" stopColor="#b5653b" />
            <stop offset="100%" stopColor="#8c4622" />
          </radialGradient>

          <radialGradient id="pele-filho" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#df9264" />
            <stop offset="65%" stopColor="#bb6b40" />
            <stop offset="100%" stopColor="#914b26" />
          </radialGradient>

          <radialGradient id="cabelo-3d" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#594036" />
            <stop offset="60%" stopColor="#38251e" />
            <stop offset="100%" stopColor="#211410" />
          </radialGradient>

          <linearGradient id="blusa-menta" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b8f5d8" />
            <stop offset="55%" stopColor="#85deb4" />
            <stop offset="100%" stopColor="#52b788" />
          </linearGradient>

          <linearGradient id="calca-mae" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f638c" />
            <stop offset="60%" stopColor="#34466b" />
            <stop offset="100%" stopColor="#202d4a" />
          </linearGradient>

          <linearGradient id="colete-roxo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8567ff" />
            <stop offset="55%" stopColor="#5b3fd6" />
            <stop offset="100%" stopColor="#3c24a8" />
          </linearGradient>

          <linearGradient id="mochila-amarela" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe47a" />
            <stop offset="60%" stopColor="#ffca28" />
            <stop offset="100%" stopColor="#e09f00" />
          </linearGradient>

          <linearGradient id="bermuda-caqui" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e6cba5" />
            <stop offset="65%" stopColor="#c7a77b" />
            <stop offset="100%" stopColor="#9e7f56" />
          </linearGradient>

          <filter id="sombra-3d" x="-15%" y="-15%" width="130%" height="135%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#181528" floodOpacity="0.18" />
          </filter>

          <filter id="sombra-interna" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.16" />
          </filter>
        </defs>

        {/* Sombras projetadas no chão (reagem ao pulo) */}
        <ellipse
          cx="185"
          cy="426"
          rx={rindoFilho ? 46 : 58}
          ry={rindoFilho ? 10 : 14}
          fill="rgb(24 21 40 / 0.14)"
          className="dupla3d-sombra"
        />
        <ellipse
          cx="342"
          cy="426"
          rx={rindoMae ? 54 : 66}
          ry={rindoMae ? 11 : 15}
          fill="rgb(24 21 40 / 0.14)"
          className="dupla3d-sombra"
        />

        {/* ==================== PERSONAGEM 1: MÃE EM 3D (DIREITA) ==================== */}
        <g
          className={`dupla3d-personagem dupla3d-mae ${rindoMae ? 'pulo-mae' : ''}`}
          onClick={() => explodirAlegria('mae')}
          filter="url(#sombra-3d)"
        >
          {/* Perna esquerda (atrás) */}
          <g className="mae-perna-tras">
            <path
              d="M 322 278 L 302 388"
              stroke="url(#calca-mae)"
              strokeWidth="32"
              strokeLinecap="round"
            />
            {/* Sapato esquerdo */}
            <ellipse cx="294" cy="402" rx="22" ry="12" fill="#4a2c22" transform="rotate(-8, 294, 402)" />
          </g>

          {/* Perna direita (frente) */}
          <g className="mae-perna-frente">
            <path
              d="M 358 278 L 368 392"
              stroke="url(#calca-mae)"
              strokeWidth="33"
              strokeLinecap="round"
            />
            {/* Sapato direito */}
            <ellipse cx="372" cy="406" rx="22" ry="12" fill="#5c372b" transform="rotate(6, 372, 406)" />
          </g>

          {/* Braço direito da mãe (estendido dando a mão ao filho) */}
          <g className="mae-braco-mao">
            <path
              d="M 298 188 Q 272 225 252 262"
              stroke="url(#blusa-menta)"
              strokeWidth="26"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 258 252 L 242 278"
              stroke="url(#pele-mae)"
              strokeWidth="18"
              strokeLinecap="round"
            />
            {/* Punho coral da manga */}
            <ellipse cx="256" cy="252" rx="14" ry="6" fill="#ff7a59" transform="rotate(32, 256, 252)" />
          </g>

          {/* Tronco / Blusa Menta 3D com detalhes Coral */}
          <path
            d="M 294 172
               Q 340 162 384 174
               L 394 276
               Q 340 286 286 276 Z"
            fill="url(#blusa-menta)"
          />
          {/* Gola e faixa vertical coral da blusa */}
          <path
            d="M 318 168 L 342 198 L 364 168"
            fill="none"
            stroke="#ff7a59"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="342" y1="198" x2="342" y2="278" stroke="#ff7a59" strokeWidth="6" strokeLinecap="round" />
          {/* Bolsinho coral */}
          <rect x="356" y="206" width="18" height="7" rx="3.5" fill="#ff7a59" />

          {/* Braço esquerdo da mãe (acena quando ri/clica!) */}
          <g className="mae-braco-aceno" style={{ transformOrigin: '382px 184px' }}>
            <path
              d={rindoMae ? 'M 382 184 Q 418 158 430 122' : 'M 382 184 Q 408 218 414 256'}
              stroke="url(#blusa-menta)"
              strokeWidth="25"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={rindoMae ? 432 : 415} cy={rindoMae ? 114 : 268} r="12" fill="url(#pele-mae)" />
            <ellipse
              cx={rindoMae ? 426 : 412}
              cy={rindoMae ? 132 : 248}
              rx="14"
              ry="6"
              fill="#ff7a59"
              transform={rindoMae ? 'rotate(-22, 426, 132)' : 'rotate(-12, 412, 248)'}
            />
          </g>

          {/* Pescoço da mãe */}
          <rect x="328" y="144" width="24" height="30" rx="10" fill="url(#pele-mae)" />

          {/* Cabeça 3D da Mãe (com inclinação que segue o mouse) */}
          <g
            style={{
              transform: `rotate(${headTiltMae.toFixed(1)}deg)`,
              transformOrigin: '340px 115px',
              transition: 'transform 0.12s ease-out',
            }}
          >
            {/* Cabelo Cacheado Volumétrico 3D (Camada de trás) */}
            <g fill="url(#cabelo-3d)">
              <circle cx="292" cy="96" r="28" />
              <circle cx="388" cy="96" r="28" />
              <circle cx="288" cy="126" r="24" />
              <circle cx="392" cy="126" r="24" />
              <circle cx="312" cy="64" r="30" />
              <circle cx="368" cy="64" r="30" />
              <circle cx="340" cy="56" r="32" />
            </g>

            {/* Orelhas + Brincos Coral */}
            <circle cx="292" cy="116" r="11" fill="url(#pele-mae)" />
            <circle cx="388" cy="116" r="11" fill="url(#pele-mae)" />
            <circle cx="290" cy="124" r="4.5" fill="#ff7a59" />
            <circle cx="390" cy="124" r="4.5" fill="#ff7a59" />

            {/* Rosto 3D da Mãe */}
            <rect x="295" y="70" width="90" height="86" rx="43" fill="url(#pele-mae)" filter="url(#sombra-interna)" />

            {/* Cachos da frente (franja 3D) */}
            <g fill="url(#cabelo-3d)">
              <circle cx="305" cy="72" r="18" />
              <circle cx="328" cy="66" r="19" />
              <circle cx="354" cy="66" r="19" />
              <circle cx="376" cy="72" r="18" />
            </g>

            {/* Bochechas coradas */}
            <ellipse cx="311" cy="124" rx="11" ry="6.5" fill="#ff6b6b" opacity={rindoMae ? 0.55 : 0.32} />
            <ellipse cx="369" cy="124" rx="11" ry="6.5" fill="#ff6b6b" opacity={rindoMae ? 0.55 : 0.32} />

            {/* Sobrancelhas expressivas */}
            <path
              d={rindoMae ? 'M 310 91 Q 320 84 330 90' : 'M 310 95 Q 320 90 330 94'}
              fill="none"
              stroke="#2a1912"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <path
              d={rindoMae ? 'M 350 90 Q 360 84 370 91' : 'M 350 94 Q 360 90 370 95'}
              fill="none"
              stroke="#2a1912"
              strokeWidth="3.8"
              strokeLinecap="round"
            />

            {/* Olhos 3D (Quando ri, fecham em arco feliz; caso contrário, seguem o mouse) */}
            {rindoMae ? (
              <g fill="none" stroke="#23140e" strokeWidth="4.2" strokeLinecap="round">
                <path d="M 310 109 Q 320 98 330 109" />
                <path d="M 350 109 Q 360 98 370 109" />
              </g>
            ) : (
              <g className="dupla3d-olhos">
                <ellipse cx="320" cy="108" rx="9.5" ry="10.5" fill="#ffffff" />
                <ellipse cx="360" cy="108" rx="9.5" ry="10.5" fill="#ffffff" />
                <circle cx={320 + pupilX} cy={108 + pupilY} r="5.8" fill="#2b1810" />
                <circle cx={360 + pupilX} cy={108 + pupilY} r="5.8" fill="#2b1810" />
                <circle cx={318 + pupilX * 0.5} cy={105 + pupilY * 0.5} r="2.2" fill="#ffffff" />
                <circle cx={358 + pupilX * 0.5} cy={105 + pupilY * 0.5} r="2.2" fill="#ffffff" />
              </g>
            )}

            {/* Nariz 3D delicado */}
            <ellipse cx="340" cy="117" rx="5.5" ry="4" fill="#9c4f28" />
            <ellipse cx="339" cy="115.5" rx="2.5" ry="1.5" fill="#e69d73" opacity="0.7" />

            {/* Boca (Sorriso acolhedor -> Gargalhada aberta quando clicada!) */}
            {rindoMae ? (
              <g>
                <path d="M 322 127 Q 340 148 358 127 Z" fill="#7a1c1c" />
                <path d="M 325 128 Q 340 132 355 128" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="340" cy="138" rx="8" ry="4.5" fill="#ff7a7a" />
              </g>
            ) : (
              <g>
                <path d="M 325 128 Q 340 141 355 128 Z" fill="#8c2323" />
                <path d="M 327 129 Q 340 132 353 129" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
              </g>
            )}
          </g>
        </g>

        {/* ==================== PERSONAGEM 2: FILHO EM 3D (ESQUERDA) ==================== */}
        <g
          className={`dupla3d-personagem dupla3d-filho ${rindoFilho ? 'pulo-filho' : ''}`}
          onClick={() => explodirAlegria('filho')}
          filter="url(#sombra-3d)"
        >
          {/* Mochila Escolar 3D Roxa e Amarela nas costas */}
          <g className="filho-mochila">
            <rect x="108" y="232" width="58" height="76" rx="22" fill="url(#colete-roxo)" />
            <rect x="102" y="264" width="26" height="36" rx="10" fill="url(#mochila-amarela)" />
            <path d="M 118 236 Q 135 236 138 265" fill="none" stroke="url(#mochila-amarela)" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Pernas e Tênis do Filho */}
          <g className="filho-perna-esq">
            <path d="M 164 334 L 154 396" stroke="url(#pele-filho)" strokeWidth="18" strokeLinecap="round" />
            <path d="M 166 322 L 158 356" stroke="url(#bermuda-caqui)" strokeWidth="26" strokeLinecap="round" />
            {/* Meia branca + Tênis */}
            <line x1="155" y1="388" x2="154" y2="398" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
            <rect x="134" y="394" width="32" height="16" rx="8" fill="#593a2e" />
            <rect x="134" y="405" width="32" height="5" rx="2.5" fill="#ffffff" />
          </g>

          <g className="filho-perna-dir">
            <path d="M 196 334 L 208 396" stroke="url(#pele-filho)" strokeWidth="18" strokeLinecap="round" />
            <path d="M 194 322 L 202 356" stroke="url(#bermuda-caqui)" strokeWidth="26" strokeLinecap="round" />
            {/* Meia branca + Tênis */}
            <line x1="206" y1="388" x2="208" y2="398" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" />
            <rect x="194" y="394" width="34" height="16" rx="8" fill="#593a2e" />
            <rect x="194" y="405" width="34" height="5" rx="2.5" fill="#ffffff" />
          </g>

          {/* Braço esquerdo do filho (segurando a mão da mãe) */}
          <path
            d="M 210 250 Q 228 268 242 278"
            stroke="url(#pele-filho)"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          {/* Mãos dadas (Mãe + Filho) */}
          <circle cx="242" cy="278" r="13" fill="url(#pele-filho)" />

          {/* Tronco do Filho (Camisa gola polo branca + Colete escolar roxo 3D) */}
          <rect x="146" y="234" width="68" height="92" rx="24" fill="url(#colete-roxo)" />
          {/* Gola branca e escudo escolar */}
          <polygon points="166,234 180,254 194,234" fill="#ffffff" />
          <rect x="192" y="262" width="12" height="14" rx="4" fill="url(#mochila-amarela)" />

          {/* Alças amarelas da mochila nos ombros */}
          <path d="M 154 236 Q 148 268 156 296" fill="none" stroke="url(#mochila-amarela)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 206 236 Q 212 268 204 296" fill="none" stroke="url(#mochila-amarela)" strokeWidth="8" strokeLinecap="round" />

          {/* Braço direito do filho (segurando a alça ou levantado comemorando quando ri!) */}
          <g className="filho-braco-dir">
            <path
              d={rindoFilho ? 'M 148 248 Q 116 226 108 194' : 'M 148 248 Q 132 272 156 276'}
              stroke="url(#pele-filho)"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={rindoFilho ? 108 : 158} cy={rindoFilho ? 190 : 276} r="10.5" fill="url(#pele-filho)" />
          </g>

          {/* Cabeça 3D do Filho */}
          <g
            style={{
              transform: `rotate(${headTiltFilho.toFixed(1)}deg)`,
              transformOrigin: '180px 185px',
              transition: 'transform 0.12s ease-out',
            }}
          >
            {/* Orelhas */}
            <circle cx="136" cy="192" r="11" fill="url(#pele-filho)" />
            <circle cx="224" cy="192" r="11" fill="url(#pele-filho)" />

            {/* Rosto 3D redondinho de criança */}
            <rect x="138" y="144" width="84" height="82" rx="40" fill="url(#pele-filho)" filter="url(#sombra-interna)" />

            {/* Cabelo 3D do menino */}
            <g fill="url(#cabelo-3d)">
              <circle cx="152" cy="146" r="20" />
              <circle cx="180" cy="138" r="24" />
              <circle cx="208" cy="146" r="20" />
              <circle cx="142" cy="162" r="14" />
              <circle cx="218" cy="162" r="14" />
              {/* Topete divertido */}
              <path d="M 172 122 Q 186 108 196 126" fill="url(#cabelo-3d)" />
            </g>

            {/* Bochechas rosadas */}
            <ellipse cx="154" cy="198" rx="10.5" ry="6" fill="#ff6b6b" opacity={rindoFilho ? 0.6 : 0.36} />
            <ellipse cx="206" cy="198" rx="10.5" ry="6" fill="#ff6b6b" opacity={rindoFilho ? 0.6 : 0.36} />

            {/* Sobrancelhas */}
            <path
              d={rindoFilho ? 'M 152 166 Q 162 159 171 165' : 'M 152 170 Q 162 165 171 169'}
              fill="none"
              stroke="#2a1912"
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <path
              d={rindoFilho ? 'M 189 165 Q 198 159 208 166' : 'M 189 169 Q 198 165 208 170'}
              fill="none"
              stroke="#2a1912"
              strokeWidth="3.6"
              strokeLinecap="round"
            />

            {/* Olhos grandes e brilhantes 3D */}
            {rindoFilho ? (
              <g fill="none" stroke="#23140e" strokeWidth="4.2" strokeLinecap="round">
                <path d="M 152 184 Q 162 172 172 184" />
                <path d="M 188 184 Q 198 172 208 184" />
              </g>
            ) : (
              <g className="dupla3d-olhos">
                <ellipse cx="162" cy="182" rx="10" ry="11" fill="#ffffff" />
                <ellipse cx="198" cy="182" rx="10" ry="11" fill="#ffffff" />
                <circle cx={162 + pupilX} cy={182 + pupilY} r="6.2" fill="#2b1810" />
                <circle cx={198 + pupilX} cy={182 + pupilY} r="6.2" fill="#2b1810" />
                <circle cx={159.5 + pupilX * 0.5} cy={178.5 + pupilY * 0.5} r="2.5" fill="#ffffff" />
                <circle cx={195.5 + pupilX * 0.5} cy={178.5 + pupilY * 0.5} r="2.5" fill="#ffffff" />
              </g>
            )}

            {/* Narizinho 3D */}
            <ellipse cx="180" cy="191" rx="5" ry="3.8" fill="#9c4f28" />
            <ellipse cx="179" cy="189.5" rx="2.2" ry="1.3" fill="#ebaa82" opacity="0.75" />

            {/* Boca do Filho (Sorriso -> Risada bem aberta ao clicar) */}
            {rindoFilho ? (
              <g>
                <path d="M 160 200 Q 180 225 200 200 Z" fill="#7a1c1c" />
                <path d="M 164 201 Q 180 206 196 201" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
                <ellipse cx="180" cy="213" rx="9" ry="5" fill="#ff7a7a" />
              </g>
            ) : (
              <g>
                <path d="M 164 201 Q 180 216 196 201 Z" fill="#8c2323" />
                <path d="M 167 202 Q 180 205 193 202" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" />
              </g>
            )}
          </g>
        </g>
      </svg>

      <span className="dupla3d-dica"><Icone nome="sparkles" tamanho={15} /> Toque na mãe ou no filho!</span>
    </div>
  );
}
