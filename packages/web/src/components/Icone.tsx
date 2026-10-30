import type { CSSProperties, ReactNode } from 'react';
import type { EtapaId, StatusVaga, TipoUnidade } from '../domain/types';

export type NomeIcone =
  | 'bercario'
  | 'maternal'
  | 'pre'
  | 'fund1'
  | 'fund2'
  | 'creche'
  | 'cmei'
  | 'emef'
  | 'school'
  | 'landmark'
  | 'check'
  | 'check-circle'
  | 'bolt'
  | 'hourglass'
  | 'clock'
  | 'calendar'
  | 'pin'
  | 'radar'
  | 'compass'
  | 'map'
  | 'list'
  | 'sun'
  | 'sunset'
  | 'cloud-sun'
  | 'moon'
  | 'accessibility'
  | 'bell'
  | 'scale'
  | 'trophy'
  | 'walk'
  | 'refresh'
  | 'alert-triangle'
  | 'info'
  | 'lightbulb'
  | 'sparkles'
  | 'star'
  | 'award'
  | 'user-heart'
  | 'volume'
  | 'stop'
  | 'x'
  | 'arrow-right'
  | 'arrow-left'
  | 'ticket'
  | 'qr-code'
  | 'smartphone'
  | 'message-circle'
  | 'phone'
  | 'backpack'
  | 'clipboard-check'
  | 'history'
  | 'wifi'
  | 'trending-down'
  | 'hand-click'
  | 'file-text'
  | 'id-card'
  | 'user-check'
  | 'id-badge'
  | 'home'
  | 'syringe'
  | 'heart-pulse'
  | 'graduation-cap'
  | 'briefcase'
  | 'credit-card'
  | 'stethoscope'
  | 'music'
  | 'shopping-bag'
  | 'cactus'
  | 'bird'
  | 'church'
  | 'accordion'
  | 'hospital'
  | 'mountain'
  | 'tree'
  | 'cart'
  | 'plane';

/**
 * Mapa de compatibilidade para converter identificadores legados ou dados em cache
 * para o nome semântico do ícone vetorial da plataforma.
 */
const ALIAS_ICONE: Record<string, NomeIcone> = {
  // Documentos por ID
  certidao: 'file-text',
  'cpf-crianca': 'id-card',
  'doc-resp': 'user-check',
  'cpf-resp': 'id-badge',
  residencia: 'home',
  vacina: 'syringe',
  sus: 'heart-pulse',
  historico: 'graduation-cap',
  trabalho: 'briefcase',
  nis: 'credit-card',
  laudo: 'stethoscope',
  // Tipos de unidade
  Creche: 'creche',
  CMEI: 'cmei',
  EMEI: 'pre',
  EMEF: 'emef',
  // Status
  aberta: 'check-circle',
  ultimas: 'bolt',
  espera: 'hourglass',
  // Fallbacks de cache antigo
  '\u{1F37C}': 'bercario',
  '\u{1F9F8}': 'maternal',
  '\u{1F58D}\u{FE0F}': 'pre',
  '\u{1F58D}': 'pre',
  '\u{270F}\u{FE0F}': 'fund1',
  '\u{270F}': 'fund1',
  '\u{1F4DA}': 'fund2',
  '\u{2705}': 'check-circle',
  '\u{26A1}': 'bolt',
  '\u{23F3}': 'hourglass',
  '\u{1F4C4}': 'file-text',
  '\u{1FAAA}': 'id-card',
  '\u{1F9D1}': 'user-check',
  '\u{1F522}': 'id-badge',
  '\u{1F3E0}': 'home',
  '\u{1F489}': 'syringe',
  '\u{1F3E5}': 'hospital',
  '\u{1F393}': 'graduation-cap',
  '\u{1F4BC}': 'briefcase',
  '\u{1F4B3}': 'credit-card',
  '\u{1FA7A}': 'stethoscope',
  '\u{1F514}': 'bell',
  '\u{1F389}': 'sparkles',
  '\u{1F4C9}': 'trending-down',
  '\u{1F9D2}': 'user-heart',
  '\u{267B}\u{FE0F}': 'refresh',
  '\u{267B}': 'refresh',
  '\u{2139}\u{FE0F}': 'info',
  '\u{2139}': 'info',
  '\u{1F39F}\u{FE0F}': 'ticket',
  '\u{1F39F}': 'ticket',
};

