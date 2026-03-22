"""
AUSTPal FastAPI Server
前后端桥接层，将 ReactAgent 封装为 SSE 流式接口供前端调用。
"""

import json
import os
import queue
import re
import sys
import threading
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

import requests as _requests
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.react_agent import ReactAgent
from utils.auth import decode_token
from utils.chat_history import FileChatMessageHistory
from utils.user_service import get_user_info, login_user, register_user

PROJECT_ROOT = Path(__file__).parent

app = FastAPI(title="AUSTPal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_agent = ReactAgent()
_bearer = HTTPBearer()


# ------------------------------------------------------------------ #
# JWT 依赖：从 Authorization: Bearer <token> 中解析当前用户
# ------------------------------------------------------------------ #

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    """FastAPI 依赖项，返回当前登录的 user_id；token 无效则 401。"""
    try:
        return decode_token(credentials.credentials)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ------------------------------------------------------------------ #
# 请求 / 响应模型
# ------------------------------------------------------------------ #

class RegisterRequest(BaseModel):
    user_id: str
    password: str
    display_name: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    user_id: str
    password: str


class ChatRequest(BaseModel):
    query: str
    session_id: str


# ------------------------------------------------------------------ #
# 工具函数
# ------------------------------------------------------------------ #

def _patch_local_paths(text: str) -> str:
    return re.sub(
        r'\b(data/[^\s\n"\']+\.(?:jpg|jpeg|png|gif|wav|mp3))',
        r"/files/\1",
        text,
        flags=re.IGNORECASE,
    )


# ------------------------------------------------------------------ #
# 认证接口
# ------------------------------------------------------------------ #

@app.post("/auth/register", summary="注册")
async def register(request: RegisterRequest):
    """
    注册新用户。

    - `user_id`：登录账号，3~64 字符
    - `password`：密码，不少于 6 位
    - `display_name`：可选显示名称
    - `email`：可选邮箱
    """
    try:
        result = register_user(
            user_id=request.user_id,
            password=request.password,
            display_name=request.display_name,
            email=request.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "注册成功", **result}


@app.post("/auth/login", summary="登录")
async def login(request: LoginRequest):
    """
    登录，成功返回 JWT access_token。

    前端将 token 存入 localStorage，后续请求在 Header 中携带：
    `Authorization: Bearer <token>`
    """
    try:
        result = login_user(user_id=request.user_id, password=request.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return result


@app.get("/auth/me", summary="获取当前用户信息")
async def me(current_user: str = Depends(get_current_user)):
    """返回当前登录用户的基本信息（需携带 token）。"""
    try:
        return get_user_info(current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ------------------------------------------------------------------ #
# 对话接口（需登录）
# ------------------------------------------------------------------ #

@app.post("/chat", summary="流式对话")
async def chat(
    request: ChatRequest,
    current_user: str = Depends(get_current_user),
):
    """SSE 流式对话接口。每个事件格式：data: {"type": "...", "content": "..."}\n\n"""

    import asyncio

    async def generate():
        q: queue.Queue = queue.Queue()

        def run_agent():
            try:
                for item in _agent.execute_stream(
                    request.query,
                    user_id=current_user,
                    session_id=request.session_id,
                    stream_thinking=True,
                ):
                    q.put(item)
            except Exception as exc:
                q.put({"type": "answer", "content": f"\n\n> ⚠️ 服务暂时不可用，请稍后重试。（{exc}）"})
            finally:
                q.put(None)  # sentinel

        thread = threading.Thread(target=run_agent, daemon=True)
        thread.start()

        loop = asyncio.get_event_loop()
        while True:
            item = await loop.run_in_executor(None, q.get)
            if item is None:
                break
            event_type = item.get("type", "answer")
            content = item.get("content", "")
            if event_type == "answer":
                content = _patch_local_paths(content)
            data = json.dumps({"type": event_type, "content": content}, ensure_ascii=False)
            yield f"data: {data}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ------------------------------------------------------------------ #
# 历史记录接口（需登录，且只能访问自己的会话）
# ------------------------------------------------------------------ #

@app.get("/history", summary="列出当前用户所有会话")
async def list_sessions(current_user: str = Depends(get_current_user)):
    sessions = FileChatMessageHistory.list_sessions(current_user)
    return {"sessions": sessions}


@app.get("/history/{session_id}", summary="获取指定会话的完整消息")
async def get_session(
    session_id: str,
    current_user: str = Depends(get_current_user),
):
    data = FileChatMessageHistory.get_session_data(current_user, session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Session not found")
    # 历史 AI 消息中的本地路径需要与实时流保持一致
    for msg in data.get("messages", []):
        if msg.get("type") == "ai":
            msg["content"] = _patch_local_paths(msg["content"])
    return data


@app.delete("/history/{session_id}", summary="删除指定会话")
async def delete_session(
    session_id: str,
    current_user: str = Depends(get_current_user),
):
    ok = FileChatMessageHistory.delete_session(current_user, session_id)
    return {"deleted": ok}


# ------------------------------------------------------------------ #
# 媒体资源接口（无需登录）
# ------------------------------------------------------------------ #

@app.get("/files/{path:path}", summary="本地文件访问")
async def serve_file(path: str):
    """提供项目本地文件访问（图片、音频等媒体资源）。"""
    file_path = (PROJECT_ROOT / path).resolve()
    root = PROJECT_ROOT.resolve()
    try:
        file_path.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


_REFERER_MAP = {
    "baidu.com": "https://image.baidu.com/",
    "bing.com":  "https://cn.bing.com/",
    "bing.net":  "https://cn.bing.com/",
}

_PROXY_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}


@app.get("/proxy/image", summary="图片反向代理")
async def proxy_image(url: str = Query(...)):
    """图片反向代理，携带正确 Referer 绕过防盗链。"""
    decoded = unquote(url)
    if not decoded.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL")

    headers = dict(_PROXY_HEADERS)
    for domain, referer in _REFERER_MAP.items():
        if domain in decoded:
            headers["Referer"] = referer
            break

    try:
        resp = _requests.get(decoded, headers=headers, timeout=15, stream=True)
        resp.raise_for_status()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    content_type = resp.headers.get("Content-Type", "image/jpeg")
    return Response(content=resp.content, media_type=content_type)


# ------------------------------------------------------------------ #
# 健康检查
# ------------------------------------------------------------------ #

@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
