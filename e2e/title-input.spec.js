import { expect, test } from '@playwright/test';

test('office mission subject input persists and submits', async ({ page }) => {
  await page.goto('/#/missions');
  await page.getByRole('button', { name: '브리핑 보기' }).first().click();
  await page.getByRole('button', { name: '미션 시작' }).click();

  await page.getByRole('textbox').first().fill('이름: 박기현\n경력 요약: 프론트엔드 5년');
  await page.getByRole('button', { name: '다른 이름으로 저장' }).click();
  await page.getByRole('button', { name: '문서/긴급제출' }).click();
  await page.getByRole('textbox').nth(1).fill('박기현_이력서.txt');
  await page.getByRole('button', { name: '저장 완료' }).click();
  await page.getByRole('button', { name: '메일 작성하기' }).click();

  const input = page.getByRole('textbox', { name: '메일 제목' });
  await expect(input).toBeVisible();

  await input.fill('[긴급 제출] 박기현_이력서 전달드립니다');
  await expect(input).toHaveValue('[긴급 제출] 박기현_이력서 전달드립니다');

  await page.getByRole('button', { name: '제목 입력 완료' }).click();
  await expect(page.getByText('단계 완료: 메일 제목 작성')).toBeVisible();
});
