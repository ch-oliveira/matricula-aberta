# 🏫 Matrícula Aberta — Rede Municipal de Ensino de Patos - PB

[![CI Status](https://github.com/ch4rle2/matricula-aberta/actions/workflows/ci.yml/badge.svg)](https://github.com/ch4rle2/matricula-aberta/actions)
![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6-blue.svg)
![PWA Ready](https://img.shields.io/badge/PWA-offline%20ready-orange.svg)
![Município](https://img.shields.io/badge/município-Patos%20--%20PB%20(IBGE%202510808)-yellow.svg)
![Licença](https://img.shields.io/badge/licença-MIT-green.svg)

> **Plataforma de Governança, Regulação de Vagas e Acesso Democrático à Educação Pública Municipal.**  
> Desenvolvida sob o modelo de **Monolito Modular** com tolerância a falhas, conformidade estrita com a **LGPD (Lei 13.709/18)** e o **Marco Legal da Primeira Infância (Lei 13.257/16)**.

---

## 🧭 Visão Geral

O **Matrícula Aberta** é uma solução pública que elimina filas físicas na porta das creches e escolas municipais de **Patos - PB**. O sistema conecta em tempo real as famílias, a gestão das unidades escolares e a Secretaria Municipal de Educação (SEDUC).

```
                      ┌────────────────────────────────────────┐
                      │    Cidadão (Pais e Responsáveis)      │
                      │  Busca sem cadastro · Pré-reserva      │
                      │  Voucher Offline com QR Code e Docs    │
                      └──────────────────┬─────────────────────┘
                                         │
                                   SSE / REST
                                         │
                      ┌──────────────────▼─────────────────────┐
                      │  @matricula-aberta/server (Monolito)   │
                      │  Motor de Regras · SQLite WAL / Pg     │
                      │  LGPD Hash · Auditoria SHA-256 · RBAC  │
                      └──────────────────┬─────────────────────┘
                                         │
                                   SSE / REST
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │                                                                 │
┌───────▼──────────────────────────┐            ┌─────────────────────────▼──────┐
│  Gestão da Unidade Escolar       │            │  Secretaria de Educação (SEDUC)│
│  Bipagem de QR Code na portaria  │            │  Painel Macro · Demandas PJ-e  │
│  Confirmação de vaga em 1 clique │            │  Fila Auditável · Certidões TCE│
└──────────────────────────────────┘            └────────────────────────────────┘
```

---

## 🏛️ Os Dois Pilares da Solução

### Pilar A — Experiência do Cidadão (Acesso Universal e Sem Burocracia)
- **Consulta Pública Direta:** Sem necessidade de login prévio ou cadastro complexo para descobrir vagas.
- **Corte Pedagógico do MEC (CNE nº 2/2018):** Cálculo instantâneo da etapa adequada (Berçário, Maternal, Pré-escola, Fundamental I e II) com base na data de nascimento e no corte nacional de **31 de março**.
- **Geolocalização Calibrada (Fórmula de Haversine):** Ordenação de unidades por proximidade real da residência do cidadão em Patos - PB.
- **Pré-Reserva Garantida com Débito Atômico:** Ao emitir o protocolo, a vaga é bloqueada e reservada para a criança até o horário do atendimento presencial no dia útil agendado.
- **Voucher com QR Code ISO 100% Offline:** O comprovante digital e seu QR Code funcionam sem conexão à internet no momento do comparecimento à escola.
- **Autocancelamento com Token HMAC:** Caso a família desista, pode cancelar o protocolo diretamente pelo voucher, liberando a vaga de volta à rede instantaneamente.

### Pilar B — Regulação, Governança e Conformidade Jurídica
- **Motor de Prioridade Legal e Vulnerabilidade Social:** Pontuação regulatória auditável fundamentada no ECA (Lei 8.069/90), Lei Brasileira de Inclusão (Lei 13.146/15), Lei Berenice Piana (Lei 12.764/12) e CadÚnico/Bolsa Família.
- **Fila Pública Auditável (LGPD-Compliant):** Transparência ativa sem vazamento de dados sensíveis de menores (nomes e documentos exibidos sob mascaramento algorítmico).
- **Gestão de Demandas Judiciais (PJ-e):** Módulo para a Procuradoria Geral e SEDUC cumprirem liminares e mandados de segurança com alocação prioritária e emissão de **Certidão Eletrônica com Hash SHA-256** para juntada aos autos processuais.
- **Trilha de Auditoria Imutável (Audit Trail):** Registro de todas as mutações e decisões de vagas para fiscalização do Tribunal de Contas do Estado da Paraíba (**TCE-PB**) e Ministério Público.

---

## 📦 Estrutura do Monorepo

```
matricula-aberta/
├── packages/
│   ├── server/           # Backend HTTP nativo em TypeScript (Zero dependências pesadas)
│   │   ├── src/
│   │   │   ├── infra/    # Banco (SQLite WAL / PostgreSQL), Auth RBAC, SSE, Segurança
│   │   │   ├── modules/  # Unidades, Protocolos, Alertas, Catálogo, Regulação, Notificações
│   │   │   └── index.ts  # Servidor HTTP centralizado com rotas REST e stream SSE
│   │   └── test/         # Suíte de testes de integração, concorrência e carga
│   │
│   ├── web/              # Frontend PWA SPA em React 18 + Vite
│   │   ├── src/
│   │   │   ├── components/ # Componentes de UI, Mapa, Leitor QR WebRTC, Modais
│   │   │   ├── screens/    # Funil do Cidadão (Quem, Onde, Vagas, Visita) e Painel de Gestão
│   │   │   ├── domain/     # Regras locais, geolocalização e cálculo de etapas
│   │   │   └── services/   # Store reativo integrado ao SSE do backend
│   │   └── public/         # Manifest PWA, Service Worker offline e ícones municipais
│   │
│   └── shared/           # Contratos de domínio, DTOs compartilhados e algoritmos puros
│       └── src/index.ts  # Interfaces, tipos e validações consumidas por server e web
│
├── tests/
│   └── e2e/              # Testes ponta a ponta Playwright para os 3 perfis do sistema
│
├── supabase/             # Migrações SQL e scripts para deploy no PostgreSQL / Supabase
└── .github/workflows/    # Pipeline de CI (Typecheck, Build, Testes Unitários e Playwright E2E)
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js:** Versão 22 ou superior (recomendado **Node.js 23**)
- **NPM:** Versão 10 ou superior

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/ch4rle2/matricula-aberta.git
   cd matricula-aberta
   ```

2. **Instalar as dependências do monorepo:**
   ```bash
   npm install
   ```

3. **Configurar as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   *(Por padrão, sem `DATABASE_URL`, o sistema inicializa automaticamente com SQLite embutido em modo WAL com tolerância a falhas).*

4. **Iniciar em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   * O backend estará disponível em: `http://localhost:3333`
   * O frontend PWA estará disponível em: `http://localhost:5173`

---

## 🧪 Comandos e Testes Automatizados

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o backend (`:3333`) e o frontend (`:5173`) simultaneamente |
| `npm run dev:api` | Inicia somente o servidor backend em modo watch |
| `npm run dev:web` | Inicia somente o frontend Vite |
| `npm run typecheck` | Executa a validação estrita de tipos TypeScript em todo o monorepo |
| `npm run build` | Compila o frontend e prepara o diretório unificado `dist/` |
| `npm test` | Executa os testes de integração, segurança e regras de negócio do backend |
| `npm run test:e2e` | Executa a suíte completa de testes Playwright E2E (Cidadão, SEDUC e Escola) |
| `npm run test:load` | Executa o teste de carga e concorrência (stress test) na API |

---

## 🔑 Credenciais Padrão de Demonstração (Gestão Municipal)

Para fins de teste e homologação em ambiente local:

* **Secretaria Municipal de Educação (SEDUC):**
  * E-mail: `admin@patos.pb.gov.br` (ou `seduc@patos.pb.gov.br`)
  * Senha: `patos2026`
* **Unidades Escolares (Direção / Secretaria da Escola):**
  * PIN de Acesso da Unidade: `2026`

*(Em ambiente de produção, configure senhas fortes via variáveis `SEDUC_ADMIN_PASSWORDS` e `UNIDADE_PINS` no arquivo `.env`).*

---

## ⚙️ Variáveis de Ambiente

Consulte o arquivo [`.env.example`](file:///.env.example) para a lista completa de parâmetros suportados:

- `DATABASE_URL`: String de conexão PostgreSQL (ex.: Supabase, Neon, AWS RDS). Se omitido, opera com SQLite WAL local.
- `AUTH_SECRET`: Chave secreta HMAC para geração e validação de tokens RBAC.
- `LGPD_HASH_SALT`: Salt criptográfico para anonimização de telefones e documentos.
- `WHATSAPP_API_URL` & `WHATSAPP_API_TOKEN`: Credenciais de integração com gateway do WhatsApp (Meta Cloud API, Evolution API ou Z-API).
- `CRON_SECRET`: Chave de segurança para disparo dos endpoints periódicos de rotinas (`/api/v1/cron/rotinas`).

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.

