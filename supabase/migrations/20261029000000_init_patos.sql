-- =========================================================================
-- MIGRATION OFICIAL SUPABASE POSTGRESQL · MATRÍCULA ABERTA (PATOS - PB)
-- Município: Patos - PB (IBGE 2510808) · Coordenadas: -7.0244, -37.2769
-- =========================================================================

-- 1. Bairros de Patos - PB
CREATE TABLE IF NOT EXISTS bairros_patos (
  id TEXT PRIMARY KEY,
  rotulo TEXT NOT NULL UNIQUE,
  zona TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  ordem INTEGER NOT NULL
);

-- 2. Documentos de Matrícula Catalogados
CREATE TABLE IF NOT EXISTS documentos_catalogo (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  dica TEXT NOT NULL,
  emoji TEXT NOT NULL,
  obrigatorio INTEGER NOT NULL DEFAULT 1,
  etapas_json TEXT,
  ordem INTEGER NOT NULL
);

-- 3. Unidades Escolares da Rede Municipal de Patos - PB
CREATE TABLE IF NOT EXISTS escolas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Creche', 'CMEI', 'EMEF')),
  bairro TEXT NOT NULL,
  endereco TEXT NOT NULL,
  telefone TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  acessivel INTEGER NOT NULL DEFAULT 1,
  destaques_json TEXT NOT NULL DEFAULT '[]',
  atendimento TEXT NOT NULL,
  atualizado_em BIGINT NOT NULL
);

-- 4. Ofertas de Vagas por Turma / Período
CREATE TABLE IF NOT EXISTS ofertas (
  escola_id TEXT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL CHECK (etapa IN ('bercario', 'maternal', 'pre', 'fund1', 'fund2')),
  periodo TEXT NOT NULL CHECK (periodo IN ('integral', 'parcial')),
  vagas INTEGER NOT NULL CHECK (vagas >= 0),
  capacidade INTEGER NOT NULL CHECK (capacidade > 0),
  fila INTEGER NOT NULL DEFAULT 0 CHECK (fila >= 0),
  PRIMARY KEY (escola_id, etapa, periodo)
);

-- 5. Trilha de Auditoria em Tempo Real
CREATE TABLE IF NOT EXISTS historico_vagas (
  id TEXT PRIMARY KEY,
  escola_id TEXT NOT NULL,
  escola_nome TEXT NOT NULL,
  etapa TEXT NOT NULL,
  periodo TEXT NOT NULL,
  de INTEGER NOT NULL,
  para INTEGER NOT NULL,
  em BIGINT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('escola', 'protocolo', 'secretaria'))
);

-- 6. Alertas de Vagas (LGPD)
CREATE TABLE IF NOT EXISTS alertas (
  id TEXT PRIMARY KEY,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'push')),
  telefone_mascarado TEXT,
  telefone_hash TEXT,
  etapa TEXT NOT NULL,
  periodo TEXT NOT NULL,
  local_lat REAL NOT NULL,
  local_lng REAL NOT NULL,
  local_rotulo TEXT NOT NULL,
  raio_km REAL NOT NULL,
  escola_id TEXT,
  escola_nome TEXT,
  criado_em BIGINT NOT NULL,
  expira_em BIGINT NOT NULL
);

-- 7. Protocolos de Atendimento Presencial com QR Code (PATOS-2027-XXXX)
CREATE TABLE IF NOT EXISTS protocolos_visita (
  codigo TEXT PRIMARY KEY,
  escola_id TEXT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  escola_nome TEXT NOT NULL,
  escola_endereco TEXT NOT NULL,
  escola_bairro TEXT NOT NULL,
  etapa TEXT NOT NULL,
  turma TEXT NOT NULL,
  periodo TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  telefone_mascarado TEXT,
  nascimento TEXT,
  turno_visita TEXT NOT NULL CHECK (turno_visita IN ('manha', 'tarde')),
  data_visita TEXT NOT NULL,
  documentos_json TEXT NOT NULL DEFAULT '[]',
  total_obrigatorios INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL CHECK (status IN ('aguardando', 'atendido', 'cancelado')),
  criado_em BIGINT NOT NULL,
  atendido_em BIGINT
);

