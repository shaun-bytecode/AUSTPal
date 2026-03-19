"""
FileChatMessageHistory — 基于文件的长期会话历史管理

目录结构：
    data/history/
    └── {user_id}/
        ├── index.json              # 该用户所有会话的索引
        └── {session_id}.json       # 单个会话的消息记录

使用示例：
    history = FileChatMessageHistory(user_id="alice", session_id="session_001")
    history.add_user_message("你好")
    history.add_ai_message("你好！我是 AUSTPal。")
    print(history.messages)
"""

import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from typing import List, Optional

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from utils.logger_handler import logger
from utils.path_tool import get_abs_path


def _msg_to_dict(message: BaseMessage) -> dict:
    if isinstance(message, HumanMessage):
        return {"type": "human", "content": message.content}
    if isinstance(message, AIMessage):
        return {"type": "ai", "content": message.content}
    return {"type": type(message).__name__.lower(), "content": str(message.content)}


def _dict_to_msg(d: dict) -> BaseMessage:
    if d["type"] == "human":
        return HumanMessage(content=d["content"])
    if d["type"] == "ai":
        return AIMessage(content=d["content"])
    # 未知类型降级为 HumanMessage，避免实例化抽象基类
    logger.warning(f"[History] 未知消息类型 '{d['type']}'，降级为 HumanMessage")
    return HumanMessage(content=d["content"])

_DEFAULT_HISTORY_DIR = get_abs_path("data/history")


