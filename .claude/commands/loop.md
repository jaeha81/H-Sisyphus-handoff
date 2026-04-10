# loop

Ralph Loop 강제 진입. 현재 Todo 상태 기준으로 미완료 항목 처리.
대시보드(http://127.0.0.1:8765)에 실시간 상태 기록.

## 실행 순서

1. 루프 시작 기록:
   ```bash
   curl -sf -X POST http://127.0.0.1:8765/api/agent_log \
     -H "Content-Type: application/json" \
     -d '{"agent":"sisyphus","state":"looping","message":"Ralph Loop 진입"}' >/dev/null 2>&1 || true
   ```
2. TodoRead로 전체 Todo 목록 조회
3. 미완료(pending/in_progress) 항목 추출
4. 미완료 없음 → idle 기록 후 "모든 작업 완료" 출력 후 종료:
   ```bash
   curl -sf -X POST http://127.0.0.1:8765/api/agent_log \
     -H "Content-Type: application/json" \
     -d '{"agent":"sisyphus","state":"idle","message":"Ralph Loop 완료"}' >/dev/null 2>&1 || true
   ```
5. 미완료 있음 → 첫 번째 항목부터 순서대로 처리
   - 시작 전: agent_log POST (state: working, todo: 항목 내용)
   - 완료 후: TodoWrite completed + agent_log POST (state: done)
6. 전체 완료까지 루프

## 중단

/project:stop 입력 시에만 중단.
그 외 상황에서 자발적으로 중단하지 않는다.
