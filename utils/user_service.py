"""
user_service.py — 用户注册 / 登录业务逻辑

数据库表：users（见 sql/init.sql）
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional

from utils.auth import hash_password, verify_password, create_token
from utils.db import get_conn
from utils.logger_handler import logger


# ------------------------------------------------------------------ #
# 注册
# ------------------------------------------------------------------ #

def register_user(
    user_id: str,
    password: str,
    display_name: Optional[str] = None,
    email: Optional[str] = None,
) -> dict:
    """
    注册新用户。

    Returns:
        {"user_id": ..., "display_name": ...}

    Raises:
        ValueError: 用户名已存在 / 参数不合法
    """
    user_id = user_id.strip()
    password = password.strip()

    if not user_id:
        raise ValueError("用户名不能为空")
    if len(user_id) < 3 or len(user_id) > 64:
        raise ValueError("用户名长度须在 3~64 个字符之间")
    if len(password) < 6:
        raise ValueError("密码长度不能少于 6 位")

    # 检查用户名是否已被占用
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE user_id = %s", (user_id,))
            if cur.fetchone():
                raise ValueError(f"用户名 '{user_id}' 已存在")

    pwd_hash = hash_password(password)

    sql = """
        INSERT INTO users (user_id, password_hash, display_name, email, created_at)
        VALUES (%s, %s, %s, %s, NOW())
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id, pwd_hash, display_name, email))
        conn.commit()

    logger.info(f"[UserService] 新用户注册: {user_id}")
    return {"user_id": user_id, "display_name": display_name}


# ------------------------------------------------------------------ #
# 登录
# ------------------------------------------------------------------ #

def login_user(user_id: str, password: str) -> dict:
    """
    验证账号密码，登录成功返回 JWT token。

    Returns:
        {"access_token": ..., "token_type": "bearer", "user_id": ..., "display_name": ...}

    Raises:
        ValueError: 用户名不存在 / 密码错误 / 账号已禁用
    """
    user_id = user_id.strip()

    sql = "SELECT password_hash, display_name, is_active FROM users WHERE user_id = %s"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            row = cur.fetchone()

    if not row:
        raise ValueError("用户名或密码错误")
    if not row["is_active"]:
        raise ValueError("账号已被禁用，请联系管理员")
    if not verify_password(password, row["password_hash"]):
        raise ValueError("用户名或密码错误")

    # 更新最后活跃时间
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_active_at = NOW() WHERE user_id = %s", (user_id,)
            )
        conn.commit()

    token = create_token(user_id)
    logger.info(f"[UserService] 用户登录: {user_id}")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "display_name": row["display_name"],
    }


# ------------------------------------------------------------------ #
# 查询当前用户信息
# ------------------------------------------------------------------ #

def get_user_info(user_id: str) -> dict:
    """
    根据 user_id 获取用户基本信息（不含密码哈希）。

    Raises:
        ValueError: 用户不存在
    """
    sql = """
        SELECT user_id, display_name, email, is_active,
               DATE_FORMAT(created_at,     '%%Y-%%m-%%d %%H:%%i:%%s') AS created_at,
               DATE_FORMAT(last_active_at, '%%Y-%%m-%%d %%H:%%i:%%s') AS last_active_at
        FROM users
        WHERE user_id = %s
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            row = cur.fetchone()

    if not row:
        raise ValueError("用户不存在")
    return dict(row)