export function resolverNomeIcone(entrada?: string | null, padrao: NomeIcone = 'sparkles'): NomeIcone {
  if (!entrada) return padrao;
  if (entrada in ALIAS_ICONE) return ALIAS_ICONE[entrada];
  return entrada as NomeIcone;
}

function renderizarGeometria(nome: NomeIcone): ReactNode {
  switch (nome) {
    case 'bercario':
      return (
        <>
          <rect x="7" y="8" width="10" height="13" rx="3" fill="currentColor" fillOpacity="0.16" />
          <path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M10.5 5V3.5a1.5 1.5 0 0 1 3 0V5" />
          <rect x="7" y="8" width="10" height="13" rx="3" />
          <path d="M10 12h2.5M10 15h3.5M10 18h2.5" />
        </>
      );

    case 'maternal':
    case 'cmei':
      return (
        <>
          <rect x="4" y="13" width="7" height="7" rx="1.8" fill="currentColor" fillOpacity="0.16" />
          <rect x="13" y="13" width="7" height="7" rx="1.8" fill="currentColor" fillOpacity="0.16" />
          <rect x="8.5" y="4" width="7" height="7" rx="1.8" fill="currentColor" fillOpacity="0.24" />
          <rect x="4" y="13" width="7" height="7" rx="1.8" />
          <rect x="13" y="13" width="7" height="7" rx="1.8" />
          <rect x="8.5" y="4" width="7" height="7" rx="1.8" />
          <path d="M12 6.5v2M11 7.5h2" />
        </>
      );

    case 'pre':
      return (
        <>
          <path
            d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9 1.66 0 3-1.34 3-3 0-.78-.29-1.48-.76-2.01-.45-.5-.74-1.15-.74-1.99 0-1.66 1.34-3 3-3h1.5A3 3 0 0 0 21 8c0-2.76-4.03-5-9-5Z"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9 1.66 0 3-1.34 3-3 0-.78-.29-1.48-.76-2.01-.45-.5-.74-1.15-.74-1.99 0-1.66 1.34-3 3-3h1.5A3 3 0 0 0 21 8c0-2.76-4.03-5-9-5Z" />
          <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="8" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
        </>
      );

    case 'fund1':
      return (
        <>
          <path d="M14.5 4.5 19.5 9.5 8 21H3v-5L14.5 4.5Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M14.5 4.5 19.5 9.5 8 21H3v-5L14.5 4.5Z" />
          <path d="m12 7 5 5" />
          <path d="m3 16 5 5" />
        </>
      );

    case 'fund2':
      return (
        <>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M9 7h6M9 11h4" />
        </>
      );

    case 'creche':
      return (
        <>
          <path d="M4 11h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5Z" fill="currentColor" fillOpacity="0.16" />
          <path d="M4 11h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-5Z" />
          <path d="M12 4a7 7 0 0 1 7 7H5a7 7 0 0 1 7-7Z" />
          <path d="M3 20c3 1.5 15 1.5 18 0" />
        </>
      );

    case 'emef':
    case 'school':
      return (
        <>
          <path d="M4 10v10h16V10" fill="currentColor" fillOpacity="0.15" />
          <path d="m2 10 10-6 10 6" />
          <path d="M4 10v10h16V10" />
          <path d="M10 20v-5a2 2 0 0 1 4 0v5" />
          <path d="M12 4V2h3v2" />
          <circle cx="12" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
        </>
      );

    case 'landmark':
      return (
        <>
          <path d="m3 9 9-6 9 6H3Z" fill="currentColor" fillOpacity="0.16" />
          <path d="m3 9 9-6 9 6H3Z" />
          <path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8" />
          <path d="M3 17h18M2 20h20" />
        </>
      );

    case 'check':
      return <path d="m4.5 12.5 5 5 10-10.5" strokeWidth="2.6" />;

    case 'check-circle':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.16" />
          <circle cx="12" cy="12" r="9.5" />
          <path d="m8.2 12.3 2.6 2.6 5.2-5.4" />
        </>
      );

    case 'bolt':
      return (
        <path
          d="M13 2 4.5 13.5h6.5L10 22l9.5-12h-6.5L13 2Z"
          fill="currentColor"
          fillOpacity="0.2"
        />
      );

    case 'hourglass':
      return (
        <>
          <path d="M5 3h14M5 21h14" />
          <path
            d="M7 3v3.5a5 5 0 0 0 2.2 4.15L12 12l-2.8 1.35A5 5 0 0 0 7 17.5V21h10v-3.5a5 5 0 0 0-2.2-4.15L12 12l2.8-1.35A5 5 0 0 0 17 6.5V3H7Z"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path d="M7 3v3.5a5 5 0 0 0 2.2 4.15L12 12l-2.8 1.35A5 5 0 0 0 7 17.5V21h10v-3.5a5 5 0 0 0-2.2-4.15L12 12l2.8-1.35A5 5 0 0 0 17 6.5V3H7Z" />
        </>
      );

    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 7v5l3.5 2" />
        </>
      );

    case 'calendar':
      return (
        <>
          <rect x="3" y="5" width="18" height="16" rx="3" fill="currentColor" fillOpacity="0.14" />
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
          <circle cx="8.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
        </>
      );

    case 'pin':
      return (
        <>
          <path
            d="M12 21.5s-7-5.6-7-11.5a7 7 0 1 1 14 0c0 5.9-7 11.5-7 11.5Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="M12 21.5s-7-5.6-7-11.5a7 7 0 1 1 14 0c0 5.9-7 11.5-7 11.5Z" />
          <circle cx="12" cy="10" r="2.6" />
        </>
      );

    case 'radar':
      return (
        <>
          <circle cx="12" cy="12" r="7" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </>
      );

    case 'compass':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="9.5" />
          <polygon points="16,8 13.8,13.8 8,16 10.2,10.2" fill="currentColor" fillOpacity="0.25" />
          <polygon points="16,8 13.8,13.8 8,16 10.2,10.2" />
        </>
      );

    case 'map':
      return (
        <>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" fill="currentColor" fillOpacity="0.14" />
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
          <path d="M9 3v15M15 6v15" />
        </>
      );

    case 'list':
      return (
        <>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
        </>
      );

    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.22" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </>
      );

    case 'sunset':
      return (
        <>
          <path d="M17 16a5 5 0 0 0-10 0" fill="currentColor" fillOpacity="0.2" />
          <path d="M17 16a5 5 0 0 0-10 0" />
          <path d="M12 5v3M4.9 9.9l1.5 1.5M19.1 9.9l-1.5 1.5M2 16h20M5 20h14" />
        </>
      );

    case 'cloud-sun':
      return (
        <>
          <path d="M10 4v1.5M4.5 6.5l1.1 1.1M3 12h1.5M14.5 6.5l-1.1 1.1" />
          <path d="M13 10a3.5 3.5 0 0 0-6.5 1.5" />
          <path
            d="M8.5 19h8a3.5 3.5 0 0 0 .4-6.98A4.8 4.8 0 0 0 7.6 11a3.8 3.8 0 0 0 .9 8Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M8.5 19h8a3.5 3.5 0 0 0 .4-6.98A4.8 4.8 0 0 0 7.6 11a3.8 3.8 0 0 0 .9 8Z" />
        </>
      );

    case 'moon':
      return (
        <path
          d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
          fill="currentColor"
          fillOpacity="0.2"
        />
      );

    case 'accessibility':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="6.8" r="1.4" fill="currentColor" stroke="none" />
          <path d="M7.5 10h9M12 10v4.2m0 0-2.3 4.3m2.3-4.3 2.3 4.3" />
        </>
      );

    case 'bell':
      return (
        <>
          <path
            d="M18 9A6 6 0 0 0 6 9c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M18 9A6 6 0 0 0 6 9c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9Z" />
          <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
        </>
      );

    case 'scale':
      return (
        <>
          <path d="M12 3v18M8 21h8M4 7h16" />
          <path d="m5 7-2.5 6h5L5 7ZM19 7l-2.5 6h5L19 7Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M2.5 13a2.5 2.5 0 0 0 5 0h-5ZM16.5 13a2.5 2.5 0 0 0 5 0h-5Z" />
        </>
      );

    case 'trophy':
      return (
        <>
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4.5a2 2 0 0 0 0 4H7M17 6h2.5a2 2 0 0 1 0 4H17" />
          <path d="M12 14v4M8 21h8M9.5 18h5" />
        </>
      );

    case 'walk':
      return (
        <>
          <circle cx="13" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
          <path d="m10 9 3-1 3 2.5v3M8 12l2.5-3 1.5 5 3.5 6M11 14l-2.5 6" />
        </>
      );

    case 'refresh':
      return (
        <>
          <path d="M20 11A8 8 0 0 0 5.6 7.2L4 9" />
          <path d="M4 4.5V9h4.5" />
          <path d="M4 13a8 8 0 0 0 14.4 3.8L20 15" />
          <path d="M20 19.5V15h-4.5" />
        </>
      );

    case 'alert-triangle':
      return (
        <>
          <path
            d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9.5v4.2" />
          <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
        </>
      );

    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.15" />
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5" />
          <circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
        </>
      );

    case 'lightbulb':
      return (
        <>
          <path
            d="M9 17h6m-5.5 3.5h5M8.5 14C7 12.8 6 11 6 8.8a6 6 0 1 1 12 0c0 2.2-1 4-2.5 5.2l-.5 3H9l-.5-3Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="M9 17h6m-4.5 3.5h3M8.5 14C7 12.8 6 11 6 8.8a6 6 0 1 1 12 0c0 2.2-1 4-2.5 5.2l-.5 3H9l-.5-3Z" />
        </>
      );

    case 'sparkles':
      return (
        <>
          <path
            d="m12 2.5 2.1 5.4 5.4 2.1-5.4 2.1L12 17.5l-2.1-5.4-5.4-2.1 5.4-2.1L12 2.5Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
          <path d="m12 2.5 2.1 5.4 5.4 2.1-5.4 2.1L12 17.5l-2.1-5.4-5.4-2.1 5.4-2.1L12 2.5Z" />
          <path d="M19 16v4M17 18h4M5 17v3M3.5 18.5h3" />
        </>
      );

    case 'star':
      return (
        <polygon
          points="12,2.5 14.9,8.4 21.5,9.3 16.7,13.9 17.8,20.5 12,17.4 6.2,20.5 7.3,13.9 2.5,9.3 9.1,8.4"
          fill="currentColor"
          fillOpacity="0.22"
        />
      );

    case 'award':
      return (
        <>
          <circle cx="12" cy="9" r="6" fill="currentColor" fillOpacity="0.18" />
          <circle cx="12" cy="9" r="6" />
          <path d="m8.5 14-1.5 7 5-2.6 5 2.6-1.5-7" />
        </>
      );

    case 'user-heart':
      return (
        <>
          <circle cx="10" cy="7.5" r="3.5" fill="currentColor" fillOpacity="0.16" />
          <circle cx="10" cy="7.5" r="3.5" />
          <path d="M3.5 19.5a6.5 6.5 0 0 1 11-4.6" />
          <path
            d="M18 20.5s-3.5-2.2-3.5-4.4a2 2 0 0 1 3.5-1.3 2 2 0 0 1 3.5 1.3c0 2.2-3.5 4.4-3.5 4.4Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </>
      );

    case 'volume':
      return (
        <>
          <polygon points="11,5 6,9 3,9 3,15 6,15 11,19" fill="currentColor" fillOpacity="0.18" />
          <polygon points="11,5 6,9 3,9 3,15 6,15 11,19" />
          <path d="M15.2 8.8a4.5 4.5 0 0 1 0 6.4M18.2 6a8.5 8.5 0 0 1 0 12" />
        </>
      );

    case 'stop':
      return (
        <>
          <circle cx="12" cy="12" r="9.5" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="9.5" />
          <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
        </>
      );

    case 'x':
      return <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.4" />;

    case 'arrow-right':
      return <path d="M5 12h14m-6-6 6 6-6 6" />;

    case 'arrow-left':
      return <path d="M19 12H5m6-6-6 6 6 6" />;

    case 'ticket':
      return (
        <>
          <path
            d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V8Z"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V8Z" />
          <path d="M9.5 6v12" strokeDasharray="2.5 2.5" />
        </>
      );

    case 'qr-code':
      return (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" fill="currentColor" fillOpacity="0.16" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" fill="currentColor" fillOpacity="0.16" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" fill="currentColor" fillOpacity="0.16" />
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
          <path d="M14 14h2.5v2.5H14zM18 14h2v3h-2zM14 19h6" />
        </>
      );

    case 'smartphone':
      return (
        <>
          <rect x="6" y="2.5" width="12" height="19" rx="2.6" fill="currentColor" fillOpacity="0.15" />
          <rect x="6" y="2.5" width="12" height="19" rx="2.6" />
          <path d="M10.5 18h3" />
        </>
      );

    case 'message-circle':
      return (
        <>
          <path
            d="M20.5 11.5a8.5 8.5 0 0 1-12.5 7.5L3.5 20.5 5 16a8.5 8.5 0 1 1 15.5-4.5Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M20.5 11.5a8.5 8.5 0 0 1-12.5 7.5L3.5 20.5 5 16a8.5 8.5 0 1 1 15.5-4.5Z" />
          <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.8" />
        </>
      );

    case 'phone':
      return (
        <path
          d="M21 16.4v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.6 5.2 2 2 0 0 1 4.6 3h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.5 10.7a16 16 0 0 0 4.8 4.8l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z"
          fill="currentColor"
          fillOpacity="0.16"
        />
      );

    case 'backpack':
      return (
        <>
          <rect x="5" y="7" width="14" height="14" rx="4" fill="currentColor" fillOpacity="0.16" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
          <rect x="5" y="7" width="14" height="14" rx="4" />
          <rect x="8" y="13" width="8" height="5" rx="1.6" />
          <path d="M5 12h14" />
        </>
      );

    case 'clipboard-check':
      return (
        <>
          <rect x="5" y="4" width="14" height="17" rx="2.5" fill="currentColor" fillOpacity="0.14" />
          <rect x="5" y="4" width="14" height="17" rx="2.5" />
          <path d="M9 4.5h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2Z" />
          <path d="m9 13 2.2 2.2 4.3-4.4" />
        </>
      );

    case 'history':
      return (
        <>
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3.5V8h4.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      );

    case 'wifi':
      return (
        <>
          <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
        </>
      );

    case 'trending-down':
      return (
        <>
          <path d="m22 17-8.5-8.5-5 5L2 7" />
          <path d="M16 17h6v-6" />
        </>
      );

    case 'hand-click':
      return (
        <>
          <path d="M12 3v3M6.5 5.5l1.8 1.8M17.5 5.5l-1.8 1.8" />
          <path
            d="M10 11V7.5a2 2 0 0 1 4 0V11h1.5a2.5 2.5 0 0 1 2.5 2.5v3a4.5 4.5 0 0 1-4.5 4.5h-2.2a4.5 4.5 0 0 1-4-2.5L5.5 15a1.6 1.6 0 0 1 2.7-1.7L10 15V11Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
        </>
      );

    case 'file-text':
      return (
        <>
          <path
            d="M14 2.5H6.5A2.5 2.5 0 0 0 4 5v14a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 19V8.5l-6-6Z"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path d="M14 2.5H6.5A2.5 2.5 0 0 0 4 5v14a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 19V8.5l-6-6Z" />
          <path d="M14 2.5V8.5h6M8 13h8M8 17h5" />
        </>
      );

    case 'id-card':
      return (
        <>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="currentColor" fillOpacity="0.15" />
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <circle cx="8" cy="11" r="2" />
          <path d="M5.5 15.5a3 3 0 0 1 5 0M13.5 10h4.5M13.5 14h3.5" />
        </>
      );

    case 'user-check':
      return (
        <>
          <circle cx="9.5" cy="7.5" r="3.5" fill="currentColor" fillOpacity="0.16" />
          <circle cx="9.5" cy="7.5" r="3.5" />
          <path d="M3 19.5a6.5 6.5 0 0 1 13 0" />
          <path d="m16 11.5 2 2 3.5-3.5" />
        </>
      );

    case 'id-badge':
      return (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2.5" fill="currentColor" fillOpacity="0.15" />
          <rect x="5" y="3" width="14" height="18" rx="2.5" />
          <path d="M9.5 7h5M8.5 12h7M8.5 16h4.5" />
        </>
      );

    case 'home':
      return (
        <>
          <path
            d="m3 10.5 9-7.5 9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="m3 10.5 9-7.5 9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5Z" />
          <path d="M9.5 21.5V14h5v7.5" />
        </>
      );

    case 'syringe':
      return (
        <>
          <path d="m18 2 4 4M17 7l3-3M19 9 8.5 19.5 4.5 15.5 15 5l4 4Z" fill="currentColor" fillOpacity="0.16" />
          <path d="m18 2 4 4M17 7l3-3M19 9 8.5 19.5 4.5 15.5 15 5l4 4ZM13.5 3.5l7 7M6.5 17.5 2 22M11 9.5l2.5 2.5" />
        </>
      );

    case 'heart-pulse':
      return (
        <>
          <path
            d="M12 20.5s-8.5-5.2-8.5-11A5 5 0 0 1 12 6a5 5 0 0 1 8.5 3.5c0 5.8-8.5 11-8.5 11Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M12 20.5s-8.5-5.2-8.5-11A5 5 0 0 1 12 6a5 5 0 0 1 8.5 3.5c0 5.8-8.5 11-8.5 11Z" />
          <path d="M7.5 12h2.3l1.3-2.5 2 5 1.3-2.5h2.1" />
        </>
      );

    case 'graduation-cap':
      return (
        <>
          <polygon points="12,4 2,9 12,14 22,9" fill="currentColor" fillOpacity="0.18" />
          <polygon points="12,4 2,9 12,14 22,9" />
          <path d="M6 11.5v5c0 1.8 2.7 3.2 6 3.2s6-1.4 6-3.2v-5M21 9.5V16" />
        </>
      );

    case 'briefcase':
      return (
        <>
          <rect x="3" y="7" width="18" height="13" rx="2.5" fill="currentColor" fillOpacity="0.15" />
          <rect x="3" y="7" width="18" height="13" rx="2.5" />
          <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M3 12.5h18" />
        </>
      );

    case 'credit-card':
      return (
        <>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="currentColor" fillOpacity="0.15" />
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19M6.5 15h4" />
        </>
      );

    case 'stethoscope':
      return (
        <>
          <path d="M5 4v5a5 5 0 0 0 10 0V4M3.5 4h3M13.5 4h3" />
          <path d="M10 14v2.5a4.5 4.5 0 0 0 9 0V14" />
          <circle cx="19" cy="12" r="2" fill="currentColor" fillOpacity="0.2" />
        </>
      );

    case 'music':
      return (
        <>
          <path d="M9 18V6l11-2v12" />
          <circle cx="6.5" cy="18" r="2.5" fill="currentColor" fillOpacity="0.2" />
          <circle cx="17.5" cy="16" r="2.5" fill="currentColor" fillOpacity="0.2" />
        </>
      );

    case 'shopping-bag':
      return (
        <>
          <path d="M5 7h14l1 13.5H4L5 7Z" fill="currentColor" fillOpacity="0.16" />
          <path d="M5 7h14l1 13.5H4L5 7Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </>
      );

    case 'cactus':
      return (
        <>
          <path
            d="M10 21V6a2 2 0 1 1 4 0v15"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M10 21V6a2 2 0 1 1 4 0v15M10 13H7.5A2.5 2.5 0 0 1 5 10.5V8.5a1.5 1.5 0 0 1 3 0v1.5h2M14 15h2.5a2.5 2.5 0 0 0 2.5-2.5v-3a1.5 1.5 0 0 0-3 0V12h-2M6 21h12" />
        </>
      );

    case 'bird':
      return (
        <>
          <path
            d="M16 7a3.5 3.5 0 0 1 3.5 3.5c0 4.5-4.5 8.5-10 8.5-3.2 0-5.5-1.3-6.5-3 2.5-.2 4.5-1.5 5.5-3.5l-3.5-2c2.5-1 5-.5 6.8 1 .4-2.5 2-4.5 4.2-4.5ZM19.5 9l2-.5"
            fill="currentColor"
            fillOpacity="0.18"
          />
        </>
      );

    case 'church':
      return (
        <>
          <path d="M12 2v4M10 4h4" />
          <path d="m6 11 6-5 6 5v10H6V11Z" fill="currentColor" fillOpacity="0.16" />
          <path d="m6 11 6-5 6 5v10H6V11ZM3 14l3-2v9H3v-7ZM21 14l-3-2v9h3v-7ZM10 21v-4.5a2 2 0 0 1 4 0V21" />
        </>
      );

    case 'accordion':
      return (
        <>
          <rect x="3" y="6" width="4" height="12" rx="1.2" fill="currentColor" fillOpacity="0.2" />
          <rect x="17" y="6" width="4" height="12" rx="1.2" fill="currentColor" fillOpacity="0.2" />
          <rect x="3" y="6" width="4" height="12" rx="1.2" />
          <rect x="17" y="6" width="4" height="12" rx="1.2" />
          <path d="m7 7 2.5-1.5L12 7l2.5-1.5L17 7v10l-2.5 1.5L12 17l-2.5 1.5L7 17V7ZM9.5 5.5v13M12 7v10M14.5 5.5v13" />
        </>
      );

    case 'hospital':
      return (
        <>
          <rect x="4" y="4" width="16" height="17" rx="2.5" fill="currentColor" fillOpacity="0.15" />
          <rect x="4" y="4" width="16" height="17" rx="2.5" />
          <path d="M12 7.5v5M9.5 10h5M9.5 21v-4.5h5V21" />
        </>
      );

    case 'mountain':
      return (
        <>
          <polygon points="3,19 10,6 15,14 17.5,10.5 21,19" fill="currentColor" fillOpacity="0.18" />
          <polygon points="3,19 10,6 15,14 17.5,10.5 21,19" />
          <path d="m7.5 10.6 2.5 1.4 2.3-1.4" />
        </>
      );

    case 'tree':
      return (
        <>
          <path
            d="M12 3a6 6 0 0 0-5.4 8.6A4.5 4.5 0 0 0 8.5 19h7a4.5 4.5 0 0 0 1.9-7.4A6 6 0 0 0 12 3Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="M12 3a6 6 0 0 0-5.4 8.6A4.5 4.5 0 0 0 8.5 19h7a4.5 4.5 0 0 0 1.9-7.4A6 6 0 0 0 12 3ZM12 15v6M10 15l2 2 2-2" />
        </>
      );

    case 'cart':
      return (
        <>
          <path d="M3 4h2.2l2.2 10.5h9.8l2-7.5H6.2" fill="currentColor" fillOpacity="0.16" />
          <circle cx="9" cy="19" r="1.6" />
          <circle cx="17" cy="19" r="1.6" />
        </>
      );

    case 'plane':
      return (
        <path
          d="M21 15v-2l-7.5-4.5V3.8a1.5 1.5 0 0 0-3 0v4.7L3 13v2l7.5-2.2v4.7L8 19v1.5l4-1 4 1V19l-2.5-1.5v-4.7L21 15Z"
          fill="currentColor"
          fillOpacity="0.18"
        />
      );
  }
}

