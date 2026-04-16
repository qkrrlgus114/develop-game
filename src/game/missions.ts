import type { MissionDefinition } from './types';

export const missions: MissionDefinition[] = [
  {
    id: 'budget-panic',
    title: '정산 보고서 마감',
    briefing: '퇴근 3분 전, 진짜 업무 알림만 골라내며 보고서를 제출하세요.',
    difficulty: '쉬움',
    timeLimitSeconds: 150,
    estimatedMinutes: '2~3분',
    recommended: true,
    steps: [
      {
        id: 'collect-notes',
        type: 'task',
        label: '변경 메모를 정리한다',
        helper: '메신저 메모에서 핵심 항목만 추려서 보고서 초안을 준비하세요.'
      },
      {
        id: 'coupon-popup',
        type: 'popup',
        kind: 'fake',
        title: '점심 할인 쿠폰 설치',
        body: '지금 설치하면 보고서 폴더를 자동으로 정리해 준다고 주장합니다.',
        correctAction: 'dismiss',
        penaltySeconds: 12,
        penaltyStrikes: 1,
        successLabel: '가짜 팝업을 무시하고 업무를 이어갑니다.',
        failureLabel: '업무와 무관한 설치를 눌러 시간이 날아갔습니다.'
      },
      {
        id: 'export-sheet',
        type: 'task',
        label: '정산 시트를 내보낸다',
        helper: '빈칸을 확인한 뒤 제출용 시트를 생성하세요.'
      },
      {
        id: 'sync-warning',
        type: 'popup',
        kind: 'real',
        title: '동기화 충돌 경고',
        body: '최신 수치가 덮어쓰기 직전입니다. 충돌을 해결하지 않으면 제출본이 손상됩니다.',
        correctAction: 'resolve',
        penaltySeconds: 15,
        penaltyStrikes: 1,
        successLabel: '실제 경고를 처리해 최신 데이터를 보존했습니다.',
        failureLabel: '실제 경고를 닫아 버려 보고서가 위험해졌습니다.'
      },
      {
        id: 'submit-report',
        type: 'task',
        label: '보고서를 제출한다',
        helper: '최종 제출 버튼을 눌러 마감 직전에 업무를 끝내세요.'
      }
    ]
  },
  {
    id: 'backup-rush',
    title: '아카이브 백업 러시',
    briefing: '디자인 산출물을 백업하기 전에 진짜 시스템 경고부터 정리해야 합니다.',
    difficulty: '보통',
    timeLimitSeconds: 165,
    estimatedMinutes: '3분',
    recommended: false,
    steps: [
      {
        id: 'mount-drive',
        type: 'task',
        label: '백업 드라이브를 연결한다',
        helper: '백업 드라이브가 준비되면 작업창에 체크가 표시됩니다.'
      },
      {
        id: 'disk-alert',
        type: 'popup',
        kind: 'real',
        title: '디스크 공간 부족',
        body: '임시 렌더 캐시를 정리하지 않으면 백업이 중단됩니다.',
        correctAction: 'resolve',
        penaltySeconds: 15,
        penaltyStrikes: 1,
        successLabel: '진짜 경고를 해결해 백업 공간을 확보했습니다.',
        failureLabel: '실제 경고를 무시해 백업 공간이 부족합니다.'
      },
      {
        id: 'drop-assets',
        type: 'task',
        label: '핵심 산출물을 아카이브로 보낸다',
        helper: '드래그 앤 드롭 대신 버튼으로 작업을 시뮬레이션합니다.'
      },
      {
        id: 'newsletter',
        type: 'popup',
        kind: 'fake',
        title: '창의력 뉴스레터 구독',
        body: '지금 가입하면 백업 속도가 빨라진다고 떠들어댑니다.',
        correctAction: 'dismiss',
        penaltySeconds: 10,
        penaltyStrikes: 1,
        successLabel: '광고성 팝업을 닫고 흐름을 유지했습니다.',
        failureLabel: '쓸모없는 구독 창에 정신이 팔렸습니다.'
      },
      {
        id: 'verify-backup',
        type: 'task',
        label: '백업 결과를 검증한다',
        helper: '체크섬 확인을 마치면 안전하게 결과 화면으로 넘어갑니다.'
      }
    ]
  }
];
