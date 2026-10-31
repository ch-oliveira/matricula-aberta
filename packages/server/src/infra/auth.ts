import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type {
  LoginGestaoRequestDTO,
  PerfilGestao,
  SessaoGestaoDTO,
} from '../../../shared/src/index.ts';
import { db } from './db.ts';
import { HttpError } from './security.ts';

const AUTH_SECRET =
  process.env.AUTH_SECRET?.trim() ||
  createHash('sha256')
    .update(`ma-patos-auth-secret:${process.env.DATABASE_URL ?? 'sqlite-local-v2'}`)
    .digest('hex');

const TTL_SESSAO_MS = 12 * 3600 * 1000; // 12 horas

const SENHAS_SECRETARIA_VALIDAS = (
  process.env.SEDUC_ADMIN_PASSWORDS ?? 'patos2026,seduc2026,admin123,1234'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const PINS_UNIDADE_VALIDOS = (process.env.UNIDADE_PINS ?? '2026,1234,patos2026,escola123')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function compararSegredoTempoConstante(entrada: string, candidatos: string[]): boolean {
  const hashEntrada = createHash('sha256').update(entrada).digest();
  let valido = false;
  for (const c of candidatos) {
    const hashCandidato = createHash('sha256').update(c).digest();
    if (timingSafeEqual(hashEntrada, hashCandidato)) {
      valido = true;
    }
  }
  return valido;
}

interface PayloadTokenInterno {
  sub: string;
  perfil: PerfilGestao;
  escolaId?: string;
  escolaNome?: string;
  iat: number;
  exp: number;
  jti: string;
}

function assinarHmacBase64Url(dados: string): string {
  return createHmac('sha256', AUTH_SECRET).update(dados).digest('base64url');
}

export function emitirTokenGestao(params: {
  usuario: string;
  perfil: PerfilGestao;
  escolaId?: string;
  escolaNome?: string;
}): SessaoGestaoDTO {
  const agora = Date.now();
  const expiraEm = agora + TTL_SESSAO_MS;
  const payload: PayloadTokenInterno = {
    sub: params.usuario,
    perfil: params.perfil,
    ...(params.escolaId ? { escolaId: params.escolaId } : {}),
    ...(params.escolaNome ? { escolaNome: params.escolaNome } : {}),
    iat: agora,
    exp: expiraEm,
    jti: randomBytes(8).toString('hex'),
  };

  const corpoBase64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const assinatura = assinarHmacBase64Url(corpoBase64);
  const token = `${corpoBase64}.${assinatura}`;

  return {
    token,
    perfil: params.perfil,
    usuario: params.usuario,
    escolaId: params.escolaId,
    escolaNome: params.escolaNome,
    expiraEm,
  };
}

export function verificarTokenGestao(tokenBruto?: string | null): SessaoGestaoDTO | null {
  if (!tokenBruto || typeof tokenBruto !== 'string') return null;
  const partes = tokenBruto.trim().split('.');
  if (partes.length !== 2) return null;

  const [corpoBase64, assinaturaRecebida] = partes;
  if (!corpoBase64 || !assinaturaRecebida) return null;

  const assinaturaEsperada = assinarHmacBase64Url(corpoBase64);
  const bufRecebida = Buffer.from(assinaturaRecebida);
  const bufEsperada = Buffer.from(assinaturaEsperada);

  if (bufRecebida.length !== bufEsperada.length || !timingSafeEqual(bufRecebida, bufEsperada)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(corpoBase64, 'base64url').toString('utf-8'),
    ) as PayloadTokenInterno;

    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
    if (payload.perfil !== 'secretaria' && payload.perfil !== 'unidade') return null;
    if (typeof payload.sub !== 'string' || !payload.sub) return null;

    return {
      token: tokenBruto.trim(),
      perfil: payload.perfil,
      usuario: payload.sub,
      escolaId: payload.escolaId,
      escolaNome: payload.escolaNome,
      expiraEm: payload.exp,
    };
  } catch {
    return null;
  }
}

export function extrairSessaoRequisicao(
  req: IncomingMessage,
  url?: URL,
): SessaoGestaoDTO | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const sessao = verificarTokenGestao(token);
    if (sessao) return sessao;
  }

  const tokenQuery = url?.searchParams.get('token');
  if (tokenQuery) {
    return verificarTokenGestao(tokenQuery);
  }

  return null;
}

