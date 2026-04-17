import { useEffect, useMemo, useState } from 'react';
import { completeTask, createRunState, getCurrentStep, getMissionById, getPopupSummary, getTaskChecklist, resolvePopupAction, tickRun } from '../game/engine';
import { missions } from '../game/missions';
import type { MissionDefinition, RunResult, RunState } from '../game/types';

type Screen =
  | { name: 'landing' }
  | { name: 'how-to-play' }
  | { name: 'missions' }
  | { name: 'run'; missionId: string }
  | { name: 'result'; runId: string };

const STORAGE_KEY = 'error-popup-hell-best';

const readBestGrades = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};

const writeBestGrade = (result: RunResult) => {
  const current = readBestGrades();
  const rank = { FAIL: 0, C: 1, B: 2, A: 3 } as const;
  const previous = current[result.missionId] as keyof typeof rank | undefined;

  if (!previous || rank[result.grade] > rank[previous]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, [result.missionId]: result.grade }));
  }
};

const parseHash = (): Screen => {
  const raw = window.location.hash.replace(/^#/, '') || '/';

  if (raw === '/' || raw === '') return { name: 'landing' };
  if (raw === '/how-to-play') return { name: 'how-to-play' };
  if (raw === '/missions') return { name: 'missions' };
  if (raw.startsWith('/run/')) return { name: 'run', missionId: raw.split('/')[2] ?? '' };
  if (raw.startsWith('/result/')) return { name: 'result', runId: raw.split('/')[2] ?? '' };
  return { name: 'landing' };
};

const missionMeta = (mission: MissionDefinition) => {
  const popups = getPopupSummary(mission);
  const realCount = popups.filter((popup) => popup.kind === 'real').length;
  return `${mission.difficulty} · 제한 ${Math.ceil(mission.timeLimitSeconds / 60)}분 · 실제 경고 ${realCount}개`;
};

export function App() {
  const [screen, setScreen] = useState<Screen>(() => parseHash());
  const [run, setRun] = useState<RunState | null>(null);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [bestGrades, setBestGrades] = useState<Record<string, string>>(() => readBestGrades());

  const navigate = (next: string) => {
    window.location.hash = next;
    setScreen(parseHash());
  };

  useEffect(() => {
    const onHashChange = () => setScreen(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!run || run.status !== 'running') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRun((current) => (current ? tickRun(current) : current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [run?.runId, run?.status]);

  useEffect(() => {
    if (!run?.result) {
      return;
    }

    setLastResult(run.result);
    writeBestGrade(run.result);
    setBestGrades(readBestGrades());
    navigate(`/result/${run.result.runId}`);
  }, [run?.result]);

  const currentStep = run ? getCurrentStep(run) : null;
  const checklist = useMemo(() => (run ? getTaskChecklist(run.mission, run.completedTasks) : []), [run]);

  const startMission = (missionId: string) => {
    const mission = getMissionById(missionId);

    if (!mission) {
      return;
    }

    const nextRun = createRunState(mission);
    setRun(nextRun);
    navigate(`/run/${mission.id}`);
  };

  const restartMission = () => {
    if (!lastResult) {
      navigate('/missions');
      return;
    }

    startMission(lastResult.missionId);
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <button className="brand" onClick={() => navigate('/')}>
          ERROR POPUP HELL
        </button>
        <nav className="top-nav" aria-label="주요 탐색">
          <button onClick={() => navigate('/how-to-play')}>플레이 방법</button>
          <button onClick={() => navigate('/missions')}>미션 선택</button>
        </nav>
      </header>

      <main className="page-frame">
        {screen.name === 'landing' && (
          <section className="panel hero-panel">
            <div>
              <p className="eyebrow">PC 전용 업무 생존 게임</p>
              <h1>진짜 문제만 골라내고 오늘 업무를 끝내세요.</h1>
              <p className="lede">
                Error Popup Hell은 모든 팝업을 없애는 게임이 아닙니다. 실제 방해 요소를 판별하고, 쓸모없는 소음은 무시하면서 제한 시간 안에 미션을 완수해야 합니다.
              </p>
              <div className="cta-row">
                <button className="primary" onClick={() => navigate('/missions')}>게임 시작</button>
                <button onClick={() => navigate('/how-to-play')}>플레이 방법 보기</button>
              </div>
            </div>
            <aside className="rule-card" aria-label="핵심 규칙">
              <h2>핵심 규칙 3단 요약</h2>
              <ol>
                <li>실제 경고는 해결한다.</li>
                <li>가짜 팝업은 닫고 무시한다.</li>
                <li>스트라이크 3회 또는 시간 초과 전에 미션을 끝낸다.</li>
              </ol>
              <p className="meta">플레이 시간: 미션당 약 2~3분</p>
            </aside>
          </section>
        )}

        {screen.name === 'how-to-play' && (
          <section className="panel split-panel">
            <div>
              <p className="eyebrow">HOW TO PLAY</p>
              <h1>진짜 경고 vs 가짜 팝업</h1>
              <ul className="bullet-list">
                <li><strong>실제 경고</strong>는 데이터 손실, 백업 실패, 동기화 충돌처럼 미션 자체를 망칩니다.</li>
                <li><strong>가짜 팝업</strong>은 광고, 구독, 성과 배지처럼 업무와 무관한 소음입니다.</li>
                <li>버튼은 모두 키보드로 접근할 수 있고, 포커스는 명확하게 표시됩니다.</li>
              </ul>
            </div>
            <div className="how-grid">
              <article className="mini-window good-window">
                <h2>실제 경고 처리</h2>
                <p>제목과 본문이 현재 미션 단계와 직접 연결되면 해결 버튼을 누르세요.</p>
              </article>
              <article className="mini-window fake-window">
                <h2>가짜 팝업 무시</h2>
                <p>미션에 도움을 준다고 과장하지만 목적이 불분명하면 닫기 버튼으로 흘려보내세요.</p>
              </article>
            </div>
          </section>
        )}

        {screen.name === 'missions' && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">MISSION SELECT</p>
                <h1>오늘 끝낼 업무를 고르세요.</h1>
              </div>
            </div>
            <div className="mission-grid">
              {missions.map((mission) => (
                <article key={mission.id} className="mission-card">
                  <p className="badge-row">
                    {mission.recommended && <span className="badge accent">추천</span>}
                    <span className="badge">{mission.difficulty}</span>
                    {bestGrades[mission.id] && <span className="badge success">최고 {bestGrades[mission.id]}</span>}
                  </p>
                  <h2>{mission.title}</h2>
                  <p>{mission.briefing}</p>
                  <p className="meta">{missionMeta(mission)}</p>
                  <button className="primary" onClick={() => startMission(mission.id)}>
                    이 미션 플레이
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {screen.name === 'run' && (
          <section className="run-layout">
            {!run || run.mission.id !== screen.missionId ? (
              <div className="panel empty-state">
                <h1>미션을 불러올 수 없습니다.</h1>
                <p>다시 미션을 선택해 주세요.</p>
                <button className="primary" onClick={() => navigate('/missions')}>미션 선택으로</button>
              </div>
            ) : (
              <>
                <section className="panel hud-panel" aria-label="미션 상태">
                  <p className="eyebrow">RUNNING MISSION</p>
                  <h1>{run.mission.title}</h1>
                  <p>{run.mission.briefing}</p>
                  <div className="hud-grid">
                    <div><span>남은 시간</span><strong>{run.timeRemaining}s</strong></div>
                    <div><span>스트라이크</span><strong>{run.strikes} / 3</strong></div>
                    <div><span>카오스 게이지</span><strong>{run.chaos}%</strong></div>
                    <div><span>진행도</span><strong>{run.currentIndex} / {run.mission.steps.length}</strong></div>
                  </div>
                  <div className="mission-context">
                    <span className="badge">{run.mission.difficulty}</span>
                    <span className="meta">제한 {Math.ceil(run.mission.timeLimitSeconds / 60)}분 · 예상 {run.mission.estimatedMinutes}</span>
                  </div>
                  <p className="feedback" role="status">{run.lastFeedback}</p>
                </section>

                <section className="panel checklist-panel" aria-label="미션 체크리스트">
                  <h2>필수 단계</h2>
                  <ul className="checklist">
                    {checklist.map((item) => (
                      <li key={item.id} className={item.completed ? 'done' : ''}>
                        <span>{item.completed ? '✔' : '•'}</span>
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.helper}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="panel work-panel" aria-label="현재 작업 영역">
                  {currentStep?.type === 'task' && (
                    <div className="task-card">
                      <p className="eyebrow">CURRENT STEP</p>
                      <h2>{currentStep.label}</h2>
                      <p>{currentStep.helper}</p>
                      <button className="primary" onClick={() => setRun((current) => (current ? completeTask(current) : current))}>
                        현재 단계 완료
                      </button>
                    </div>
                  )}

                  {currentStep?.type === 'popup' && (
                    <div className={`popup-window ${currentStep.kind}`} role="dialog" aria-labelledby="popup-title">
                      <div className="window-titlebar">
                        <span>SYSTEM NOTIFICATION</span>
                        <span aria-hidden="true">▣</span>
                      </div>
                      <div className="window-body">
                        <h2 id="popup-title">{currentStep.title}</h2>
                        <p>{currentStep.body}</p>
                        <div className="cta-row">
                          <button className="primary" onClick={() => setRun((current) => (current ? resolvePopupAction(current, 'resolve') : current))}>
                            문제 해결
                          </button>
                          <button onClick={() => setRun((current) => (current ? resolvePopupAction(current, 'dismiss') : current))}>
                            무시 / 닫기
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {screen.name === 'result' && (
          <section className="panel result-panel">
            {!lastResult || lastResult.runId !== screen.runId ? (
              <>
                <h1>결과를 찾을 수 없습니다.</h1>
                <button className="primary" onClick={() => navigate('/missions')}>미션 선택으로</button>
              </>
            ) : (
              <>
                <p className="eyebrow">RESULT</p>
                <h1>{lastResult.success ? '미션 성공!' : '미션 실패'}</h1>
                <p className="lede">{lastResult.reason}</p>
                <div className="result-grid">
                  <div><span>등급</span><strong>{lastResult.grade}</strong></div>
                  <div><span>남은 시간</span><strong>{lastResult.remainingSeconds}s</strong></div>
                  <div><span>실수 횟수</span><strong>{lastResult.mistakes.length}</strong></div>
                  <div><span>처리한 실제 경고</span><strong>{lastResult.handledRealPopups}</strong></div>
                </div>
                <section className="mistake-list" aria-label="오판 기록">
                  <h2>오판 기록</h2>
                  {lastResult.mistakes.length === 0 ? <p>완벽하게 판단했습니다.</p> : (
                    <ul>
                      {lastResult.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}
                    </ul>
                  )}
                </section>
                <div className="cta-row">
                  <button className="primary" onClick={restartMission}>같은 미션 다시 하기</button>
                  <button onClick={() => navigate('/missions')}>다른 미션 선택</button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}