export interface IconeProps {
  nome: NomeIcone | string;
  tamanho?: number | string;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

/**
 * Ícone vetorial alinhado ao Design System Fun-Isometric / Slab da plataforma Matrícula Aberta.
 * Segue as diretrizes de acessibilidade e alinhamento óptico por cap-height.
 */
export function Icone({ nome, tamanho = '1.15em', className, style, label }: IconeProps) {
  const resolvido = resolverNomeIcone(nome);
  const classes = ['ma-icone', className].filter(Boolean).join(' ');
  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={style}
    >
      {renderizarGeometria(resolvido)}
    </svg>
  );
}

export function IconeEtapa({
  etapa,
  tamanho = '1.2em',
  className,
}: {
  etapa?: EtapaId | null;
  tamanho?: number | string;
  className?: string;
}) {
  return <Icone nome={etapa ?? 'pre'} tamanho={tamanho} className={className} />;
}

export function IconeStatus({
  status,
  tamanho = '1.1em',
  className,
}: {
  status: StatusVaga;
  tamanho?: number | string;
  className?: string;
}) {
  const mapa: Record<StatusVaga, NomeIcone> = {
    aberta: 'check-circle',
    ultimas: 'bolt',
    espera: 'hourglass',
  };
  return <Icone nome={mapa[status]} tamanho={tamanho} className={className} />;
}

export function IconeUnidade({
  tipo,
  tamanho = '1.35em',
  className,
}: {
  tipo: TipoUnidade | string;
  tamanho?: number | string;
  className?: string;
}) {
  return <Icone nome={resolverNomeIcone(tipo, 'school')} tamanho={tamanho} className={className} />;
}

export function IconeDocumento({
  id,
  icone,
  tamanho = '1.35em',
  className,
}: {
  id: string;
  icone?: string;
  tamanho?: number | string;
  className?: string;
}) {
  return <Icone nome={resolverNomeIcone(id, resolverNomeIcone(icone, 'file-text'))} tamanho={tamanho} className={className} />;
}

