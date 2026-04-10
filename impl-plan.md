# 구현 순서 체크리스트

> Claude Code가 이 파일을 읽고 재하에게 확인 후 구현 시작.
> 각 Step 완료 시 체크 표시.

---

## Step 0: 사전 수정 (하루)

> 기존 버그 수정. 이걸 먼저 안 하면 나머지 전부 불안정.

- [ ] jh-클로드대시보드의 `ClaudeClient` async/sync 버그 수정
  - `anthropic.Anthropic` → `anthropic.AsyncAnthropic`
  - `messages.create()` → `await messages.create()`
  - 검증: FastAPI 엔드포인트에서 Claude API 정상 응답 확인

- [ ] Supabase `agent_logs` 테이블 생성 (dashboard-patch.md Step 1 참조)
- [ ] Supabase `todos` 테이블 생성
- [ ] Realtime 활성화 확인

---

## Step 1: CLAUDE.md 작성 (반나절)

> 시지프스의 70%는 프롬프트 설계다.

- [ ] 프로젝트 루트에 `CLAUDE.md` 생성
  - sisyphus-core.md의 내용 전체 적용
  - Intent Gate 섹션 포함
  - Ralph Loop 규칙 포함
  - Todo Enforcer 규칙 포함
  - 6섹션 위임 프롬프트 형식 포함

- [ ] 검증: Claude Code에서 `ultrawork 테스트 작업` 실행 시
  - TodoWrite로 목록 작성하는가?
  - Task 도구로 서브에이전트 호출하는가?
  - 완료 후 TodoRead로 점검하는가?

---

## Step 2: 커맨드 파일 (2시간)

- [ ] `.claude/commands/ultrawork.md` 생성 (commands.md 참조)
- [ ] `.claude/commands/loop.md` 생성
- [ ] `.claude/commands/start-work.md` 생성

- [ ] 검증: `/project:ultrawork` 입력 시 Intent Gate 동작 확인

---

## Step 3: 서브에이전트 파일 (하루)

- [ ] `.claude/agents/prometheus.md` 생성 (agents.md 참조)
- [ ] `.claude/agents/scout.md` 생성
- [ ] `.claude/agents/oracle.md` 생성
- [ ] `.claude/agents/verifier.md` 생성

- [ ] 검증: 시지프스가 `Task(description="탐색", prompt="...")` 형태로 scout 호출하는가?

---

## Step 4: 대시보드 관제 전환 (하루)

- [ ] `AgentMonitor` 컴포넌트 추가 (dashboard-patch.md Step 3 참조)
- [ ] `TodoProgress` 컴포넌트 추가
- [ ] 기존 에이전트 실행 버튼 → 모니터링 패널로 교체
- [ ] Supabase Realtime 구독 동작 확인

- [ ] 검증: Claude Code 터미널에서 ultrawork 실행 시 대시보드에 실시간 반영되는가?

---

## Step 5: Ralph Loop 동작 검증 (반나절)

실제로 시지프스처럼 동작하는지 핵심 테스트:

```
테스트 입력:
/project:ultrawork 간단한 버튼 컴포넌트 3개 만들어

기대 동작:
1. Intent Gate: "explicit" 분류
2. TodoWrite: 버튼 3개 + 타입 체크 Todo 작성
3. Task: scout 또는 직접 구현
4. 각 버튼 구현 완료 시 Todo 업데이트
5. 타입 체크 Todo → verifier 호출
6. TodoRead: 전체 completed 확인
7. 완료 선언

실패 케이스 (Ralph Loop 테스트):
4번에서 버튼 1개만 만든 후 응답 종료 시도
→ Ralph Loop가 "미완료 항목 감지. 재개." 출력 후 계속해야 함
```

- [ ] 위 테스트 통과 시 시지프스 재현 완료

---

## 완료 기준

```
✅ /project:ultrawork [요청] 입력
✅ 사람이 아무것도 누르지 않아도
✅ 에이전트들이 자율 실행
✅ Todo 미완료 시 자동 루프
✅ 대시보드에 실시간 반영
✅ 최종 완료 선언까지 자동
```

이 5가지가 모두 동작하면 OMO 시지프스와 동등한 수준.

---

## 파일 위치 최종 정리

```
프로젝트루트/
├── CLAUDE.md                        ← Step 1
├── .claude/
│   ├── commands/
│   │   ├── ultrawork.md             ← Step 2
│   │   ├── loop.md                  ← Step 2
│   │   └── start-work.md            ← Step 2
│   └── agents/
│       ├── prometheus.md            ← Step 3
│       ├── scout.md                 ← Step 3
│       ├── oracle.md                ← Step 3
│       └── verifier.md              ← Step 3
└── [대시보드 프로젝트]/
    └── src/components/
        ├── AgentMonitor.tsx         ← Step 4
        └── TodoProgress.tsx         ← Step 4
```

---

## Claude Code에게 — 시작 전 확인사항

이 파일을 읽은 Claude Code는 재하에게 다음을 먼저 확인하라:

1. "현재 jh-클로드대시보드 프로젝트 경로가 어디인가요?"
2. "Supabase URL과 anon key를 .env에서 확인할 수 있나요?"
3. "Step 0 (async 버그 수정)부터 시작할까요?"

확인 후 Step 0부터 순서대로 진행.
