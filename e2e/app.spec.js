import { expect, test } from '@playwright/test';

test.describe('Error Popup Hell desktop flow', () => {
  test('landing CTA navigates to mission selection', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: '모든 팝업을 치우지 마세요. 진짜 문제만 해결하세요.' }),
    ).toBeVisible();

    await page.getByRole('button', { name: '게임 시작' }).click();

    await expect(page).toHaveURL(/#\/missions$/);
    await expect(page.getByRole('heading', { name: '오늘 처리할 업무를 고르세요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '브리핑 보기' }).first()).toBeVisible();
  });

  test('player can open a mission briefing and start a run', async ({ page }) => {
    await page.goto('/#/missions');

    await page.getByRole('button', { name: '브리핑 보기' }).first().click();

    await expect(page).toHaveURL(/#\/run\//);
    await expect(page.getByRole('heading', { name: '긴급 제안서 메일 보내기' })).toBeVisible();

    const startButton = page.getByRole('button', { name: '미션 시작' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();

    await startButton.click();

    await expect(page.getByRole('heading', { name: '긴급 제안서 메일 보내기' })).toBeVisible();
    await expect(page.getByText('LIVE HUD')).toBeVisible();
    await expect(page.getByRole('button', { name: '단계 완료' })).toBeVisible();
  });

  test('player can clear the first mission through real browser clicks', async ({ page }) => {
    await page.goto('/#/missions');
    await expect(page.getByRole('button', { name: '브리핑 보기' }).first()).toBeVisible();
    await page.clock.install();

    await page.getByRole('button', { name: '브리핑 보기' }).first().click();
    await page.getByRole('button', { name: '미션 시작' }).click();

    await page.getByRole('textbox', { name: '새 파일명' }).fill('q3-final-pitch');
    await page.getByRole('button', { name: '단계 완료' }).click();

    await page.clock.fastForward('00:13');
    await expect(page.getByRole('heading', { name: '첨부 저장소 용량 초과' })).toBeVisible();
    await page.getByRole('button', { name: '임시 폴더 정리' }).click();

    await page.getByRole('button', { name: '제안서 첨부' }).click();

    await page.clock.fastForward('00:01');
    await expect(page.getByRole('heading', { name: '법무 문구 누락' })).toBeVisible();
    await page.getByRole('button', { name: '문구 적용' }).click();

    await page.getByRole('textbox', { name: 'CC 주소' }).fill('ops@retro.company');
    await page.getByRole('button', { name: '단계 완료' }).click();

    await page.getByRole('button', { name: '메일 발송' }).click();

    await expect(page).toHaveURL(/#\/result\//);
    await expect(page.getByRole('heading', { name: '업무 완료!' })).toBeVisible();
    await expect(page.getByRole('button', { name: '같은 미션 다시 하기' })).toBeVisible();
  });
});
