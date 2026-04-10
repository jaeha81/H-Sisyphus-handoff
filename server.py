#!/usr/bin/env python3
"""
JH Sisyphus — 모니터링 대시보드 서버
FastAPI + Supabase Realtime 프록시
port: 8765
"""

import os
import json
import uuid
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import uvicorn

# ─── 경로 & 환경 설정 ────────────────────────────────────────
ROOT = Path(__file__).parent
PORT = 8765


def _load_env():
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_env()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

# ─── Supabase HTTP 헬퍼 ───────────────────────────────────────
def _sb_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def _sb_insert(table: str, payload: dict) -> dict:
    """Supabase REST API로 row INSERT"""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=_sb_headers(),
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()


async def _sb_update(table: str, match: dict, payload: dict) -> dict:
    """Supabase REST API로 row UPDATE"""
    params = "&".join(f"{k}=eq.{v}" for k, v in match.items())
    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/{table}?{params}",
            headers=_sb_headers(),
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()


# ─── FastAPI 앱 ───────────────────────────────────────────────
app = FastAPI(title="JH Sisyphus Dashboard", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 정적 파일 ───────────────────────────────────────────────
_node_modules = ROOT / "node_modules"
if _node_modules.exists():
    app.mount("/node_modules", StaticFiles(directory=str(_node_modules)), name="node_modules")

# ─── 기본 라우트 ─────────────────────────────────────────────

@app.get("/")
def root():
    html_path = ROOT / "dashboard.html"
    if html_path.exists():
        return FileResponse(str(html_path))
    return JSONResponse({"error": "dashboard.html not found"}, status_code=404)


@app.get("/api/health")
def health():
    return {"status": "ok", "port": PORT, "ts": datetime.now(timezone.utc).isoformat()}


@app.get("/api/config")
def get_config():
    return {
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_KEY,
        "project_name": os.environ.get("PROJECT_NAME", "JH Sisyphus"),
    }


@app.get("/api/status")
def get_status():
    return {
        "agents": ["sisyphus", "scout", "prometheus", "oracle", "verifier"],
        "dashboard_version": "1.1.0",
        "claude_commands": ["/project:ultrawork", "/project:loop", "/project:start-work"],
    }


# ─── Agent Log API ────────────────────────────────────────────

class AgentLogBody(BaseModel):
    agent: str
    state: str
    todo: Optional[str] = None
    message: Optional[str] = None
    wave: Optional[str] = None


@app.post("/api/agent_log")
async def post_agent_log(body: AgentLogBody):
    """
    에이전트 상태 변경 기록 → Supabase agent_logs INSERT
    Claude Code hook 또는 ultrawork 커맨드에서 호출

    예시:
      curl -X POST http://127.0.0.1:8765/api/agent_log \\
        -H 'Content-Type: application/json' \\
        -d '{"agent":"sisyphus","state":"working","todo":"로그인 API 구현","message":"구현 시작"}'
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return JSONResponse({"error": "Supabase 미설정"}, status_code=503)

    payload = {
        "agent": body.agent,
        "state": body.state,
        "todo": body.todo,
        "message": body.message,
        "wave": body.wave,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    result = await _sb_insert("agent_logs", payload)
    return {"ok": True, "data": result}


# ─── Todo API ─────────────────────────────────────────────────

class TodoCreateBody(BaseModel):
    session_id: str
    content: str
    agent: Optional[str] = None
    status: str = "pending"


class TodoUpdateBody(BaseModel):
    status: str   # pending | in_progress | completed


@app.post("/api/todos")
async def create_todo(body: TodoCreateBody):
    """
    Todo 항목 생성 → Supabase todos INSERT
    /project:ultrawork 시작 시 TodoWrite와 함께 호출
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return JSONResponse({"error": "Supabase 미설정"}, status_code=503)

    payload = {
        "session_id": body.session_id,
        "content": body.content,
        "status": body.status,
        "agent": body.agent,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await _sb_insert("todos", payload)
    return {"ok": True, "data": result}


@app.patch("/api/todos/{todo_id}")
async def update_todo(todo_id: str, body: TodoUpdateBody):
    """
    Todo 상태 업데이트 → Supabase todos PATCH
    Task 완료 시 completed로 업데이트
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return JSONResponse({"error": "Supabase 미설정"}, status_code=503)

    payload = {
        "status": body.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await _sb_update("todos", {"id": todo_id}, payload)
    return {"ok": True, "data": result}


@app.post("/api/todos/batch")
async def create_todos_batch(request: Request):
    """
    Todo 목록 일괄 생성 — ultrawork Phase 1 스캔 시 사용
    body: { session_id: str, todos: [{content, agent, status}] }
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return JSONResponse({"error": "Supabase 미설정"}, status_code=503)

    data = await request.json()
    session_id = data.get("session_id", str(uuid.uuid4())[:8])
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "session_id": session_id,
            "content": t.get("content", ""),
            "status": t.get("status", "pending"),
            "agent": t.get("agent"),
            "created_at": now,
            "updated_at": now,
        }
        for t in data.get("todos", [])
    ]
    result = await _sb_insert("todos", rows)
    return {"ok": True, "session_id": session_id, "count": len(rows), "data": result}


# ─── 진입점 ──────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=PORT,
        reload=False,
        log_level="info",
    )
