import { expect, test } from '@playwright/test';

test('hotfix mission keeps the real blocker actionable when a fake popup is also open', async ({ page }) => {
  await page.goto('/#/missions');
  await page.clock.install();

  await page.getByRole('button', { name: '핫픽스 브랜치 밀어 올리기' }).click();
  await page.getByRole('button', { name: '브리핑 보기' }).click();
  await page.getByRole('button', { name: '미션 시작' }).click();

  await page.getByRole('button', { name: 'payment-service 기준으로 해결' }).click();
  await page.clock.fastForward('00:11');
  await page.getByRole('button', { name: '토큰 갱신' }).click();
  await page.getByRole('button', { name: 'git add -A' }).click();
  await page.getByRole('textbox', { name: '승인 채널' }).fill('#release-bridge');
  await page.getByRole('button', { name: '단계 완료' }).click();
  await page.clock.fastForward('00:15');

  const popupLayer = page.locator('.popup-layer');
  await expect(popupLayer).toContainText('배포 동결 확인 필요');
  await expect(popupLayer).toContainText('입력 장치 펌웨어 권장 업데이트');
  await expect(popupLayer).not.toContainText(/REAL|FAKE|진짜 의심|잡음/);

  await page.getByRole('button', { name: '동결 해제 승인' }).click();
  await expect(page.getByText('진짜 방해 요소를 해결했습니다.')).toBeVisible();

  await page.getByRole('button', { name: 'origin/hotfix로 푸시' }).click();
  await expect(page.getByRole('heading', { name: '업무 완료!' })).toBeVisible();
});
