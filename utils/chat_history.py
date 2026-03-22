"""
MySQLChatMessageHistory — 基于 MySQL 的长期会话历史管理

表结构见 sql/init.sql，对应关系：
    users          → 用户
    sessions       → 会话列表（原 index.json）
    messages       → 消息记录（原 {session_id}.json）

使用示例：
    history = FileChatMessageHistory(user_id="alice", session_id="session_001")
    history.add_user_message("你好")
    history.add_ai_message("你好！我是 AUSTPal。")
    print(history.messages)
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import List, Optional

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from utils.db import get_conn
from utils.logger_handler import logger


def _msg_to_role(message: BaseMessage) -> str:
    if isinstance(message, HumanMessage):
        return "human"
    if isinstance(message, AIMessage):
        return "ai"
    return "system"


def _row_to_msg(row: dict) -> BaseMessage:
    role = row["role"]
    content = row["content"]
    if role == "human":
        return HumanMessage(content=content)
    if role == "ai":
        return AIMessage(content=content)
    logger.warning(f"[History] 未知消息角色 '{role}'，降级为 HumanMessage")
    return HumanMessage(content=content)


class FileChatMessageHistory(BaseChatMessageHistory):
    """基于 MySQL 的对话历史，接口与原文件版本保持一致。"""

    def __init__(self, user_id: str, session_id: str, **_) -> None:
        self.user_id = user_id
        self.session_id = session_id
        self._ensure_user()
        self._ensure_session()

    # ------------------------------------------------------------------ #
    # 内部工具
    # ------------------------------------------------------------------ #

    def _ensure_user(self) -> None:
        """更新最后活跃时间（用户已通过 /auth/register 注册，必然存在于 users 表）。"""
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE users SET last_active_at = NOW() WHERE user_id = %s",
                    (self.user_id,),
                )
            conn.commit()

    def _ensure_session(self) -> None:
        """会话不存在时自动创建。"""
        sql = """
            INSERT INTO sessions (session_id, user_id, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW())
            ON DUPLICATE KEY UPDATE session_id = session_id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (self.session_id, self.user_id))
            conn.commit()
        logger.debug(f"[History] 确认会话: user={self.user_id} session={self.session_id}")

    # ------------------------------------------------------------------ #
    # BaseChatMessageHistory 接口
    # ------------------------------------------------------------------ #

    @property
    def messages(self) -> List[BaseMessage]:
        """返回当前会话的所有消息。"""
        sql = """
            SELECT role, content
            FROM messages
            WHERE session_id = %s
            ORDER BY created_at, id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (self.session_id,))
                rows = cur.fetchall()
        return [_row_to_msg(r) for r in rows]

    def add_message(self, message: BaseMessage) -> None:
        """追加一条消息并更新会话统计。"""
        role = _msg_to_role(message)
        content = message.content if isinstance(message.content, str) else str(message.content)

        insert_msg = """
            INSERT INTO messages (session_id, role, content, created_at)
            VALUES (%s, %s, %s, NOW())
        """
        update_session = """
            UPDATE sessions
            SET message_count = message_count + 1,
                updated_at    = NOW(),
                title         = CASE
                                    WHEN title IS NULL AND %s = 'human'
                                    THEN LEFT(%s, 20)
                                    ELSE title
                                END
            WHERE session_id = %s
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(insert_msg, (self.session_id, role, content))
                cur.execute(update_session, (role, content, self.session_id))
            conn.commit()
        logger.debug(
            f"[History] 追加消息: user={self.user_id} session={self.session_id} role={role}"
        )

    def clear(self) -> None:
        """清空当前会话的所有消息（保留会话记录）。"""
        delete_msgs = "DELETE FROM messages WHERE session_id = %s"
        reset_session = "UPDATE sessions SET message_count = 0, updated_at = NOW() WHERE session_id = %s"
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(delete_msgs, (self.session_id,))
                cur.execute(reset_session, (self.session_id,))
            conn.commit()
        logger.info(f"[History] 清空会话: user={self.user_id} session={self.session_id}")

    # ------------------------------------------------------------------ #
    # 便捷查询
    # ------------------------------------------------------------------ #

    def get_recent(self, n: int = 10) -> List[BaseMessage]:
        """返回最近 n 条消息。"""
        sql = """
            SELECT role, content FROM (
                SELECT role, content, created_at, id
                FROM messages
                WHERE session_id = %s
                ORDER BY created_at DESC, id DESC
                LIMIT %s
            ) sub
            ORDER BY created_at, id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (self.session_id, n))
                rows = cur.fetchall()
        return [_row_to_msg(r) for r in rows]

    def session_info(self) -> dict:
        """返回当前会话的元数据（不含消息内容）。"""
        sql = """
            SELECT session_id, user_id, title, message_count,
                   created_at, updated_at
            FROM sessions
            WHERE session_id = %s
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (self.session_id,))
                row = cur.fetchone()
        if not row:
            return {}
        return {k: str(v) if v is not None else None for k, v in row.items()}

    # ------------------------------------------------------------------ #
    # 静态管理方法（接口与原文件版本一致）
    # ------------------------------------------------------------------ #

    @staticmethod
    def list_sessions(user_id: str, **_) -> List[dict]:
        """列出指定用户的所有会话，按最后更新时间倒序。"""
        sql = """
            SELECT session_id, user_id, title, message_count,
                   DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at,
                   DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS updated_at
            FROM sessions
            WHERE user_id = %s AND is_deleted = 0
            ORDER BY updated_at DESC
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (user_id,))
                return cur.fetchall()

    @staticmethod
    def get_session_data(user_id: str, session_id: str) -> Optional[dict]:
        """获取会话元数据及完整消息列表（供 API 直接返回）。"""
        session_sql = """
            SELECT session_id, user_id, title, message_count,
                   DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at,
                   DATE_FORMAT(updated_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS updated_at
            FROM sessions
            WHERE session_id = %s AND user_id = %s AND is_deleted = 0
        """
        messages_sql = """
            SELECT role AS type, content
            FROM messages
            WHERE session_id = %s
            ORDER BY created_at, id
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(session_sql, (session_id, user_id))
                session = cur.fetchone()
                if not session:
                    return None
                cur.execute(messages_sql, (session_id,))
                msgs = cur.fetchall()

        result = {k: str(v) if v is not None else None for k, v in session.items()}
        result["messages"] = [dict(m) for m in msgs]
        return result

    @staticmethod
    def delete_session(user_id: str, session_id: str, **_) -> bool:
        """软删除指定会话。返回是否成功。"""
        sql = """
            UPDATE sessions
            SET is_deleted = 1, updated_at = NOW()
            WHERE session_id = %s AND user_id = %s AND is_deleted = 0
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (session_id, user_id))
                affected = cur.rowcount
            conn.commit()
        if affected:
            logger.info(f"[History] 删除会话: user={user_id} session={session_id}")
        return affected > 0

    @staticmethod
    def list_users(**_) -> List[str]:
        """列出所有有历史记录的用户 ID。"""
        sql = "SELECT DISTINCT user_id FROM sessions WHERE is_deleted = 0"
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                return [row["user_id"] for row in cur.fetchall()]

    @staticmethod
    def cleanup_old_sessions(days: int = 30, **_) -> int:
        """软删除所有超过 days 天未更新的会话，返回删除数量。"""
        sql = """
            UPDATE sessions
            SET is_deleted = 1
            WHERE is_deleted = 0
              AND updated_at < NOW() - INTERVAL %s DAY
        """
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (days,))
                deleted = cur.rowcount
            conn.commit()
        logger.info(f"[History] cleanup_old_sessions: 删除 {deleted} 个过期会话（>{days}天）")
        return deleted


if __name__ == "__main__":
    print("=" * 55)
    print(">>> 测试 MySQLChatMessageHistory")

    h = FileChatMessageHistory(user_id="test_user", session_id="demo_001")
    h.clear()

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
