import { test, expect } from '@playwright/test';

test.describe('Fluxo Unidade Escolar (Diretores e Secretários Escolares)', () => {
  test.beforeEach(async ({ page }) => {
    // Acessa tela de gestão e alterna para a aba da Unidade
    await page.goto('/#/gestao');
    await page.locator('nav[aria-label="Modo de gestão"] button:has-text("Painel da Unidade")').click();

    // Se ainda não estiver autenticado na unidade, preenche login
    const tituloHeroUnidade = page.locator('h1:has-text("Creche Municipal Manoel Quinídio")');
    if (!(await tituloHeroUnidade.isVisible())) {
      await page.locator('select[name="unidade"]').selectOption('creche-manoel-quinidio');
      await page.locator('form.login-card input[name="username"]').fill('diretora.creche@patos.pb.gov.br');
      await page.locator('form.login-card input[name="password"]').fill('2026');
      await page.locator('button[type="submit"]:has-text("Entrar no painel da unidade")').click();
    }

    await expect(page.locator('h1:has-text("Creche Municipal Manoel Quinídio")')).toBeVisible({ timeout: 10_000 });
  });

  test('Deve exibir turmas da unidade, histórico e permitir confirmar quadro de vagas', async ({ page }) => {
    // Valida endereço e bairro da escola
    await expect(page.locator('p:has-text("Jatobá")').first()).toBeVisible();

    // Valida seção de ofertas/turmas
    await expect(page.locator('section.ofertas')).toBeVisible();

    // Clica no botão de confirmar quadro de vagas hoje
    await page.locator('button:has-text("Confirmar quadro de vagas hoje")').click();

    // Toast de sucesso deve surgir
    await expect(page.locator('text=Quadro de vagas confirmado com sucesso!')).toBeVisible({ timeout: 6_000 });
  });

  test('Deve listar protocolos presenciais da escola com badges de status padronizados', async ({ page }) => {
    // Seção de protocolos presenciais
    const listaProtocolos = page.locator('.lista-protocolos-gestao');
    if (await listaProtocolos.isVisible()) {
      const primeiroCard = listaProtocolos.locator('.card-prot-gestao').first();
      await expect(primeiroCard).toBeVisible();
      await expect(primeiroCard.locator('.prot-badge-codigo')).toBeVisible();

      // Valida badge de Pré-Reserva com ponto indicador se houver
      const badgeReservada = primeiroCard.locator('.status-fila-badge.status-reservada');
      if (await badgeReservada.isVisible()) {
        await expect(badgeReservada.locator('.status-fila-ponto')).toBeVisible();
      }
    }
  });

  test('Deve abrir Leitor / Localizador de Protocolo e buscar código manualmente', async ({ page }) => {
    // Clica no botão de escanear QR Code da unidade
    await page.locator('button:has-text("Escanear QR Code"), button:has-text("Escanear / Localizar Protocolo")').first().click();

    // Modal do leitor deve abrir
    await expect(page.locator('#t-leitor-qr')).toBeVisible();

    // Alterna para a aba de digitação manual de código
    await page.locator('button:has-text("Digitar Código")').click();

    // Digita o código de protocolo de teste da creche
    await page.locator('.leitor-form-manual input').fill('PATOS-2027-4821');
    await page.locator('.leitor-form-manual button:has-text("Buscar")').click();

    // Ficha identificada do protocolo deve surgir com dados da família
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog.getByText('Protocolo Identificado')).toBeVisible({ timeout: 6_000 });
    await expect(modalDialog.getByText('PATOS-2027-4821')).toBeVisible();
    await expect(modalDialog.getByText('Maria Francisca Medeiros')).toBeVisible();

    // Valida que o botão de efetivação de matrícula está acessível
    await expect(modalDialog.locator('button:has-text("Confirmar Matrícula")')).toBeVisible();

    // Fecha o modal do leitor
    await modalDialog.locator('button[aria-label="Fechar leitor"]').click();
  });
});
