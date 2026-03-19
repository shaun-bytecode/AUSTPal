import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import time
from typing import Any, Callable
from langchain_core.messages import SystemMessage
from langchain_core.messages.tool import ToolCall
from utils.logger_handler import logger


_SLOW_TOOL_THRESHOLD = 15.0  # 超过此秒数打 WARNING

def monitor_tool(request: ToolCall, handler: Callable) -> Any:  # 工具执行监控
    """记录工具调用的名称、入参、输出及耗时，捕获并重抛异常。"""
    tool_name = request.get("name", "unknown")
    tool_args = request.get("args", {})

    logger.info(f"[Tool Call] 工具: {tool_name} | 参数: {tool_args}")
    start = time.time()
    try:
        result = handler(request)
        elapsed = time.time() - start
        if elapsed > _SLOW_TOOL_THRESHOLD:
            logger.warning(f"[Tool Slow] 工具: {tool_name} | 耗时: {elapsed:.2f}s（超过 {_SLOW_TOOL_THRESHOLD}s）")
        else:
            logger.info(f"[Tool Done] 工具: {tool_name} | 耗时: {elapsed:.2f}s")
        logger.debug(f"[Tool Result] {tool_name}: {result}")
        return result
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"[Tool Error] 工具: {tool_name} | 耗时: {elapsed:.2f}s | 错误: {e}")
        raise


def log_before_model(state: dict) -> dict:  # 模型执行前日志
    """LangGraph 节点：在进入模型节点前记录当前消息数量和最后一条消息摘要。"""
    messages = state.get("messages", [])
    logger.info(f"[Before Model] 当前消息数: {len(messages)}")
    if messages:
        last = messages[-1]
        preview = str(getattr(last, "content", ""))[:120]
        logger.debug(f"[Before Model] 最后消息类型: {type(last).__name__} | 内容预览: {preview}")
    return state


# 工具名 -> 提示词标识 映射
_TOOL_PROMPT_MAP = {
    "rag_summarize":    "rag",
    "get_weather":      "weather",
    "show_photos":      "photo",
    "play_school_song": "song",
}

def prompt_switch(state: dict) -> dict:  # 动态提示词切换
    """LangGraph 节点：根据最近一次工具调用，动态替换 state 中的系统提示词。"""
    from utils.prompt_loader import (
        load_system_prompts,
        load_rag_prompts,
        load_weather_prompts,
        load_photo_response_prompts,
        load_school_song_prompts,
    )

    loader_map = {
        "rag":     load_rag_prompts,
        "weather": load_weather_prompts,
        "photo":   load_photo_response_prompts,
        "song":    load_school_song_prompts,
    }

    messages = state.get("messages", [])

    # 从最新消息往前找最近一次工具调用，确定目标提示词
    prompt_key = None
    for msg in reversed(messages):
        for tc in getattr(msg, "tool_calls", []) or []:
            name = tc.get("name", "")
            if name in _TOOL_PROMPT_MAP:
                prompt_key = _TOOL_PROMPT_MAP[name]
                break
        if prompt_key:
            break

    loader = loader_map.get(prompt_key, load_system_prompts)
    new_prompt = loader()

    if prompt_key:
        logger.info(f"[Prompt Switch] 切换到提示词: {prompt_key}")
    else:
        logger.debug("[Prompt Switch] 使用默认系统提示词")

    # 替换旧系统消息，将新系统消息插入消息列表头部
    non_system = [m for m in messages if not isinstance(m, SystemMessage)]
    return {**state, "messages": [SystemMessage(content=new_prompt), *non_system]}


if __name__ == "__main__":
    from langchain_core.messages import HumanMessage, AIMessage

    print("=" * 50)
    print(">>> 测试 monitor_tool")

    def fake_handler(req):
        return f"工具 {req['name']} 执行成功，参数: {req['args']}"

    def error_handler(_):
        raise ValueError("模拟工具异常")

    req = {"name": "rag_summarize", "args": {"query": "安徽理工大学有哪些学院"}, "id": "c001"}
    result = monitor_tool(req, fake_handler)
    print(f"正常返回: {result}")

    try:
        monitor_tool(req, error_handler)
    except ValueError as e:
        print(f"异常被正确重抛: {e}")

    print("=" * 50)
    print(">>> 测试 log_before_model")

    state = {
        "messages": [
            HumanMessage(content="你好"),
            AIMessage(content="你好，我是 AUSTPal！"),
        ]
    }
    returned = log_before_model(state)
    print(f"state 原样返回: {returned is state}")

    print("=" * 50)
    print(">>> 测试 prompt_switch")

    ai_msg = AIMessage(content="")
    ai_msg.tool_calls = [{"name": "get_weather", "args": {}, "id": "c002"}]
    state2 = {
        "messages": [
            SystemMessage(content="旧提示词"),
            HumanMessage(content="今天天气怎么样"),
            ai_msg,
        ]
    }
    result2 = prompt_switch(state2)
    new_sys = result2["messages"][0]
    print(f"新系统消息类型: {type(new_sys).__name__}")
    print(f"新提示词前50字: {new_sys.content[:50]}")
    print(f"消息总数: {len(result2['messages'])}（含新系统消息）")