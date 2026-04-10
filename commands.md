# 커맨드 파일 명세

> 경로: .claude/commands/ 아래 파일 3개 생성
> Claude Code에서 /project:[커맨드명] 으로 호출됨

---

## 파일 1: .claude/commands/ultrawork.md

```markdown
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
/project:ultrawork ulw 인증 시스템 전체 구현
```

---

## 파일 2: .claude/commands/loop.md

```markdown
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
```

---

## 파일 3: .claude/commands/start-work.md

```markdown
# start-work

Prometheus가 생성한 plan.md를 기반으로 구현 시작.
plan.md가 없으면 Prometheus 인터뷰 모드 먼저 실행.

## 실행 순서

### plan.md 있는 경우
1. plan.md 읽기
2. Todo 섹션 추출 → TodoWrite로 등록
3. 파일 소유권 섹션 확인 (File Lock)
4. ultrawork 워크플로우 Step 3부터 실행

### plan.md 없는 경우
1. "plan.md가 없습니다. Prometheus 인터뷰를 시작합니다." 출력
2. Task(description="플래닝", prompt="...")로 prometheus 에이전트 호출
3. Prometheus 결과로 plan.md 생성
4. 재하의 승인 요청
5. 승인 후 구현 시작

## 파일 소유권 (File Lock)
plan.md의 "파일 소유권" 섹션을 읽어 에이전트별 담당 파일 확인.
다른 에이전트의 소유 파일 수정 금지.
```
