import type { CatalogoMunicipioDTO, Documento, EtapaId, Local } from '../../../../shared/src/index.ts';
import { db } from '../../infra/db.ts';

export const MUNICIPIO_PATOS_META = {
  municipio: 'Patos',
  uf: 'PB',
  codigoIbge: '2510808',
  dddPadrao: '83',
  orgao: 'Secretaria Municipal de Educação de Patos - PB',
  enderecoSecretaria: 'Rua Bossuet Wanderley, 210 – Centro, Patos - PB',
  telefoneSecretaria: '(83) 3421-2204',
  centro: {
    id: 'centro',
    lat: -7.0244,
    lng: -37.2769,
    rotulo: 'Centro',
    zona: 'Zona Central',
  } satisfies Local,
};

const BAIRROS_PATOS_INICIAL: Array<Local & { id: string; zona: string }> = [
  { id: 'centro', rotulo: 'Centro', zona: 'Zona Central', lat: -7.0244, lng: -37.2769 },
  { id: 'belo-horizonte', rotulo: 'Belo Horizonte', zona: 'Zona Norte', lat: -7.0148, lng: -37.2742 },
  { id: 'maternidade', rotulo: 'Maternidade', zona: 'Zona Oeste', lat: -7.0218, lng: -37.2874 },
  { id: 'jatoba', rotulo: 'Jatobá', zona: 'Zona Sul', lat: -7.0432, lng: -37.2725 },
  { id: 'salgadinho', rotulo: 'Salgadinho', zona: 'Zona Leste', lat: -7.0182, lng: -37.2621 },
  { id: 'liberdade', rotulo: 'Liberdade', zona: 'Zona Oeste', lat: -7.0285, lng: -37.2848 },
  { id: 'sao-sebastiao', rotulo: 'São Sebastião', zona: 'Zona Leste', lat: -7.0249, lng: -37.2665 },
  { id: 'noe-trajano', rotulo: 'Noé Trajano', zona: 'Zona Norte', lat: -7.0122, lng: -37.2839 },
  { id: 'monte-castelo', rotulo: 'Monte Castelo', zona: 'Zona Sul', lat: -7.0488, lng: -37.2791 },
  { id: 'vitoria', rotulo: 'Vitória', zona: 'Zona Leste', lat: -7.0205, lng: -37.2554 },
];

const DOCUMENTOS_INICIAL: Documento[] = [
  { id: 'certidao', nome: 'Certidão de nascimento da criança', dica: 'Original e uma cópia legível.', emoji: '📄', obrigatorio: true },
  { id: 'cpf-crianca', nome: 'CPF da criança', dica: 'Pode constar na própria certidão de nascimento.', emoji: '🪪', obrigatorio: true },
  { id: 'doc-resp', nome: 'Documento oficial com foto do responsável', dica: 'RG, CIN, CNH ou Carteira de Trabalho.', emoji: '🧑', obrigatorio: true },
  { id: 'cpf-resp', nome: 'CPF do pai, mãe ou responsável legal', dica: 'Pode estar no RG ou CNH.', emoji: '🔢', obrigatorio: true },
  { id: 'residencia', nome: 'Comprovante de residência em Patos - PB', dica: 'Conta da Energisa, Cagepa ou contrato de aluguel recente.', emoji: '🏠', obrigatorio: true },
  { id: 'vacina', nome: 'Carteira de vacinação atualizada (UBS)', dica: 'Emitida ou atualizada em qualquer UBS de Patos.', emoji: '💉', obrigatorio: true, etapas: ['bercario', 'maternal', 'pre', 'fund1'] },
  { id: 'sus', nome: 'Cartão Nacional do SUS da criança', dica: 'Obrigatório para cadastro na Rede Municipal de Patos.', emoji: '🏥', obrigatorio: true, etapas: ['bercario', 'maternal', 'pre'] },
  { id: 'historico', nome: 'Declaração provisória ou Histórico Escolar', dica: 'Solicite na escola anterior (prazo de 30 dias para o definitivo).', emoji: '🎓', obrigatorio: true, etapas: ['fund1', 'fund2'] },
  { id: 'trabalho', nome: 'Comprovante de trabalho dos responsáveis', dica: 'Prioridade para vagas de tempo integral nas creches municipais.', emoji: '💼', obrigatorio: false, etapas: ['bercario', 'maternal'] },
  { id: 'nis', nome: 'Número do NIS / Cartão Bolsa Família (CadÚnico)', dica: 'Garante prioridade social conforme diretriz municipal.', emoji: '💳', obrigatorio: false },
  { id: 'laudo', nome: 'Laudo médico ou parecer multiprofissional (AEE)', dica: 'Para estudantes com deficiência, TEA ou altas habilidades.', emoji: '🩺', obrigatorio: false },
];

export function garantirSeedCatalogoPatos() {
  const qtdBairros = (db.prepare('SELECT COUNT(*) as c FROM bairros_patos').get() as { c: number }).c;
  if (qtdBairros === 0) {
    const insBairro = db.prepare(`
      INSERT INTO bairros_patos (id, rotulo, zona, lat, lng, ordem)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    BAIRROS_PATOS_INICIAL.forEach((b, idx) => {
      insBairro.run(b.id, b.rotulo, b.zona, b.lat, b.lng, idx + 1);
    });
  }

  const qtdDocs = (db.prepare('SELECT COUNT(*) as c FROM documentos_catalogo').get() as { c: number }).c;
  if (qtdDocs === 0) {
    const insDoc = db.prepare(`
      INSERT INTO documentos_catalogo (id, nome, dica, emoji, obrigatorio, etapas_json, ordem)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    DOCUMENTOS_INICIAL.forEach((d, idx) => {
      insDoc.run(
        d.id,
        d.nome,
        d.dica,
        d.emoji,
        d.obrigatorio ? 1 : 0,
        d.etapas ? JSON.stringify(d.etapas) : null,
        idx + 1,
      );
    });
  }
}

export function listarBairrosPatos(): Local[] {
  const rows = db.prepare('SELECT id, rotulo, zona, lat, lng FROM bairros_patos ORDER BY ordem ASC').all() as Array<{
    id: string;
    rotulo: string;
    zona: string;
    lat: number;
    lng: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    rotulo: r.rotulo,
    zona: r.zona,
    lat: r.lat,
    lng: r.lng,
  }));
}

export function listarDocumentosCatalogo(): Documento[] {
  const rows = db
    .prepare('SELECT id, nome, dica, emoji, obrigatorio, etapas_json FROM documentos_catalogo ORDER BY ordem ASC')
    .all() as Array<{
    id: string;
    nome: string;
    dica: string;
    emoji: string;
    obrigatorio: number;
    etapas_json: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    dica: r.dica,
    emoji: r.emoji,
    obrigatorio: Boolean(r.obrigatorio),
    etapas: r.etapas_json ? (JSON.parse(r.etapas_json) as EtapaId[]) : undefined,
  }));
}

export function obterCatalogoMunicipio(): CatalogoMunicipioDTO {
  return {
    ...MUNICIPIO_PATOS_META,
    bairros: listarBairrosPatos(),
    documentos: listarDocumentosCatalogo(),
  };
}

