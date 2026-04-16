import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

const goToMissionSelect = async (user: ReturnType<typeof setupUser>) => {
  await user.click(screen.getByRole('button', { name: '게임 시작' }));
  expect(screen.getByRole('heading', { name: '오늘 끝낼 업무를 고르세요.' })).toBeInTheDocument();
};

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.location.hash = '';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows landing and mission selection with at least two mission cards', async () => {
    const user = setupUser();
    render(<App />);

    expect(screen.getByRole('heading', { name: '진짜 문제만 골라내고 오늘 업무를 끝내세요.' })).toBeInTheDocument();
    await goToMissionSelect(user);

    expect(screen.getAllByRole('button', { name: '이 미션 플레이' })).toHaveLength(2);
  });

  it('completes a mission and reaches the success result screen', async () => {
    const user = setupUser();
    render(<App />);

    await goToMissionSelect(user);
    await user.click(screen.getAllByRole('button', { name: '이 미션 플레이' })[0]);

    await user.click(screen.getByRole('button', { name: '현재 단계 완료' }));
    await user.click(screen.getByRole('button', { name: '무시 / 닫기' }));
    await user.click(screen.getByRole('button', { name: '현재 단계 완료' }));
    await user.click(screen.getByRole('button', { name: '문제 해결' }));
    await user.click(screen.getByRole('button', { name: '현재 단계 완료' }));

    expect(screen.getByRole('heading', { name: '미션 성공!' })).toBeInTheDocument();
    expect(screen.getByText('핵심 업무를 끝내고 팝업 지옥에서 탈출했습니다!')).toBeInTheDocument();
  });

  it('fails after repeated wrong actions and supports retry', async () => {
    const user = setupUser();
    render(<App />);

    await goToMissionSelect(user);
    await user.click(screen.getAllByRole('button', { name: '이 미션 플레이' })[1]);
    await user.click(screen.getByRole('button', { name: '현재 단계 완료' }));

    await user.click(screen.getByRole('button', { name: '무시 / 닫기' }));
    await user.click(screen.getByRole('button', { name: '무시 / 닫기' }));
    await user.click(screen.getByRole('button', { name: '무시 / 닫기' }));

    expect(screen.getByRole('heading', { name: '미션 실패' })).toBeInTheDocument();
    expect(screen.getByText('스트라이크 3회를 넘겨 미션이 중단되었습니다.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '같은 미션 다시 하기' }));
    expect(screen.getByRole('heading', { name: '아카이브 백업 러시' })).toBeInTheDocument();
  });

  it('times out when the player does nothing', async () => {
    const user = setupUser();
    render(<App />);

    await goToMissionSelect(user);
    await user.click(screen.getAllByRole('button', { name: '이 미션 플레이' })[0]);

    await act(async () => {
      vi.advanceTimersByTime(151000);
    });

    expect(screen.getByRole('heading', { name: '미션 실패' })).toBeInTheDocument();
    expect(screen.getByText('시간 초과로 미션에 실패했습니다.')).toBeInTheDocument();
  });
});
