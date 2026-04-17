import { expect, test } from '@playwright/test';

async function firstExistingLocator(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      return locator;
    }
  }

  return page.locator(selectors.join(', ')).first();
}

async function desktopIcon(page, kind) {
  const selectorMap = {
    games: [
      '[data-desktop-icon="games-folder"]',
      '[data-desktop-icon="games"]',
      '[data-testid="desktop-icon-games"]',
      '[aria-label="Games"]',
      '[aria-label="게임"]',
      'button:has-text("Games")',
      'button:has-text("게임")',
      '[role="button"]:has-text("Games")',
      '[role="button"]:has-text("게임")',
    ],
    popupHell: [
      '[data-desktop-icon="popup-hell-launcher"]',
      '[data-launcher="popup-hell"]',
      '[data-testid="desktop-icon-popup-hell"]',
      '[aria-label="Popup Hell"]',
      '[aria-label="에러 팝업 지옥"]',
      'button:has-text("Popup Hell")',
      'button:has-text("에러 팝업")',
      '[role="button"]:has-text("Popup Hell")',
      '[role="button"]:has-text("에러 팝업")',
    ],
  };

  return firstExistingLocator(page, selectorMap[kind]);
}

async function shellWindow(page, kind) {
  const selectorMap = {
    games: [
      '[data-window-id="games"]',
      '[data-window-id="games-folder"]',
      '[data-testid="window-games"]',
      '[data-window-title*="Games"]',
      '[aria-label="Games window"]',
    ],
    popupHell: [
      '[data-window-id="popup-hell"]',
      '[data-window-id="popup-hell-launcher"]',
      '[data-testid="window-popup-hell"]',
      '[data-window-title*="Popup Hell"]',
      '[aria-label="Popup Hell window"]',
    ],
  };

  return firstExistingLocator(page, selectorMap[kind]);
}

async function openLauncherFromDesktop(page) {
  const gamesIcon = await desktopIcon(page, 'games');
  await expect(gamesIcon).toBeVisible();
  await gamesIcon.dblclick();

  const gamesWindow = await shellWindow(page, 'games');
  await expect(gamesWindow).toBeVisible();

  const popupHellIcon = await desktopIcon(page, 'popupHell');
  await expect(popupHellIcon).toBeVisible();
  await popupHellIcon.dblclick();

  const popupHellWindow = await shellWindow(page, 'popupHell');
  await expect(popupHellWindow).toBeVisible();

  return popupHellWindow;
}

test.describe('Windows 95 desktop shell', () => {
  test('shows taskbar, start menu toggle, and desktop launch surface', async ({ page }) => {
    await page.goto('/');

    const taskbar = await firstExistingLocator(page, ['[data-taskbar]', '[data-testid="taskbar"]', '.taskbar']);
    await expect(taskbar).toBeVisible();

    const startButton = await firstExistingLocator(page, [
      '[data-start-button]',
      '[data-testid="start-button"]',
      '.taskbar button:has-text("Start")',
      '.taskbar button:has-text("시작")',
      'button:has-text("Start")',
      'button:has-text("시작")',
    ]);
    await expect(startButton).toBeVisible();

    const startMenu = await firstExistingLocator(page, ['[data-start-menu]', '[data-testid="start-menu"]', '.start-menu']);
    await expect(startMenu).toBeHidden();

    await startButton.click();
    await expect(startMenu).toBeVisible();
    await expect(await desktopIcon(page, 'games')).toBeVisible();

    await page.mouse.click(20, 20);
    await expect(startMenu).toBeHidden();
  });

  test('does not open the Games folder on single click and only opens on double-click', async ({ page }) => {
    await page.goto('/');

    const gamesIcon = await desktopIcon(page, 'games');
    await expect(gamesIcon).toBeVisible();

    await gamesIcon.click();
    await expect(page.locator('[data-window-id="games-folder"]')).toHaveCount(0);

    await gamesIcon.dblclick();
    await expect(page.locator('[data-window-id="games-folder"]')).toBeVisible();
    await expect(page.locator('.taskbar').getByText('Games')).toBeVisible();
  });

  test('opens Games and Popup Hell with double-click and preserves the win flow', async ({ page }) => {
    await page.goto('/');
    await page.clock.install();

    await openLauncherFromDesktop(page);

    await expect(page.getByRole('heading', { name: '오늘 처리할 업무를 고르세요' }).first()).toBeVisible();
    await expect(page.locator('.taskbar').getByText('Games')).toBeVisible();
    await expect(page.locator('.taskbar').getByText('Popup Hell.exe')).toBeVisible();
    await page.locator('[data-window-id="popup-hell-launcher"]').getByRole('button', { name: '브리핑 보기' }).click();
    await page.getByRole('button', { name: '미션 시작' }).click();
    await expect(page.locator('.taskbar').getByText('Games')).toBeVisible();
    await expect(page.locator('.taskbar').getByText('Popup Hell.exe')).toBeVisible();
    await expect(page.locator('.taskbar').getByText('Mission HUD')).toBeVisible();

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
  });

  test('minimizes to the taskbar and restores from the taskbar button', async ({ page }) => {
    await page.goto('/');

    const popupHellWindow = await openLauncherFromDesktop(page);
    const popupTaskButton = page.locator('.taskbar .taskbar-button').filter({ hasText: 'Popup Hell.exe' }).first();

    await expect(popupTaskButton).toBeVisible();
    await popupHellWindow.getByRole('button', { name: '창 최소화' }).click();
    await expect(popupHellWindow).toBeHidden();
    await expect(popupTaskButton).toBeVisible();

    await popupTaskButton.click();
    await expect(popupHellWindow).toBeVisible();
  });

  test('supports dragging the active window without overflowing the viewport', async ({ page }) => {
    await page.goto('/');

    const popupHellWindow = await openLauncherFromDesktop(page);
    const dragHandle = popupHellWindow.locator('[data-window-drag-handle], [data-testid="window-titlebar"], .window-titlebar, [data-window-titlebar]').first();

    await expect(dragHandle).toBeVisible();

    const before = await popupHellWindow.boundingBox();
    expect(before).not.toBeNull();

    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move((handleBox?.x ?? 0) + 44, (handleBox?.y ?? 0) + 16);
    await page.mouse.down();
    await page.mouse.move((before?.x ?? 0) + 124, (before?.y ?? 0) + 64, { steps: 12 });
    await page.mouse.up();

    const after = await popupHellWindow.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0)) + Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeGreaterThan(20);
    const endOffsetX = ((handleBox?.x ?? 0) + 44 + 80) - (after?.x ?? 0);
    const endOffsetY = ((handleBox?.y ?? 0) + 16 + 48) - (after?.y ?? 0);
    const startOffsetX = ((handleBox?.x ?? 0) + 44) - (before?.x ?? 0);
    const startOffsetY = ((handleBox?.y ?? 0) + 16) - (before?.y ?? 0);
    expect(Math.abs(endOffsetX - startOffsetX)).toBeLessThanOrEqual(4);
    expect(Math.abs(endOffsetY - startOffsetY)).toBeLessThanOrEqual(4);

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  });
});
