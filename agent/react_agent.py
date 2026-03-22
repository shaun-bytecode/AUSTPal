import os
import re
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from functools import partial
from typing import TypedDict, Literal, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage

from langgraph.graph import StateGraph, END

from model.factory import chat_model
from utils.prompt_loader import load_system_prompts
from utils.chat_history import FileChatMessageHistory
from agent.tools.rag_summarize import rag_summarize
from agent.tools.get_weather import get_weather
from agent.tools.play_school_song import play_school_song
from agent.tools.show_photos import show_photos
from agent.tools.middleware import monitor_tool, log_before_model, prompt_switch, set_current_session


class AgentState(TypedDict):
    messages: list[BaseMessage]


TOOLS = [rag_summarize, get_weather, play_school_song, show_photos]
_TOOL_MAP = {t.name: t for t in TOOLS}
_model_with_tools = chat_model.bind_tools(TOOLS)


def _call_model(state: AgentState) -> AgentState:
    response = _model_with_tools.invoke(state["messages"])
    return {"messages": [*state["messages"], response]}


def _invoke_tool(name: str, request: dict):
    return _TOOL_MAP[name].invoke(request["args"])


def _tool_node(state: AgentState) -> AgentState:
    messages = state["messages"]
    last = messages[-1]
    tool_messages = []
    for tc in last.tool_calls:
        try:
            result = monitor_tool(tc, partial(_invoke_tool, tc["name"]))
            content = str(result)
        except Exception as e:
            content = f"工具执行失败，请稍后重试或换个方式提问。（原因：{e}）"
        tool_messages.append(
            ToolMessage(content=content, tool_call_id=tc["id"], name=tc["name"])
        )
    return {"messages": [*messages, *tool_messages]}


def _should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


_builder = StateGraph(AgentState)
_builder.add_node("log_before_model", log_before_model)
_builder.add_node("call_model", _call_model)
_builder.add_node("tools", _tool_node)
_builder.add_node("prompt_switch", prompt_switch)

_builder.set_entry_point("log_before_model")
_builder.add_edge("log_before_model", "call_model")
_builder.add_conditional_edges("call_model", _should_continue, {"tools": "tools", END: END})
_builder.add_edge("tools", "prompt_switch")
_builder.add_edge("prompt_switch", "log_before_model")

_graph = _builder.compile()


class ReactAgent:
    def __init__(self):
        self.graph = _graph

    def execute_stream(
        self,
        query: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        history_window: int = 20,
        verbose: bool = False,
        stream_thinking: bool = False,
    ):
        """流式执行一次对话。

        Args:
            query: 用户输入。
            user_id: 用户标识，与 session_id 同时提供时启用历史记忆。
            session_id: 会话标识。
            history_window: 注入上下文的最近消息条数，默认 20。
            verbose: True 时额外输出模型的工具调用决策和思考过程，用于调试。
        """
        # 绑定 session_id 到当前线程，供 monitor_tool 写 tool_calls 表
        set_current_session(session_id)

        # 加载历史消息
        history: Optional[FileChatMessageHistory] = None
        history_messages: list = []
        if user_id and session_id:
            history = FileChatMessageHistory(user_id=user_id, session_id=session_id)
            history_messages = history.get_recent(history_window)

        input_dict = {
            "messages": [
                SystemMessage(content=load_system_prompts()),
                *history_messages,
                HumanMessage(content=query),
            ]
        }

        ai_reply_parts: list[str] = []
        # 跳过 input_dict 里已有的消息（含历史记录），只处理图执行过程中新增的消息
        seen_count = len(input_dict["messages"])
        react_round = 0
        for chunk in self.graph.stream(input_dict, stream_mode="values"):
            messages = chunk["messages"]
            for last in messages[seen_count:]:
                seen_count += 1
                if isinstance(last, AIMessage) and last.tool_calls:
                    react_round += 1
                    if stream_thinking:
                        raw = last.content.strip() if last.content else ""
                        parts = [f"**第 {react_round} 轮推理**"]
                        think_match = re.search(
                            r"<(?:think|thinking|reasoning)>(.*?)</(?:think|thinking|reasoning)>",
                            raw, re.DOTALL | re.IGNORECASE,
                        )
                        if think_match:
                            thought = think_match.group(1).strip()
                            if thought:
                                parts.append(f"\n💭 {thought}")
                        elif raw:
                            rest = re.sub(
                                r"<(?:think|thinking|reasoning)>.*?</(?:think|thinking|reasoning)>",
                                "", raw, flags=re.DOTALL | re.IGNORECASE,
                            ).strip()
                            if rest:
                                parts.append(f"\n{rest}")
                        for tc in last.tool_calls:
                            parts.append(f"\n🔧 调用工具 `{tc['name']}`，参数：`{tc['args']}`")
                        yield {"type": "thinking", "content": "\n".join(parts) + "\n"}
                    elif verbose:
                        yield f"\n{'─'*50}\n【第{react_round}次推理循环】\n"
                        raw = last.content.strip() if last.content else ""
                        think_match = re.search(
                            r"<(?:think|thinking|reasoning)>(.*?)</(?:think|thinking|reasoning)>",
                            raw, re.DOTALL | re.IGNORECASE,
                        )
                        if think_match:
                            yield f"【思考 Thought】\n{think_match.group(1).strip()}\n"
                            rest = re.sub(
                                r"<(?:think|thinking|reasoning)>.*?</(?:think|thinking|reasoning)>",
                                "", raw, flags=re.DOTALL | re.IGNORECASE,
                            ).strip()
                            if rest:
                                yield f"{rest}\n"
                        elif raw:
                            yield f"{raw}\n"
                        for tc in last.tool_calls:
                            yield f"  [执行] {tc['name']}({tc['args']})\n"
                elif isinstance(last, ToolMessage) and last.content:
                    if stream_thinking:
                        preview = last.content.strip()[:500]
                        suffix = "…" if len(last.content.strip()) > 500 else ""
                        yield {"type": "thinking", "content": f"\n📋 **{last.name}** 返回：\n{preview}{suffix}\n"}
                    elif verbose:
                        yield f"【观察 Observation】{last.name} 返回：\n{last.content.strip()}\n"
                elif isinstance(last, AIMessage) and last.content and not last.tool_calls:
                    text = last.content.strip()
                    ai_reply_parts.append(text)
                    if stream_thinking:
                        yield {"type": "answer", "content": text + "\n"}
                    elif verbose:
                        yield f"\n{'─'*50}\n【最终回答 Final Answer】\n{text}\n"
                    else:
                        yield text + "\n"

        # 本轮对话持久化
        if history is not None and ai_reply_parts:
            history.add_user_message(query)
            history.add_ai_message("\n".join(ai_reply_parts))


if __name__ == "__main__":
    UID, SID = "test_user", "demo_session"

    # 清空上次测试记录，保证干净状态
    FileChatMessageHistory.delete_session(UID, SID)

    agent = ReactAgent()
    #rounds = ["安徽理工大学在哪里","一共有哪些学院"]
    #rounds = ["今天天气怎么样？"]
    #rounds = ["我想听校歌"]
    #rounds = ["我想看看校园的图书馆"]
    rounds = ["你好"]

    for i, q in enumerate(rounds, 1):
        print(f"\n{'='*50}\n第 {i} 轮: {q}")
        for chunk in agent.execute_stream(q, user_id=UID, session_id=SID, verbose=True):
            print(chunk, end="", flush=True)
