import { expect, test } from '@playwright/test';

test('title input keeps focus while clicking inside the field area', async ({ page }) => {
  await page.goto('/#/missions');
  await page.getByRole('button', { name: '브리핑 보기' }).first().click();
  await page.getByRole('button', { name: '미션 시작' }).click();

  const input = page.getByRole('textbox', { name: '새 파일명' });
  await expect(input).toBeVisible();
  await input.click();
  await expect(input).toBeFocused();
  await input.fill('q3-final-pitch');
  await expect(input).toHaveValue('q3-final-pitch');

  const box = await input.boundingBox();
  if (!box) throw new Error('no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('q3-final-pitch');
});
