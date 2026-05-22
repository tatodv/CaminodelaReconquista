import { test, expect } from '@playwright/test';

test('carga la experiencia del Camino de la Reconquista', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Camino de la Reconquista/);
  await expect(page.getByRole('heading', { name: 'Camino de la Reconquista', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Escenarios que completan el Camino/i })).toBeVisible();
});

test('incorpora las correcciones historicas principales', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/enfrentaron una columna brit/i).first()).toBeVisible();
  await expect(page.getByText(/Conecta con Luj/i).first()).toBeVisible();
  await expect(page.getByText(/Conecta con Montevideo/i).first()).toBeVisible();
  await expect(page.getByText(/se encontraron con Liniers/i).first()).toBeVisible();
  await expect(page.getByText(/Beresford acept/i).first()).toBeVisible();
  await expect(page.getByText(/finalizaci/i).first()).toBeVisible();
});

test('enlaza la fuente historica al PDF de Google Drive', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: /PDF/i })).toHaveAttribute(
    'href',
    'https://drive.google.com/file/d/1Vd6Nx5cXY2jG9S-FaA6h6H-mxsCMLiyf/view?usp=sharing',
  );
});

test('no emite errores de consola al cargar', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(errors).toEqual([]);
});

test('muestra reproductor completo en el hero sin spotify pronto', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Escuchar relato')).toBeVisible();
  await expect(page.getByLabel('Podcast pronto')).toHaveCount(0);
  await expect(page.locator('#hero-audio-player').getByLabel('Progreso del audio')).toBeHidden();
});

test('despliega audio compuesto del punto 6 con salto de introduccion', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-audio-point="5"]').scrollIntoViewIfNeeded();
  await page.locator('[data-audio-point="5"]').click();

  const player = page.locator('#audio-point-6');
  await expect(player).toBeVisible();
  await expect(player.getByLabel('Saltar introduccion')).toBeVisible();
  await expect(player.locator('.plyr')).toBeVisible();
  await expect(player.getByRole('button', { name: 'Ajustes' }).first()).toBeVisible();
});

test('mantiene tocables los controles del reproductor al abrir un punto', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-audio-point="0"]').scrollIntoViewIfNeeded();
  await page.locator('[data-audio-point="0"]').click();

  const player = page.locator('#audio-point-1');
  await expect(player.getByLabel(/Pausar|Reproducir/)).toBeEnabled();
  await expect(player.getByLabel('Saltar introduccion')).toBeEnabled();
  await expect(player.getByRole('button', { name: 'Ajustes' }).first()).toBeEnabled();
});

test('oculta escuchar punto cuando el reproductor inline esta abierto', async ({ page }) => {
  await page.goto('/');

  const listenButton = page.locator('[data-audio-point="0"]');
  await listenButton.scrollIntoViewIfNeeded();
  await listenButton.click();

  await expect(listenButton).toBeHidden();
  await expect(page.locator('#audio-point-1')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ubicacion' }).first()).toBeVisible();
});

test('cierra el reproductor y vuelve a mostrar escuchar punto', async ({ page }) => {
  await page.goto('/');

  const listenButton = page.locator('[data-audio-point="0"]');
  await listenButton.scrollIntoViewIfNeeded();
  await listenButton.click();

  await page.locator('#audio-point-1').getByLabel('Cerrar reproductor de audio').click();

  await expect(page.locator('#audio-point-1')).toBeHidden();
  await expect(listenButton).toBeVisible();
  await expect(listenButton).toHaveAttribute('aria-expanded', 'false');
});

test('el hero cierra el reproductor de punto activo', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-audio-point="0"]').scrollIntoViewIfNeeded();
  await page.locator('[data-audio-point="0"]').click();
  await page.locator('#hero-audio-player').getByRole('button').click();

  await expect(page.locator('#audio-point-1')).toBeHidden();
  await expect(page.locator('[data-audio-point="0"]')).toBeVisible();
});
