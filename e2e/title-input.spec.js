import { expect, test } from '@playwright/test';

test('office mission title input persists and submits', async ({ page }) => {
  await page.goto('/#/missions');
  await page.getByRole('button', { name: '브리핑 보기' }).first().click();
  await page.getByRole('button', { name: '미션 시작' }).click();

  const input = page.getByRole('textbox', { name: '새 파일명' });
  await expect(input).toBeVisible();

  await input.fill('q3-final-pitch');
  await expect(input).toHaveValue('q3-final-pitch');

  await page.getByRole('button', { name: '단계 완료' }).click();
  await expect(page.getByText('단계 완료: 파일 이름 정리')).toBeVisible();
});
