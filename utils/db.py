"""
MySQL 连接池管理
使用 PyMySQL + DBUtils 提供线程安全的连接池。

依赖：
    pip install pymysql dbutils
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymysql
from dbutils.pooled_db import PooledDB
from utils.config_handler import load_config
from utils.logger_handler import logger

_cfg = load_config("config/mysql.yml")

_pool = PooledDB(
    creator=pymysql,
    maxconnections=_cfg.get("pool_size", 5),
    mincached=1,
    maxcached=3,
    blocking=True,
    host=os.environ.get("MYSQL_HOST", _cfg["host"]),
    port=int(_cfg["port"]),
    user=_cfg["user"],
    password=str(_cfg["password"]),
    database=_cfg["database"],
    charset=_cfg.get("charset", "utf8mb4"),
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=False,
)

logger.info(f"[DB] MySQL 连接池已初始化 → {_cfg['host']}:{_cfg['port']}/{_cfg['database']}")


def get_conn():
    """从连接池获取一个连接（用 with 语句自动归还）。

    用法：
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
            conn.commit()
    """
    return _pool.connection()
