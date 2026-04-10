# ultrawork

모든 작업의 진입점. Intent Gate → 자율 실행 → Ralph Loop.

## 실행 순서

### Step 1: Intent Gate
$ARGUMENTS를 분석하여 의도 분류:
- trivial → 직접 응답 후 종료
- explicit → Step 2 진입
- exploratory → Scout 에이전트 먼저 실행 후 Step 2
- plan-needed → Prometheus 인터뷰 모드 먼저
- ambiguous → 단 1개 질문으로 명확화 후 재시작

### Step 2: Todo 작성
TodoWrite로 전체 작업 목록 작성.
각 항목에 담당자 명시: [SCOUT] / [IMPL] / [VERIFY] / [ORACLE]

### Step 3: 병렬 실행
독립 작업은 Task 도구로 동시 실행.
의존 작업은 순차 실행.
각 완료 시 TodoWrite로 completed 업데이트.

### Step 4: Ralph Loop
TodoRead로 전체 점검.
미완료 항목 → 즉시 재개 (확인 없이).
전체 완료 → 완료 선언.

## 사용 예시
/project:ultrawork 로그인 API와 프론트엔드 연동
/project:ultrawork 인증 시스템 전체 구현
