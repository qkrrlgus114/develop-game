import { expect, test } from '@playwright/test';

test('title input keeps focus while re-clicking the editable center of the field', async ({ page }) => {
  await page.goto('/#/missions');
  await page.getByRole('button', { name: '브리핑 보기' }).first().click();
  await page.getByRole('button', { name: '미션 시작' }).click();

  const input = page.getByRole('textbox', { name: '새 파일명' });
  await expect(input).toBeVisible();
  await input.click();
  await expect(input).toBeFocused();
  await input.fill('q3-final-pitch');
  await expect(input).toHaveValue('q3-final-pitch');

  await input.click({ position: { x: 40, y: 20 } });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('q3-final-pitch');
});