CREATE INDEX IF NOT EXISTS idx_historico_em ON historico_vagas(em DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_etapa ON alertas(etapa);
CREATE INDEX IF NOT EXISTS idx_protocolos_escola ON protocolos_visita(escola_id, criado_em DESC);

-- Habilitar Row Level Security (RLS) no Supabase
ALTER TABLE bairros_patos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocolos_visita ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público (Leitura anônima para transparência cidadã)
CREATE POLICY "Permitir leitura publica bairros" ON bairros_patos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica documentos" ON documentos_catalogo FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica escolas" ON escolas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica ofertas" ON ofertas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica historico" ON historico_vagas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica alertas" ON alertas FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica protocolos" ON protocolos_visita FOR SELECT USING (true);

-- =========================================================================
-- SEED INICIAL DE PATOS - PB
-- =========================================================================

-- Bairros de Patos - PB
INSERT INTO bairros_patos (id, rotulo, zona, lat, lng, ordem) VALUES
  ('centro', 'Centro', 'Zona Central', -7.0244, -37.2769, 1),
  ('belo-horizonte', 'Belo Horizonte', 'Zona Norte', -7.0148, -37.2742, 2),
  ('maternidade', 'Maternidade', 'Zona Oeste', -7.0218, -37.2874, 3),
  ('jatoba', 'Jatobá', 'Zona Sul', -7.0432, -37.2725, 4),
  ('salgadinho', 'Salgadinho', 'Zona Leste', -7.0182, -37.2621, 5),
  ('liberdade', 'Liberdade', 'Zona Oeste', -7.0285, -37.2848, 6),
  ('sao-sebastiao', 'São Sebastião', 'Zona Leste', -7.0249, -37.2665, 7),
  ('noe-trajano', 'Noé Trajano', 'Zona Norte', -7.0122, -37.2839, 8),
  ('monte-castelo', 'Monte Castelo', 'Zona Sul', -7.0488, -37.2791, 9),
  ('vitoria', 'Vitória', 'Zona Leste', -7.0205, -37.2554, 10)
ON CONFLICT (id) DO NOTHING;

-- Documentos Oficiais
INSERT INTO documentos_catalogo (id, nome, dica, emoji, obrigatorio, etapas_json, ordem) VALUES
  ('certidao', 'Certidão de nascimento da criança', 'Original e uma cópia legível.', '📄', 1, NULL, 1),
  ('cpf-crianca', 'CPF da criança', 'Pode constar na própria certidão de nascimento.', '🪪', 1, NULL, 2),
  ('doc-resp', 'Documento oficial com foto do responsável', 'RG, CIN, CNH ou Carteira de Trabalho.', '🧑', 1, NULL, 3),
  ('cpf-resp', 'CPF do pai, mãe ou responsável legal', 'Pode estar no RG ou CNH.', '🔢', 1, NULL, 4),
  ('residencia', 'Comprovante de residência em Patos - PB', 'Conta da Energisa, Cagepa ou contrato recente.', '🏠', 1, NULL, 5),
  ('vacina', 'Carteira de vacinação atualizada (UBS)', 'Emitida ou atualizada em qualquer UBS de Patos.', '💉', 1, '["bercario","maternal","pre","fund1"]', 6),
  ('sus', 'Cartão Nacional do SUS da criança', 'Obrigatório para cadastro na Rede Municipal de Patos.', '🏥', 1, '["bercario","maternal","pre"]', 7),
  ('historico', 'Declaração provisória ou Histórico Escolar', 'Solicite na escola anterior (30 dias para o definitivo).', '🎓', 1, '["fund1","fund2"]', 8),
  ('trabalho', 'Comprovante de trabalho dos responsáveis', 'Prioridade para vagas de tempo integral nas creches.', '💼', 0, '["bercario","maternal"]', 9),
  ('nis', 'Número do NIS / Cartão Bolsa Família (CadÚnico)', 'Garante prioridade social conforme diretriz municipal.', '💳', 0, NULL, 10),
  ('laudo', 'Laudo médico ou parecer multiprofissional (AEE)', 'Para estudantes com deficiência, TEA ou altas habilidades.', '🩺', 0, NULL, 11)
ON CONFLICT (id) DO NOTHING;

-- 12 Unidades da Rede Municipal de Patos - PB
INSERT INTO escolas (id, nome, tipo, bairro, endereco, telefone, lat, lng, acessivel, destaques_json, atendimento, atualizado_em) VALUES
  ('creche-manoel-quinidio', 'Creche Municipal Manoel Quinídio Sobrinho', 'Creche', 'Jatobá', 'Rua Manoel Mota, 340 – Jatobá, Patos - PB', '(83) 3421-3101', -7.0424, -37.2731, 1, '["Período integral", "Berçário climatizado", "Acessível", "Lactário próprio"]', 'Seg a sex · 7h às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '8 minutes') * 1000),
  ('creche-tia-luci', 'Creche Municipal Tia Luci', 'Creche', 'Belo Horizonte', 'Rua Horácio Nóbrega, 815 – Belo Horizonte, Patos - PB', '(83) 3421-3108', -7.0156, -37.2735, 1, '["Período integral", "Horta pedagógica", "Acessível"]', 'Seg a sex · 7h às 16h30', EXTRACT(EPOCH FROM NOW() - INTERVAL '19 minutes') * 1000),
  ('creche-maria-eunice', 'Creche Municipal Maria Eunice', 'Creche', 'Maternidade', 'Rua Pedro Firmino, 620 – Maternidade, Patos - PB', '(83) 3421-3115', -7.0225, -37.2862, 1, '["Período integral", "Sala de leitura infantil", "Acessível"]', 'Seg a sex · 7h às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '14 minutes') * 1000),
  ('cmei-pedro-satiro', 'CMEI Dr. Pedro Sátiro', 'CMEI', 'Liberdade', 'Rua Lima Campos, 490 – Liberdade, Patos - PB', '(83) 3421-3122', -7.0278, -37.2841, 1, '["Brinquedoteca", "Pátio coberto", "Acessível", "AEE"]', 'Seg a sex · 7h30 às 16h30', EXTRACT(EPOCH FROM NOW() - INTERVAL '32 minutes') * 1000),
  ('creche-dona-nini', 'Creche Municipal Dona Nini', 'Creche', 'São Sebastião', 'Av. Rio Branco, 305 – São Sebastião, Patos - PB', '(83) 3421-3130', -7.0243, -37.2659, 0, '["Período integral", "Alimentação balanceada PNAE"]', 'Seg a sex · 7h às 16h', EXTRACT(EPOCH FROM NOW() - INTERVAL '2 hours') * 1000),
  ('creche-igor-mota', 'Creche Municipal Igor Mota', 'Creche', 'Monte Castelo', 'Rua Projetada Sul, 118 – Monte Castelo, Patos - PB', '(83) 3421-3144', -7.0481, -37.2784, 1, '["Unidade nova climatizada", "Período integral", "Acessível"]', 'Seg a sex · 7h às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '41 minutes') * 1000),
  ('emef-monsenhor-manoel-vieira', 'EMEF Monsenhor Manoel Vieira', 'EMEF', 'Centro', 'Praça Edvaldo Mota, 85 – Centro, Patos - PB', '(83) 3421-3201', -7.0239, -37.2775, 1, '["Quadra poliesportiva coberta", "Sala de Recursos AEE", "Laboratório de Ciências", "Acessível"]', 'Seg a sex · 7h30 às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '11 minutes') * 1000),
  ('emef-sabino-freire', 'EMEF Sabino Freire', 'EMEF', 'Maternidade', 'Rua Doutor Romero Nóbrega, 412 – Maternidade, Patos - PB', '(83) 3421-3210', -7.0209, -37.2881, 1, '["Reforço escolar no contraturno", "Banda marcial escolar", "Acessível"]', 'Seg a sex · 7h30 às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '27 minutes') * 1000),
  ('emef-aristides-hamad-timene', 'EMEF Aristides Hamad Timene', 'EMEF', 'Belo Horizonte', 'Rua Augusto dos Anjos, 275 – Belo Horizonte, Patos - PB', '(83) 3421-3224', -7.0141, -37.2751, 1, '["Robótica educacional", "Biblioteca climatizada", "Acessível"]', 'Seg a sex · 7h30 às 16h30', EXTRACT(EPOCH FROM NOW() - INTERVAL '49 minutes') * 1000),
  ('emef-jose-perminio-wanderley', 'EMEF José Permínio Wanderley', 'EMEF', 'Salgadinho', 'Rua Manoel Torres, 510 – Salgadinho, Patos - PB', '(83) 3421-3238', -7.0178, -37.2615, 0, '["Esporte escolar", "Oficina de leitura e cordel"]', 'Seg a sex · 8h às 16h30', EXTRACT(EPOCH FROM NOW() - INTERVAL '60 hours') * 1000),
  ('emef-alirio-meira-wanderley', 'EMEF Alírio Meira Wanderley', 'EMEF', 'Jatobá', 'Rua Alto Casteliano, 790 – Jatobá, Patos - PB', '(83) 3421-3245', -7.0441, -37.2718, 1, '["Tempo integral", "Quadra coberta", "Atendimento AEE", "Acessível"]', 'Seg a sex · 7h às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '16 minutes') * 1000),
  ('emef-nosso-lar-tio-juca', 'EMEF Nosso Lar Tio Juca', 'EMEF', 'Noé Trajano', 'Rua Projetada Norte, 204 – Noé Trajano, Patos - PB', '(83) 3421-3259', -7.0119, -37.2832, 1, '["Educação infantil e fundamental", "Acessível", "Projeto Música na Escola"]', 'Seg a sex · 7h30 às 17h', EXTRACT(EPOCH FROM NOW() - INTERVAL '3 hours') * 1000)
ON CONFLICT (id) DO NOTHING;

-- Ofertas por Unidade
INSERT INTO ofertas (escola_id, etapa, periodo, vagas, capacidade, fila) VALUES
  ('creche-manoel-quinidio', 'bercario', 'integral', 2, 24, 0),
  ('creche-manoel-quinidio', 'maternal', 'integral', 6, 40, 0),
  ('creche-manoel-quinidio', 'pre', 'parcial', 5, 35, 0),
  ('creche-tia-luci', 'bercario', 'integral', 0, 20, 9),
  ('creche-tia-luci', 'maternal', 'integral', 1, 35, 0),
  ('creche-tia-luci', 'pre', 'parcial', 7, 45, 0),
  ('creche-maria-eunice', 'bercario', 'integral', 5, 25, 0),
  ('creche-maria-eunice', 'maternal', 'integral', 8, 42, 0),
  ('creche-maria-eunice', 'maternal', 'parcial', 4, 25, 0),
  ('cmei-pedro-satiro', 'bercario', 'integral', 0, 22, 6),
  ('cmei-pedro-satiro', 'maternal', 'parcial', 3, 32, 0),
  ('cmei-pedro-satiro', 'pre', 'parcial', 9, 50, 0),
  ('cmei-pedro-satiro', 'pre', 'integral', 2, 25, 0),
  ('creche-dona-nini', 'bercario', 'integral', 4, 20, 0),
  ('creche-dona-nini', 'maternal', 'integral', 0, 30, 5),
  ('creche-dona-nini', 'pre', 'parcial', 6, 40, 0),
  ('creche-igor-mota', 'bercario', 'integral', 7, 26, 0),
  ('creche-igor-mota', 'maternal', 'integral', 10, 45, 0),
  ('creche-igor-mota', 'pre', 'parcial', 8, 48, 0),
  ('emef-monsenhor-manoel-vieira', 'fund1', 'parcial', 9, 180, 0),
  ('emef-monsenhor-manoel-vieira', 'fund1', 'integral', 3, 60, 0),
  ('emef-monsenhor-manoel-vieira', 'fund2', 'parcial', 11, 160, 0),
  ('emef-sabino-freire', 'pre', 'parcial', 4, 50, 0),
  ('emef-sabino-freire', 'fund1', 'parcial', 7, 150, 0),
  ('emef-sabino-freire', 'fund2', 'parcial', 5, 120, 0),
  ('emef-aristides-hamad-timene', 'fund1', 'parcial', 0, 140, 8),
  ('emef-aristides-hamad-timene', 'fund2', 'parcial', 6, 130, 0),
  ('emef-jose-perminio-wanderley', 'pre', 'parcial', 3, 40, 0),
  ('emef-jose-perminio-wanderley', 'fund1', 'parcial', 8, 140, 0),
  ('emef-jose-perminio-wanderley', 'fund2', 'parcial', 9, 130, 0),
  ('emef-alirio-meira-wanderley', 'fund1', 'integral', 1, 90, 0),
  ('emef-alirio-meira-wanderley', 'fund1', 'parcial', 5, 120, 0),
  ('emef-alirio-meira-wanderley', 'fund2', 'parcial', 0, 110, 11),
  ('emef-nosso-lar-tio-juca', 'maternal', 'parcial', 5, 35, 0),
  ('emef-nosso-lar-tio-juca', 'pre', 'parcial', 6, 45, 0),
  ('emef-nosso-lar-tio-juca', 'fund1', 'parcial', 11, 130, 0),
  ('emef-nosso-lar-tio-juca', 'fund2', 'parcial', 7, 100, 0)
ON CONFLICT (escola_id, etapa, periodo) DO NOTHING;

