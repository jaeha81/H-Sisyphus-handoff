# start-work

Prometheus가 생성한 plan.md를 기반으로 구현 시작.
plan.md가 없으면 Prometheus 인터뷰 모드 먼저 실행.
대시보드(http://127.0.0.1:8765)에 실시간 상태 기록.

## 실행 순서

### plan.md 있는 경우

1. plan.md 읽기
2. Todo 섹션 추출 → TodoWrite로 등록
3. 세션 시작 기록:

```bash
SESSION_ID=$(date +%s | tail -c 8)
curl -sf -X POST http://127.0.0.1:8765/api/agent_log \
  -H "Content-Type: application/json" \
  -d "{\"agent\":\"sisyphus\",\"state\":\"planning\",\"message\":\"start-work: plan.md 기반 실행\"}" >/dev/null 2>&1 || true
```

4. todos/batch로 전체 Todo를 대시보드에 등록
5. 파일 소유권 섹션 확인 (File Lock)
6. ultrawork 워크플로우 Step 3부터 실행
   - 각 Task 시작 전: agent_log (state: working)
   - 각 Task 완료 후: agent_log (state: done)

### plan.md 없는 경우

1. "plan.md가 없습니다. Prometheus 인터뷰를 시작합니다." 출력
2. Task(description="플래닝", prompt="...") 로 prometheus 에이전트 호출
3. Prometheus 결과로 plan.md 생성
4. 재하의 승인 요청
5. 승인 후 구현 시작

## 파일 소유권 (File Lock)

plan.md의 "파일 소유권" 섹션을 읽어 에이전트별 담당 파일 확인.
다른 에이전트의 소유 파일 수정 금지.
