import QRCode from 'qrcode';
import { gerarMatrizQrCode as gerarFallback } from '@matricula-aberta/shared';

/**
 * Gera matriz booleana padrão ISO/IEC 18004 para renderização de QR Code
 * compatível com qualquer câmera de smartphone, leitor USB e webcam.
 */
export function gerarMatrizQrCodeReal(texto: string): boolean[][] {
  try {
    const qr = QRCode.create(texto, {
      errorCorrectionLevel: 'M',
    });
    const size = qr.modules.size;
    const matriz: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const linha: boolean[] = [];
      for (let c = 0; c < size; c++) {
        linha.push(Boolean(qr.modules.get(r, c)));
      }
      matriz.push(linha);
    }
    return matriz;
  } catch (err) {
    console.warn('[QR] Falha ao gerar QR ISO, usando fallback:', err);
    return gerarFallback(texto);
  }
}

/**
 * Extrai o código do protocolo (formato PATOS-AAAA-XXXX) a partir do payload
 * lido do QR Code ou digitado manualmente.
 */
export function extrairCodigoProtocolo(bruto: string): string | null {
  if (!bruto) return null;
  const limpo = bruto.trim();

  // Caso padrão: PATOS-2027-1234
  const match = limpo.match(/\b(PATOS-\d{4}-[A-Z0-9]{3,6})\b/i);
  if (match) return match[1].toUpperCase();

  // Caso contenha pipe: PATOS-2027-1234|escola-01
  const parte = limpo.split('|')[0]?.trim();
  if (parte && parte.toUpperCase().startsWith('PATOS-')) {
    return parte.toUpperCase();
  }

  return limpo.toUpperCase();
}

