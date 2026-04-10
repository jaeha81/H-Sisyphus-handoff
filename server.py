#!/usr/bin/env python3
"""
JH Sisyphus — 모니터링 대시보드 서버
FastAPI + Supabase Realtime 프록시
port: 8765
"""

import os
import json
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# ─── 라우트 ──────────────────────────────────────────────────

@app.get("/")
def root():
    """대시보드 HTML 서빙"""
    html_path = ROOT / "dashboard.html"
    if html_path.exists():
        return FileResponse(str(html_path))
    return JSONResponse({"error": "dashboard.html not found"}, status_code=404)


@app.get("/api/health")
def health():
    """헬스체크"""
    return {
        "status": "ok",
        "port": PORT,
        "ts": datetime.utcnow().isoformat(),
    }


@app.get("/api/config")
def get_config():
    """Supabase 설정 반환 (anon key는 public — RLS로 보호)"""
    return {
        "supabase_url": os.environ.get("SUPABASE_URL", ""),
        "supabase_anon_key": os.environ.get("SUPABASE_ANON_KEY", ""),
        "project_name": os.environ.get("PROJECT_NAME", "JH Sisyphus"),
    }


@app.get("/api/status")
def get_status():
    """현재 에이전트 상태 요약"""
    return {
        "agents": ["sisyphus", "scout", "prometheus", "oracle", "verifier"],
        "dashboard_version": "1.0.0",
        "claude_commands": [
            "/project:ultrawork",
            "/project:loop",
            "/project:start-work",
        ],
    }


# ─── 진입점 ──────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=PORT,
        reload=False,
        log_level="info",
    )