class FileChatMessageHistory(BaseChatMessageHistory):
    """基于本地 JSON 文件的对话历史，按用户和会话号分隔存储。"""

    def __init__(
        self,
        user_id: str,
        session_id: str,
        history_dir: Optional[str] = None,
    ) -> None:
        self.user_id = user_id
        self.session_id = session_id
        self.history_dir = history_dir or _DEFAULT_HISTORY_DIR

        self._user_dir = os.path.join(self.history_dir, user_id)
        self._session_file = os.path.join(self._user_dir, f"{session_id}.json")
        self._index_file = os.path.join(self._user_dir, "index.json")

        os.makedirs(self._user_dir, exist_ok=True)
        self._ensure_session_file()

    # ------------------------------------------------------------------ #
    # 内部工具
    # ------------------------------------------------------------------ #

    def _now(self) -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def _ensure_session_file(self) -> None:
        """初次访问时创建会话文件并更新用户索引。"""
        if not os.path.exists(self._session_file):
            data = {
                "user_id": self.user_id,
                "session_id": self.session_id,
                "created_at": self._now(),
                "updated_at": self._now(),
                "message_count": 0,
                "messages": [],
            }
            self._write_session(data)
            self._update_index(created=True)
            logger.debug(
                f"[History] 新建会话文件: user={self.user_id} session={self.session_id}"
            )

    def _read_session(self) -> dict:
        with open(self._session_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_session(self, data: dict) -> None:
        with open(self._session_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _update_index(self, created: bool = False) -> None:
        """刷新用户索引文件中的条目。"""
        index = self._read_index()
        entry = index.get(self.session_id, {})
        if created:
            entry["created_at"] = self._now()
        entry["session_id"] = self.session_id
        entry["updated_at"] = self._now()
        entry["message_count"] = len(self.messages)
        index[self.session_id] = entry
        with open(self._index_file, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

    def _read_index(self) -> dict:
        if not os.path.exists(self._index_file):
            return {}
        with open(self._index_file, "r", encoding="utf-8") as f:
            return json.load(f)

    # ------------------------------------------------------------------ #
    # BaseChatMessageHistory 接口
    # ------------------------------------------------------------------ #

    @property
    def messages(self) -> List[BaseMessage]:
        """返回当前会话的所有消息。"""
        data = self._read_session()
        return [_dict_to_msg(d) for d in data["messages"]]

    def add_message(self, message: BaseMessage) -> None:
        """追加一条消息并持久化。"""
        data = self._read_session()
        data["messages"].append(_msg_to_dict(message))
        data["updated_at"] = self._now()
        data["message_count"] = len(data["messages"])
        self._write_session(data)
        self._update_index()
        logger.debug(
            f"[History] 追加消息: user={self.user_id} session={self.session_id} "
            f"type={type(message).__name__} total={data['message_count']}"
        )

    def clear(self) -> None:
        """清空当前会话的所有消息（保留文件和元数据）。"""
        data = self._read_session()
        data["messages"] = []
        data["updated_at"] = self._now()
        data["message_count"] = 0
        self._write_session(data)
        self._update_index()
        logger.info(
            f"[History] 清空会话: user={self.user_id} session={self.session_id}"
        )

    # ------------------------------------------------------------------ #
    # 会话管理静态方法
    # ------------------------------------------------------------------ #

    @staticmethod
    def list_sessions(user_id: str, history_dir: Optional[str] = None) -> List[dict]:
        """列出指定用户的所有会话，按最后更新时间倒序排列。"""
        base = history_dir or _DEFAULT_HISTORY_DIR
        index_file = os.path.join(base, user_id, "index.json")
        if not os.path.exists(index_file):
            return []
        with open(index_file, "r", encoding="utf-8") as f:
            index = json.load(f)
        sessions = list(index.values())
        sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return sessions

    @staticmethod
    def delete_session(
        user_id: str, session_id: str, history_dir: Optional[str] = None
    ) -> bool:
        """删除指定会话文件，并从用户索引中移除。返回是否成功删除。"""
        base = history_dir or _DEFAULT_HISTORY_DIR
        session_file = os.path.join(base, user_id, f"{session_id}.json")
        index_file = os.path.join(base, user_id, "index.json")

        deleted = False
        if os.path.exists(session_file):
            os.remove(session_file)
            deleted = True

        if os.path.exists(index_file):
            with open(index_file, "r", encoding="utf-8") as f:
                index = json.load(f)
            index.pop(session_id, None)
            with open(index_file, "w", encoding="utf-8") as f:
                json.dump(index, f, ensure_ascii=False, indent=2)

        if deleted:
            logger.info(f"[History] 删除会话: user={user_id} session={session_id}")
        return deleted

    @staticmethod
    def list_users(history_dir: Optional[str] = None) -> List[str]:
        """列出所有有历史记录的用户 ID。"""
        base = history_dir or _DEFAULT_HISTORY_DIR
        if not os.path.exists(base):
            return []
        return [
            name
            for name in os.listdir(base)
            if os.path.isdir(os.path.join(base, name))
        ]

    @staticmethod
    def cleanup_old_sessions(days: int = 30, history_dir: Optional[str] = None) -> int:
        """删除所有用户中超过 days 天未更新的会话，返回删除的会话总数。"""
        base = history_dir or _DEFAULT_HISTORY_DIR
        cutoff = datetime.now() - timedelta(days=days)
        deleted = 0
        for user_id in FileChatMessageHistory.list_users(base):
            for session in FileChatMessageHistory.list_sessions(user_id, base):
                updated_str = session.get("updated_at", "")
                try:
                    updated_at = datetime.strptime(updated_str, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    continue
                if updated_at < cutoff:
                    sid = session.get("session_id", "")
                    if sid and FileChatMessageHistory.delete_session(user_id, sid, base):
                        deleted += 1
        logger.info(f"[History] cleanup_old_sessions: 删除 {deleted} 个过期会话（>{days}天）")
        return deleted

    # ------------------------------------------------------------------ #
    # 便捷查询
    # ------------------------------------------------------------------ #

    def get_recent(self, n: int = 10) -> List[BaseMessage]:
        """返回最近 n 条消息。"""
        return self.messages[-n:]

    def session_info(self) -> dict:
        """返回当前会话的元数据（不含消息内容）。"""
        data = self._read_session()
        return {k: v for k, v in data.items() if k != "messages"}


if __name__ == "__main__":
    from langchain_core.messages import AIMessage, HumanMessage

    print("=" * 55)
    print(">>> 测试 FileChatMessageHistory")

    h = FileChatMessageHistory(user_id="test_user", session_id="demo_001")
    h.clear()  # 确保干净状态

    h.add_user_message("安徽理工大学有几个学院？")
    h.add_ai_message("安徽理工大学目前设有 20 余个学院，涵盖理、工、管、文等学科。")
    h.add_user_message("校园面积多大？")
    h.add_ai_message("主校区占地约 3000 亩。")

    print(f"会话信息: {h.session_info()}")
    print(f"消息总数: {len(h.messages)}")
    print(f"最近 2 条: {[type(m).__name__ + ':' + m.content[:20] for m in h.get_recent(2)]}")

    print("\n>>> 用户会话列表:")
    for s in FileChatMessageHistory.list_sessions("test_user"):
        print(f"  {s}")

    print("\n>>> 删除会话:")
    ok = FileChatMessageHistory.delete_session("test_user", "demo_001")
    print(f"  删除成功: {ok}")
    print(f"  剩余会话数: {len(FileChatMessageHistory.list_sessions('test_user'))}")
    print("=" * 55)
