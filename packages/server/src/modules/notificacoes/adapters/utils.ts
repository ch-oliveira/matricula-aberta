/**
 * Normaliza número de telefone brasileiro para o formato E.164 internacional sem o caractere '+'
 * Exemplo: "(83) 98888-7777" -> "5583988887777"
 * Exemplo: "083999998888" -> "5583999998888"
 * Exemplo: "+55 (83) 99999-8888" -> "5583999998888"
 */
export function normalizarTelefoneWhatsApp(tel: string): string {
  if (!tel) return '';
  let limpo = tel.replace(/\D/g, '');

  // Remove zero à esquerda do DDD caso exista (ex: 083 -> 83)
  if (limpo.startsWith('0')) {
    limpo = limpo.replace(/^0+/, '');
  }

  // Se já possui DDI 55 (12 ou 13 dígitos), retorna direto
  if (limpo.startsWith('55') && (limpo.length === 12 || limpo.length === 13)) {
    return limpo;
  }

  // Se possui 10 ou 11 dígitos (DDD + número brasileiro), adiciona o DDI 55 do Brasil
  if (limpo.length === 10 || limpo.length === 11) {
    return `55${limpo}`;
  }

  return limpo;
}

/**
 * Extrai código de protocolo padrão PATOS-AAAA-XXXX a partir de um texto arbitrário
 */
export function extrairCodigoProtocoloTexto(texto: string): string | null {
  if (!texto) return null;
  const match = texto.match(/\b(PATOS-\d{4}-[A-Z0-9]{3,6})\b/i);
  return match ? match[1].toUpperCase() : null;
}
