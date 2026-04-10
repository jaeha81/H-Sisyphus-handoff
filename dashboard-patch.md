# 대시보드 관제 전환 패치

> jh-클로드대시보드를 "실행 환경"에서 "관제 레이어"로 전환하는 방법.
> 기존 코드를 최소한으로 수정하면서 역할을 바꾼다.

---

## 현재 구조 vs 목표 구조

```
[현재]
대시보드 → Claude API 직접 호출 → 에이전트 실행
(async/sync 버그로 동작 불완전)

[목표]
Claude Code 터미널 → 실제 실행
대시보드 → Supabase 로그 구독 → 상태 표시만
```

---

## Step 1: Supabase 테이블 생성

```sql
-- 에이전트 로그 테이블
create table agent_logs (
  id uuid default gen_random_uuid() primary key,
  agent text not null,           -- 'sisyphus' | 'scout' | 'prometheus' | ...
  state text not null,           -- 'idle' | 'thinking' | 'executing' | 'done' | 'error'
  todo text,                     -- 현재 처리 중인 Todo 항목
  message text,                  -- 상태 메시지
  wave text,                     -- 'Wave 0' | 'Wave 1' | ...
  ts timestamptz default now()
);

-- Realtime 활성화
alter publication supabase_realtime add table agent_logs;

-- Todo 추적 테이블
create table todos (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  content text not null,
  status text default 'pending',  -- 'pending' | 'in_progress' | 'completed'
  agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter publication supabase_realtime add table todos;
```

---

## Step 2: CLAUDE.md에 로깅 훅 추가

CLAUDE.md의 "대시보드 연동" 섹션에 다음 추가:

```markdown
## 대시보드 로깅 규칙

에이전트 상태 변경 시 다음 curl 명령으로 Supabase에 기록:

상태 변경 시:
```bash
curl -X POST "$SUPABASE_URL/rest/v1/agent_logs" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent":"sisyphus","state":"executing","todo":"[현재 Todo]","message":"[상태 메시지]"}'
```

Todo 업데이트 시:
```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/todos?session_id=eq.[세션ID]&content=eq.[Todo내용]" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","updated_at":"now()"}'
```

환경변수는 .env에서 읽음. .env는 절대 커밋하지 않는다.
```

---

## Step 3: 대시보드 프론트엔드 수정

### 기존 에이전트 실행 버튼 → 모니터링 패널로 교체

```typescript
// src/components/AgentMonitor.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AgentLog {
  id: string
  agent: string
  state: string
  todo: string | null
  message: string | null
  ts: string
}

export function AgentMonitor() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const supabase = createClient()

  useEffect(() => {
    // 초기 로그 로드
    const loadLogs = async () => {
      const { data } = await supabase
        .from('agent_logs')
        .select('*')
        .order('ts', { ascending: false })
        .limit(50)
      if (data) setLogs(data)
    }
    loadLogs()

    // Realtime 구독
    const channel = supabase
      .channel('agent_logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_logs' },
        (payload) => {
          setLogs(prev => [payload.new as AgentLog, ...prev].slice(0, 50))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const stateColor = (state: string) => ({
    idle: 'text-gray-400',
    thinking: 'text-yellow-400',
    executing: 'text-blue-400',
    done: 'text-green-400',
    error: 'text-red-400',
  }[state] ?? 'text-gray-400')

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-white font-mono text-sm mb-3">
        🤖 JH 시지프스 — 실시간 관제
      </h2>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-2 text-xs font-mono">
            <span className="text-gray-500 shrink-0">
              {new Date(log.ts).toLocaleTimeString('ko-KR')}
            </span>
            <span className="text-purple-400 shrink-0 w-16">{log.agent}</span>
            <span className={`shrink-0 w-12 ${stateColor(log.state)}`}>
              {log.state}
            </span>
            <span className="text-gray-300 truncate">
              {log.todo ?? log.message ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Todo 진행률 패널

```typescript
// src/components/TodoProgress.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Todo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  agent: string | null
}

export function TodoProgress({ sessionId }: { sessionId: string }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const supabase = createClient()

  useEffect(() => {
    const loadTodos = async () => {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')
      if (data) setTodos(data)
    }
    loadTodos()

    const channel = supabase
      .channel('todos_' + sessionId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'todos',
          filter: `session_id=eq.${sessionId}` },
        () => loadTodos()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const completed = todos.filter(t => t.status === 'completed').length
  const progress = todos.length > 0 ? Math.round(completed / todos.length * 100) : 0

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex justify-between text-sm font-mono mb-2">
        <span className="text-white">Todo 진행률</span>
        <span className="text-green-400">{completed}/{todos.length} ({progress}%)</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
        <div
          className="bg-green-400 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="space-y-1">
        {todos.map(todo => (
          <div key={todo.id} className="flex items-center gap-2 text-xs font-mono">
            <span className="shrink-0">
              {todo.status === 'completed' ? '✅' :
               todo.status === 'in_progress' ? '🔄' : '⬜'}
            </span>
            <span className="text-gray-400 shrink-0 w-16">{todo.agent ?? ''}</span>
            <span className={todo.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-300'}>
              {todo.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 4: async/sync 버그 수정 (ClaudeClient)

jh-클로드대시보드에서 Claude API를 직접 호출하는 부분이 있다면 수정:

```python
# ❌ 현재 (추정)
import anthropic

class ClaudeClient:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=...)  # sync 클라이언트

    async def chat(self, ...):
        response = self.client.messages.create(...)  # ❌ async 함수 안에서 sync 호출

# ✅ 수정
import anthropic

class ClaudeClient:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=...)  # async 클라이언트

    async def chat(self, ...):
        response = await self.client.messages.create(...)  # ✅ await 사용
```

TypeScript (Next.js)의 경우:
```typescript
// ✅ 서버 컴포넌트 또는 API Route에서
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: '...' }]
  })
  return Response.json(message)
}
```

---

## 수정 후 대시보드 역할 요약

```
Claude Code 터미널 (실행)
  │
  ├─ CLAUDE.md 시지프스가 실행 중
  ├─ Todo 변경 시 → Supabase agent_logs 기록
  └─ 완료 시 → Supabase todos 업데이트
          │
          ▼ Realtime 구독
jh-클로드대시보드 (관제)
  ├─ AgentMonitor: 에이전트 상태 실시간 표시
  ├─ TodoProgress: 진행률 바 표시
  └─ 알림: 완료/에러 시 OS 알림
```
