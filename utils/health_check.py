"""
health_check.py — 启动时健康检查

用法（在主程序或 react_agent 初始化时调用）：
    from utils.health_check import run_health_check
    run_health_check()          # 有问题时打 WARNING，不阻断启动
    run_health_check(strict=True)  # 有问题时直接抛出异常，阻断启动
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.logger_handler import logger
from utils.config_handler import agent_conf, chroma_conf
from utils.path_tool import get_abs_path


def _check_api_key() -> tuple[bool, str]:
    """检查 DASHSCOPE_API_KEY 环境变量是否已设置。"""
    key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not key:
        return False, "DASHSCOPE_API_KEY 未设置，LLM 调用将失败"
    if len(key) < 10:
        return False, "DASHSCOPE_API_KEY 长度异常，请确认是否正确"
    return True, "API Key 已设置"


def _check_music_files() -> tuple[bool, str]:
    """检查校歌音频和歌词图片文件是否存在。"""
    missing = []
    for key in ("MUSIC_PATH", "LYRICS_PATH"):
        path = get_abs_path(agent_conf.get(key, ""))
        if not os.path.exists(path):
            missing.append(f"{key}={path}")
    if missing:
        return False, "校歌相关文件缺失: " + "、".join(missing)
    return True, "校歌文件完整"


def _check_chroma_db() -> tuple[bool, str]:
    """检查 Chroma 向量库持久化目录是否存在。"""
    persist_dir = get_abs_path(chroma_conf.get("persist_directory", ""))
    if not os.path.exists(persist_dir):
        return False, f"向量库目录不存在: {persist_dir}（需先运行 vector_store.load_documents）"
    return True, f"向量库目录存在: {persist_dir}"


def _check_weather_api() -> tuple[bool, str]:
    """快速检测 wttr.in 是否可访问（不发出真实请求，只检查网络环境）。"""
    try:
        import socket
        socket.setdefaulttimeout(5)
        socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect(("wttr.in", 80))
        return True, "天气 API 网络可达"
    except Exception as e:
        return False, f"天气 API 网络不可达: {e}"


_CHECKS = [
    ("API Key",    _check_api_key),
    ("校歌文件",   _check_music_files),
    ("向量库目录", _check_chroma_db),
    ("天气网络",   _check_weather_api),
]


def run_health_check(strict: bool = False) -> bool:
    """
    执行所有健康检查，返回是否全部通过。

    Args:
        strict: True 时任意检查失败即抛出 RuntimeError，阻断启动。
    """
    logger.info("[HealthCheck] 开始启动健康检查...")
    all_ok = True
    for name, check_fn in _CHECKS:
        ok, msg = check_fn()
        if ok:
            logger.info(f"[HealthCheck] ✓ {name}: {msg}")
        else:
            all_ok = False
            logger.warning(f"[HealthCheck] ✗ {name}: {msg}")
            if strict:
                raise RuntimeError(f"[HealthCheck] 启动失败 — {name}: {msg}")

    if all_ok:
        logger.info("[HealthCheck] 所有检查通过")
    else:
        logger.warning("[HealthCheck] 存在异常项，服务仍将继续启动")
    return all_ok


if __name__ == "__main__":
    run_health_check()
