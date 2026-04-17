import { expect, test } from '@playwright/test';

test('landing layout stays inside the desktop viewport without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  const metrics = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const hero = document.querySelector('.hero-panel');
    const sidebar = document.querySelector('.mission-preview-list');
    const topbar = document.querySelector('.topbar');

    const readRect = (element) => {
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    };

    return {
      clientWidth: documentElement.clientWidth,
      scrollWidth: documentElement.scrollWidth,
      hero: readRect(hero),
      sidebar: readRect(sidebar),
      topbar: readRect(topbar),
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.topbar?.right ?? 0).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.hero?.right ?? 0).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.sidebar?.right ?? 0).toBeLessThanOrEqual(metrics.clientWidth);
});