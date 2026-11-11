import { test, expect } from '@playwright/test';

test.describe('Fluxo Cidadão (Pais e Responsáveis)', () => {
  test('Deve carregar a página inicial com estatísticas e selo ao vivo de Patos - PB', async ({ page }) => {
    await page.goto('/');

    // Verifica cabeçalho e título
    await expect(page).toHaveTitle(/Matrícula Aberta · Patos - PB/);
    await expect(page.locator('.topo .marca-nome')).toContainText('MatrículaAberta');
    await expect(page.locator('.topo .marca-nome')).toContainText('Patos - PB');

    // Verifica hero e selo ao vivo
    await expect(page.locator('.lp-hero h1')).toContainText('sem fila na porta');
    await expect(page.locator('.lp-selo-vivo')).toContainText('Patos - PB ao vivo');
  });

  test('Deve abrir a Fila Pública Auditável no cabeçalho e listar os critérios legais', async ({ page }) => {
    await page.goto('/');

    // Clica no botão "Fila Pública" no cabeçalho
    await page.locator('button:has-text("Fila Pública")').click();

    // Modal deve abrir
    await expect(page.locator('text=Fila Pública Auditável de Vagas')).toBeVisible();

    // Verifica que os critérios legais municipais de Patos estão descritos
    await expect(page.locator('text=Critérios Legais e Pontuação')).toBeVisible();

    // Fecha o modal pelo botão fechar (X)
    const btnFechar = page.locator('button[aria-label*="Fechar"], button.sheet-fechar, button.btn-fechar-modal').first();
    if (await btnFechar.isVisible()) {
      await btnFechar.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('Deve navegar pelo funil de busca de vagas: Quem -> Onde -> Vagas -> Pré-Reserva', async ({ page }) => {
    await page.goto('/');

    // Clica em "Consultar vagas em Patos" no hero
    await page.locator('button:has-text("Consultar vagas em Patos")').click();

    // Passo 0: StepQuem
    await expect(page.locator('#t-quem, h1#t-quem')).toContainText('Quem vai estudar?');

    // Seleciona um atalho rápido de idade: "2 a 3 anos" (Maternal)
    await page.locator('button:has-text("2 a 3 anos")').click();

    // Avança para o próximo passo
    await page.locator('button:has-text("Continuar")').click();

    // Passo 1: StepOnde
    await expect(page.locator('#t-onde')).toBeVisible();

    // Seleciona o bairro Centro no mapa
    const pinoBairro = page.locator('button.pino-bairro:has-text("Centro"), button.pino-bairro').first();
    await expect(pinoBairro).toBeVisible();
    await pinoBairro.click();

    // Avança para a listagem de vagas
    await page.locator('button:has-text("Ver vagas disponíveis")').click();

    // Passo 2: StepVagas
    await expect(page.locator('.grade-escolas, .card-escola').first()).toBeVisible();

    // Seleciona a primeira escola da lista clicando em "Quero esta escola" ou ver documentos
    const btnAcaoEscola = page.locator('.card-escola button:has-text("Quero esta escola"), .card-escola button:has-text("Ver documentos")').first();
    await expect(btnAcaoEscola).toBeVisible();
    await btnAcaoEscola.click();

    // Passo 3: StepVisita (Formulário de Pré-Agendamento)
    await expect(page.locator('text=Protocolo de Pré-Agendamento Presencial')).toBeVisible();

    // Se já tinha protocolo salvo no localStorage, clica em "Emitir outro protocolo"
    const btnOutroProt = page.locator('button:has-text("Emitir outro protocolo")');
    if (await btnOutroProt.isVisible()) {
      await btnOutroProt.click();
    }

    // Preenche os dados cadastrais (CPF válido único por execução para evitar duplicidade de reserva)
    const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    let d1 = n.reduce((total, num, i) => total + num * (10 - i), 0) % 11;
    d1 = d1 < 2 ? 0 : 11 - d1;
    let d2 = [...n, d1].reduce((total, num, i) => total + num * (11 - i), 0) % 11;
    d2 = d2 < 2 ? 0 : 11 - d2;
    const docUnico = `${n.slice(0, 3).join('')}.${n.slice(3, 6).join('')}.${n.slice(6, 9).join('')}-${d1}${d2}`;
    await page.locator('.protocolo-form input[placeholder*="Ex.: Maria"]').fill('Maria das Dores Wanderley');
    await page.locator('.protocolo-form input[placeholder*="000.000.000-00"]').fill(docUnico);
    await page.locator('.protocolo-form input[type="tel"]').fill('(83) 98888-7777');

    // Seleciona um critério de vulnerabilidade (ex.: Beneficiário do Bolsa Família / CadÚnico)
    const checkboxBolsa = page.locator('.protocolo-form label:has-text("Bolsa Família") input[type="checkbox"]');
    if (await checkboxBolsa.isVisible()) {
      await checkboxBolsa.check();
    }

    // Clica em "Emitir protocolo com QR Code"
    await page.locator('button:has-text("Emitir protocolo com QR Code")').click();

    // Verifica que o comprovante foi gerado com sucesso
    await expect(page.locator('.protocolo-bilhete, .protocolo-box')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('strong:has-text("PATOS-2027-")')).toBeVisible();
    await expect(page.locator('.protocolo-qr-svg, svg.protocolo-qr-svg')).toBeVisible();
  });
});
