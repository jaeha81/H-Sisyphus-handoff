# loop

Ralph Loop 강제 진입. 현재 Todo 상태 기준으로 미완료 항목 처리.

## 실행 순서

1. TodoRead로 전체 Todo 목록 조회
2. 미완료(pending/in_progress) 항목 추출
3. 미완료 없음 → "모든 작업 완료" 출력 후 종료
4. 미완료 있음 → 첫 번째 항목부터 순서대로 처리
5. 처리 완료 시 completed 업데이트
6. 전체 완료까지 루프

## 중단
/project:stop 입력 시에만 중단.
그 외 상황에서 자발적으로 중단하지 않는다.
