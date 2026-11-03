import { test, expect } from '@playwright/test';

test.describe('Fluxo Secretaria de Educação (SEDUC - Patos PB)', () => {
  test.beforeEach(async ({ page }) => {
    // Acessa a tela de gestão e faz login como Secretaria
    await page.goto('/#/gestao');

    // Se já estiver logado, não precisa reenviar
    const tituloHero = page.locator('h1:has-text("Secretaria Municipal de Educação")');
    if (!(await tituloHero.isVisible())) {
      await page.locator('input[name="username"]').fill('secretario.educacao@patos.pb.gov.br');
      await page.locator('input[name="password"]').fill('patos2026');
      await page.locator('button[type="submit"]:has-text("Entrar na Secretaria")').click();
    }

    await expect(page.locator('h1:has-text("Secretaria Municipal de Educação")')).toBeVisible({ timeout: 10_000 });
  });

  test('Deve exibir KPIs Macro da rede com hierarquia e dados consolidados', async ({ page }) => {
    // Valida container de KPIs da Secretaria
    await expect(page.locator('.kpis-secretaria-grid')).toBeVisible();

    // Valida os indicadores essenciais
    await expect(page.locator('.kpi-card-rotulo:has-text("Vagas Livres")')).toBeVisible();
    await expect(page.locator('.kpi-card-rotulo:has-text("Taxa de Ocupação")')).toBeVisible();
    await expect(page.locator('.kpi-card-rotulo:has-text("Demanda Reprimida")')).toBeVisible();
    await expect(page.locator('.kpi-card-rotulo:has-text("Absenteísmo")')).toBeVisible();

    // Valida tabela de demanda reprimida por bairro em Patos - PB
    await expect(page.locator('text=Demanda Reprimida por Bairro em Patos - PB')).toBeVisible();
  });

  test('Deve navegar para Fila & Regulação Auditável e validar scores e status sem quebra', async ({ page }) => {
    // Clica na sub-aba Fila & Regulação Auditável
    await page.locator('button:has-text("Fila & Regulação Auditável")').click();

    // Valida bloco de Regulação
    await expect(page.locator('text=Regulação Municipal & Fila Unificada Auditável')).toBeVisible();

    // Valida filtros de etapa
    await expect(page.locator('button.filtro-chip-btn:has-text("Todas as Etapas")')).toBeVisible();

    // Clica no filtro "Maternal"
    await page.locator('button.filtro-chip-btn:has-text("Maternal")').click();
    await page.waitForTimeout(300);

    // Retorna para "Todas as Etapas"
    await page.locator('button.filtro-chip-btn:has-text("Todas as Etapas")').click();
    await page.waitForTimeout(300);

    // Valida tabela da fila
    const tabela = page.locator('.tabela-secretaria');
    await expect(tabela).toBeVisible();

    // Valida presença das colunas principais
    await expect(tabela.locator('th:has-text("Protocolo")')).toBeVisible();
    await expect(tabela.locator('th:has-text("Score Regulatório")')).toBeVisible();
    await expect(tabela.locator('th:has-text("Status")')).toBeVisible();

    // Valida se os badges de status renderizam com o ponto indicador (.status-fila-ponto)
    const statusBadges = page.locator('.status-fila-badge');
    if ((await statusBadges.count()) > 0) {
      await expect(statusBadges.first().locator('.status-fila-ponto')).toBeVisible();
    }
  });

  test('Deve autuar Mandado Judicial e emitir Certidão Oficial SHA-256 na Central PJ-e', async ({ page }) => {
    // Clica na sub-aba Demandas Judiciais
    await page.locator('button:has-text("Demandas Judiciais (PJ-e)")').click();

    // Valida título da central
    await expect(page.locator('text=Central de Demandas Judiciais & Liminares (PJ-e)')).toBeVisible();

    // Clica em "+ Autuar Mandado Judicial"
    await page.locator('button:has-text("+ Autuar Mandado Judicial")').click();

    // Preenche o formulário do mandado
    const modal = page.locator('.sheet-conteudo:has-text("Autuar Determinação Judicial")');
    await expect(modal).toBeVisible();

    const randomId = Math.floor(1000 + Math.random() * 9000);
    await modal.locator('input[placeholder*="0000000-00"]').fill(`080${randomId}-99.2026.8.15.0251`);
    await modal.locator('input[placeholder*="Nome do menor"]').fill('Lucas Ryan dos Santos');
    await modal.locator('input[placeholder*="000.000.000-00"]').fill('123.456.789-01');
    await modal.locator('input[placeholder*="Nome do responsável"]').or(modal.locator('label:has-text("Nome do Responsável") + input, label:has-text("Responsável Legal") ~ input')).first().fill('Camila dos Santos');

    // Submete a autuação judicial
    await modal.locator('button[type="submit"]:has-text("Autuar Mandado Judicial")').click();

    // Demanda cadastrada deve aparecer
    await expect(page.locator(`text=080${randomId}`)).toBeVisible({ timeout: 8_000 });

    // Testa emissão de Certidão Oficial SHA-256 para uma demanda cumprida
    const btnCertidao = page.locator('button:has-text("Emitir Certidão (PJ-e)")').first();
    if (await btnCertidao.isVisible()) {
      await btnCertidao.click();

      // Modal da certidão deve abrir
      const modalCertidao = page.locator('.sheet-conteudo:has-text("Certidão de Cumprimento")');
      await expect(modalCertidao).toBeVisible();
      await expect(modalCertidao.locator('text=ESTADO DA PARAÍBA')).toBeVisible();

      // Fecha o modal da certidão
      await modalCertidao.locator('button[aria-label="Fechar"]').click();
    }
  });

  test('Deve inspecionar a Trilha de Auditoria Governamental (TCE-PB / MP-PB)', async ({ page }) => {
    // Clica na sub-aba Trilha de Auditoria
    await page.locator('button:has-text("Trilha de Auditoria")').click();

    // Valida título da trilha
    await expect(page.locator('text=Trilha de Auditoria Governamental (TCE-PB / MP-PB)')).toBeVisible();

    // Valida botões de filtro
    await expect(page.locator('button.filtro-chip-btn:has-text("Todas")')).toBeVisible();
    await expect(page.locator('button.filtro-chip-btn:has-text("Judiciais")')).toBeVisible();

    // Clica no filtro "Judiciais"
    await page.locator('button.filtro-chip-btn:has-text("Judiciais")').click();
    await page.waitForTimeout(300);

    // Valida presença da tabela de auditoria
    const tabelaAuditoria = page.locator('.tabela-secretaria').first();
    await expect(tabelaAuditoria).toBeVisible();
    await expect(tabelaAuditoria.locator('th:has-text("Operador / Papel")')).toBeVisible();
    await expect(tabelaAuditoria.locator('th:has-text("Ação Regulada")')).toBeVisible();
  });
});