export function exigirSessaoGestao(
  req: IncomingMessage,
  url?: URL,
  opcoes?: { perfil?: PerfilGestao; escolaId?: string },
): SessaoGestaoDTO {
  const sessao = extrairSessaoRequisicao(req, url);
  if (!sessao) {
    throw new HttpError(
      401,
      'Autenticação obrigatória. Faça login no painel de gestão da SEDUC ou da Unidade Escolar.',
    );
  }

  if (opcoes?.perfil === 'secretaria' && sessao.perfil !== 'secretaria') {
    throw new HttpError(
      403,
      'Acesso restrito à Secretaria Municipal de Educação de Patos - PB (SEDUC).',
    );
  }

  if (
    opcoes?.escolaId &&
    sessao.perfil === 'unidade' &&
    sessao.escolaId &&
    sessao.escolaId !== opcoes.escolaId
  ) {
    throw new HttpError(
      403,
      'Sua credencial de unidade escolar permite alterar apenas os dados da sua própria escola.',
    );
  }

  return sessao;
}

export async function autenticarCredenciaisGestao(body: Partial<LoginGestaoRequestDTO>): Promise<SessaoGestaoDTO> {
  const perfil = body.perfil;
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim().slice(0, 120) : '';
  const senha = typeof body.senha === 'string' ? body.senha.trim().slice(0, 120) : '';

  if (perfil !== 'secretaria' && perfil !== 'unidade') {
    throw new HttpError(400, 'Perfil de acesso inválido. Informe "secretaria" ou "unidade".');
  }

  if (!usuario) {
    throw new HttpError(400, 'Informe o e-mail institucional, usuário ou matrícula funcional.');
  }

  if (!senha) {
    throw new HttpError(400, 'Informe a senha ou PIN de acesso.');
  }

  if (perfil === 'secretaria') {
    const uLower = usuario.toLowerCase();
    const usuarioAutorizado =
      uLower === 'secretaria@patos.pb.gov.br' ||
      uLower === 'gestor.seduc@patos.pb.gov.br' ||
      uLower === 'admin' ||
      uLower === 'seduc' ||
      uLower.endsWith('@patos.pb.gov.br');

    const senhaAutorizada = compararSegredoTempoConstante(senha, SENHAS_SECRETARIA_VALIDAS);

    if (!usuarioAutorizado || !senhaAutorizada) {
      throw new HttpError(
        401,
        'Credenciais não autorizadas. Verifique o e-mail institucional e a senha da SEDUC.',
      );
    }

    return emitirTokenGestao({
      usuario: uLower,
      perfil: 'secretaria',
    });
  }

  // Perfil 'unidade'
  const escolaId = typeof body.escolaId === 'string' ? body.escolaId.trim() : '';
  if (!escolaId) {
    throw new HttpError(400, 'Selecione a unidade escolar de Patos - PB.');
  }

  const esc = await db.queryOne<{ id: string; nome: string }>(
    'SELECT id, nome FROM escolas WHERE id = $1',
    [escolaId],
  );

  if (!esc) {
    throw new HttpError(404, 'Unidade escolar não encontrada na rede municipal de Patos - PB.');
  }

  if (usuario.length < 2) {
    throw new HttpError(400, 'Informe um identificador válido do gestor ou secretário escolar.');
  }

  const pinAutorizado = compararSegredoTempoConstante(senha, PINS_UNIDADE_VALIDOS);
  if (!pinAutorizado) {
    throw new HttpError(401, 'PIN de segurança incorreto para esta unidade escolar.');
  }

  return emitirTokenGestao({
    usuario,
    perfil: 'unidade',
    escolaId: esc.id,
    escolaNome: esc.nome,
  });
}

export function gerarTokenCancelamentoAlerta(alertaId: string): string {
  return createHmac('sha256', AUTH_SECRET)
    .update(`cancelar-alerta:${alertaId}`)
    .digest('base64url')
    .slice(0, 24);
}

export function verificarTokenCancelamentoAlerta(
  alertaId: string,
  tokenRecebido?: string | null,
): boolean {
  if (!tokenRecebido || typeof tokenRecebido !== 'string') return false;
  const esperado = gerarTokenCancelamentoAlerta(alertaId);
  const bufRec = Buffer.from(tokenRecebido.trim());
  const bufEsp = Buffer.from(esperado);
  return bufRec.length === bufEsp.length && timingSafeEqual(bufRec, bufEsp);
}

