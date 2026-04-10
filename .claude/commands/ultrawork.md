# ultrawork

모든 작업의 진입점. Intent Gate → 자율 실행 → Ralph Loop.
대시보드(http://127.0.0.1:8765)에 실시간 상태 기록.

## 대시보드 API 헬퍼

작업 중 아래 bash 함수를 사용해 대시보드에 상태를 기록한다.
서버가 꺼져 있으면 curl은 조용히 실패 — 작업은 중단되지 않는다.

```bash
# 에이전트 상태 기록 (fire-and-forget)
log_agent() {
  curl -sf -X POST http://127.0.0.1:8765/api/agent_log \
    -H "Content-Type: application/json" \
    -d "{\"agent\":\"$1\",\"state\":\"$2\",\"todo\":\"$3\",\"message\":\"$4\"}" >/dev/null 2>&1 || true
}

# Todo 배치 생성 후 session_id 반환
create_todos() {
  # $1: session_id, $2: JSON todos 배열
  curl -sf -X POST http://127.0.0.1:8765/api/todos/batch \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$1\",\"todos\":$2}" >/dev/null 2>&1 || true
}

# Todo 상태 업데이트
update_todo() {
  curl -sf -X PATCH "http://127.0.0.1:8765/api/todos/$1" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"$2\"}" >/dev/null 2>&1 || true
}
```

## 실행 순서

### Step 1: Intent Gate
$ARGUMENTS를 분석하여 의도 분류:
- trivial → 직접 응답 후 종료
- explicit → Step 2 진입
- exploratory → Scout 에이전트 먼저 실행 후 Step 2
- plan-needed → Prometheus 인터뷰 모드 먼저
- ambiguous → 단 1개 질문으로 명확화 후 재시작

### Step 2: 세션 시작 + Todo 작성
1. `SESSION_ID=$(date +%s | tail -c 8)` 로 세션 ID 생성
2. TodoWrite로 전체 작업 목록 작성 (각 항목: [SCOUT]/[IMPL]/[VERIFY]/[ORACLE])
3. 대시보드에 세션 시작 기록:
   ```bash
   log_agent "sisyphus" "planning" "" "ultrawork 시작: $ARGUMENTS"
   ```
4. todos/batch로 전체 Todo를 대시보드에 등록

### Step 3: 병렬 실행
독립 작업은 Task 도구로 동시 실행.
의존 작업은 순차 실행.

각 Task 시작 전:
```bash
log_agent "[에이전트명]" "working" "[Todo 내용]" "작업 시작"
```

각 Task 완료 후:
1. TodoWrite로 completed 업데이트
2. ```bash
   log_agent "[에이전트명]" "done" "[Todo 내용]" "완료"
   ```

### Step 4: Ralph Loop
TodoRead로 전체 점검.
미완료 항목 → 즉시 재개 (확인 없이).
전체 완료 →
```bash
log_agent "sisyphus" "idle" "" "모든 작업 완료"
```
완료 선언.

## 사용 예시
/project:ultrawork 로그인 API와 프론트엔드 연동
/project:ultrawork 인증 시스템 전체 구현
