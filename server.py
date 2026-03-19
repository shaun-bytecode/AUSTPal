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
from urllib.parse import unquote

import requests as _requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.react_agent import ReactAgent
from utils.chat_history import FileChatMessageHistory

PROJECT_ROOT = Path(__file__).parent

app = FastAPI(title="AUSTPal API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_agent = ReactAgent()


class ChatRequest(BaseModel):
    query: str
    user_id: str = "web_user"
    session_id: str


def _patch_local_paths(text: str) -> str:
    return re.sub(
        r'\b(data/[^\s\n"\']+\.(?:jpg|jpeg|png|gif|wav|mp3))',
        r"/files/\1",
        text,
        flags=re.IGNORECASE,
    )


@app.post("/chat")
async def chat(request: ChatRequest):
    """SSE 流式对话接口。每个事件格式：data: {"content": "..."}\n\n"""

    import asyncio

    async def generate():
        q: queue.Queue = queue.Queue()

        def run_agent():
            try:
                for item in _agent.execute_stream(
                    request.query,
                    user_id=request.user_id,
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


@app.get("/files/{path:path}")
async def serve_file(path: str):
    """提供项目本地文件访问（图片、音频等媒体资源）。"""
    file_path = (PROJECT_ROOT / path).resolve()
    root = PROJECT_ROOT.resolve()

    # 安全检查：防止目录遍历
    try:
        file_path.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(file_path))


_REFERER_MAP = {
    "baidu.com":  "https://image.baidu.com/",
    "bing.com":   "https://cn.bing.com/",
    "bing.net":   "https://cn.bing.com/",
}

_PROXY_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}


@app.get("/proxy/image")
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


@app.get("/history/{user_id}")
async def list_sessions(user_id: str):
    """列出用户有实际文件的所有会话（按最后更新时间倒序）。"""
    sessions = FileChatMessageHistory.list_sessions(user_id)
    user_dir = PROJECT_ROOT / "data" / "history" / user_id
    # 只返回文件实际存在的会话
    existing = [s for s in sessions if (user_dir / f"{s['session_id']}.json").exists()]
    return {"sessions": existing}


@app.get("/history/{user_id}/{session_id}")
async def get_session(user_id: str, session_id: str):
    """获取指定会话的完整消息记录（直接读文件，不创建新文件）。"""
    file_path = PROJECT_ROOT / "data" / "history" / user_id / f"{session_id}.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Session not found")
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)


@app.delete("/history/{user_id}/{session_id}")
async def delete_session(user_id: str, session_id: str):
    """删除指定会话。"""
    ok = FileChatMessageHistory.delete_session(user_id, session_id)
    return {"deleted": ok}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
