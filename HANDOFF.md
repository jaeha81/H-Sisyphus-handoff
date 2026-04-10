# JH-클로드대시보드 — 시지프스 구현 핸드오프

> Claude Code에게: 이 파일을 먼저 읽고 하위 파일을 순서대로 읽어라.
> 사람에게 확인하지 말고 아래 컨텍스트를 그대로 이어받아 작업하라.

---

## 1. 현재 상황 (Context)

### 프로젝트 목적
JH 브랜드의 Claude Code 전용 멀티에이전트 시스템 구축.
OMO(oh-my-openagent)의 시지프스 동작을 Claude Code 네이티브로 재현하는 것이 핵심 목표.

### 왜 직접 만드는가
- 기존에 OMO + OpenCode 환경에서 시지프스/울트라워크를 수개월 사용
- Anthropic의 서드파티 OAuth 규제로 인해 사용 불가 상태
- Claude Code 공식 채널(.claude/agents/)을 통한 동등한 시스템 자체 구현 결정

### 핵심 타깃 동작
```
사용자: "ultrawork [요청]" 입력
→ 의도 자동 분류 (Intent Gate)
→ 에이전트 자동 배정 및 병렬 실행
→ Todo 기반 진행 관리
→ 미완료 시 자동 루프 (Ralph Loop)
→ 유휴 감지 시 자동 재개 (Todo Enforcer)
→ 사람 개입 없이 완료까지 실행
```

---

## 2. 기존 구현 현황 (Problem)

### jh-클로드대시보드 (현재 존재)
- Stack: Next.js 14 + FastAPI + Supabase
- OMO 벤치마킹 에이전트 탑재 (완전 동작 X)
- ClaudeClient.send_message() async/sync 버그 존재 (미수정)
- 에이전트가 "버튼 클릭 → 수동 실행" 방식 → 시지프스 아님

### 기존 하네스 시스템들
- JH-하네스: bunx jh-harness, Ink TUI, tmux 5-pane (아고니스/아르키/하나/카이/기르)
- JH-키아누: FastAPI + Next.js, 5158 LOC, 39 unit tests (async bug로 75% 완성)
- 하네스 엔지니어링 v2.0: 오늘 설계 완료, 13개 문서 파일

### 핵심 문제
시지프스는 FastAPI/Next.js 인프라가 아닌 **Claude Code의 CLAUDE.md + 프롬프트 설계**로 구현된다.
인프라를 계속 새로 만드는 것이 막힌 원인.

---

## 3. 해결 방향 (Solution)

### 구현 대상
```
CLAUDE.md                     ← 시지프스 오케스트레이터 (Ralph Loop + Todo Enforcer 내장)
.claude/commands/ultrawork.md ← /project:ultrawork 커맨드
.claude/commands/loop.md      ← /project:loop
.claude/commands/start-work.md← /project:start-work
.claude/agents/prometheus.md  ← 플래너 (인터뷰 모드)
.claude/agents/scout.md       ← 탐색/분석 서브에이전트
.claude/agents/oracle.md      ← 아키텍처 상담
.claude/agents/verifier.md    ← 검증 서브에이전트
```

### 대시보드 역할 전환
```
기존: 대시보드 = 에이전트 실행 환경 (틀림)
수정: 대시보드 = 모니터링/관제 레이어만
      실제 실행 = Claude Code 터미널
```

---

## 4. 파일 읽기 순서

```
1. HANDOFF.md          (지금 읽는 이 파일)
2. sisyphus-core.md    CLAUDE.md 작성용 핵심 프롬프트 설계
3. commands.md         커맨드 파일 3개 명세
4. agents.md           서브에이전트 4개 명세
5. dashboard-patch.md  대시보드 관제 전환 패치 방법
6. impl-plan.md        구현 순서 체크리스트
```

---

## 5. 기술 스택 기준

```
메인 모델     : claude-opus-4-6 (Sisyphus 오케스트레이터)
서브에이전트  : claude-sonnet-4-6 (일반), claude-haiku-4-5 (경량)
대시보드      : Next.js 14, Supabase, Tailwind
백엔드        : FastAPI (Python)
언어          : TypeScript (프론트), Python (백엔드)
Export 규칙   : named export만, default export 금지
타입 규칙     : any/unknown 금지
```

---

## 주의사항

- 이 핸드오프를 읽은 Claude Code는 바로 구현을 시작하지 않는다
- impl-plan.md의 체크리스트를 먼저 재하에게 확인 후 구현 시작
- async/sync 버그는 impl-plan.md Step 0에서 먼저 처리
