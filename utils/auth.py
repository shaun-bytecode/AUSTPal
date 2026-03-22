"""
auth.py — 密码哈希 + JWT 工具

依赖：
    pip install bcrypt PyJWT
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta

import bcrypt
import jwt

from utils.config_handler import load_config
from utils.logger_handler import logger

_cfg = load_config("config/auth.yml")
_SECRET  = _cfg["secret_key"]
_ALGO    = _cfg.get("algorithm", "HS256")
_EXPIRES = int(_cfg.get("expire_hours", 24))


# ------------------------------------------------------------------ #
# 密码
# ------------------------------------------------------------------ #

def hash_password(plain: str) -> str:
    """将明文密码哈希为 bcrypt 字符串。"""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码与哈希是否匹配。"""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ------------------------------------------------------------------ #
# JWT
# ------------------------------------------------------------------ #

def create_token(user_id: str) -> str:
    """生成 JWT access token，有效期由 config/auth.yml 的 expire_hours 决定。"""
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=_EXPIRES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGO)


def decode_token(token: str) -> str:
    """解析 JWT，返回 user_id；失败抛出 ValueError。"""
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGO])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise ValueError("token 已过期，请重新登录")
    except jwt.InvalidTokenError as e:
        logger.warning(f"[Auth] 无效 token: {e}")
        raise ValueError("无效的 token")
