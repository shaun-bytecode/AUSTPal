-- AUSTPal 数据库初始化脚本
-- 兼容 MySQL 5.1+，不依赖 DEFAULT CURRENT_TIMESTAMP
-- 字符集：utf8mb4（支持中文及 emoji）

CREATE DATABASE IF NOT EXISTS austpal
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE austpal;

-- ============================================================
-- 1. users — 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(64)      NOT NULL UNIQUE  COMMENT '用户名（登录账号）',
    password_hash   VARCHAR(255)     NOT NULL         COMMENT '密码哈希（bcrypt）',
    display_name    VARCHAR(128)     DEFAULT NULL     COMMENT '显示名称',
    email           VARCHAR(128)     DEFAULT NULL     COMMENT '邮箱（可选）',
    is_active       TINYINT(1)       NOT NULL DEFAULT 1 COMMENT '账号状态：1 正常 / 0 禁用',
    created_at      DATETIME         NOT NULL         COMMENT '注册时间',
    last_active_at  DATETIME         DEFAULT NULL     COMMENT '最后活跃时间',

    INDEX idx_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='用户表';


-- ============================================================
-- 2. sessions — 会话表
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id            BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    session_id    VARCHAR(64)      NOT NULL UNIQUE  COMMENT '会话 UUID，由前端生成',
    user_id       VARCHAR(64)      NOT NULL         COMMENT '关联 users.user_id',
    title         VARCHAR(100)     DEFAULT NULL     COMMENT '会话标题，取首条消息前 20 字',
    message_count INT UNSIGNED     NOT NULL DEFAULT 0,
    is_deleted    TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '软删除：0 正常 / 1 已删除',
    created_at    DATETIME         NOT NULL         COMMENT '创建时间',
    updated_at    DATETIME         NOT NULL         COMMENT '最后更新时间',

    INDEX idx_user_active (user_id, is_deleted, updated_at),

    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='会话表';


-- ============================================================
-- 3. messages — 消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    session_id  VARCHAR(64)      NOT NULL     COMMENT '关联 sessions.session_id',
    role        ENUM('human', 'ai', 'tool', 'system')
                                 NOT NULL     COMMENT '消息角色',
    content     LONGTEXT         NOT NULL     COMMENT '消息正文',
    token_count INT UNSIGNED     DEFAULT NULL COMMENT '消耗 token 数（可选）',
    extra       LONGTEXT         DEFAULT NULL COMMENT '附加信息 JSON：思考链、tool_call_id 等',
    created_at  DATETIME         NOT NULL     COMMENT '消息时间',

    INDEX idx_messages_session (session_id, created_at),

    CONSTRAINT fk_messages_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='消息表';


-- ============================================================
-- 4. tool_calls — 工具调用记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_calls (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    session_id  VARCHAR(64)      NOT NULL     COMMENT '关联 sessions.session_id',
    message_id  BIGINT UNSIGNED  DEFAULT NULL COMMENT '触发此工具调用的 AI 消息 ID',
    tool_name   VARCHAR(64)      NOT NULL     COMMENT 'rag_summarize / get_weather / show_photos / play_school_song',
    tool_input  TEXT             DEFAULT NULL COMMENT '工具入参',
    tool_output TEXT             DEFAULT NULL COMMENT '工具返回结果（可截断）',
    duration_ms INT UNSIGNED     DEFAULT NULL COMMENT '执行耗时（毫秒）',
    created_at  DATETIME         NOT NULL     COMMENT '调用时间',

    INDEX idx_tool_session (session_id, created_at),
    INDEX idx_tool_name    (tool_name),

    CONSTRAINT fk_tool_calls_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='工具调用记录表';


-- ============================================================
-- 5. knowledge_documents — 知识库文档追踪表
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id          BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    file_path   VARCHAR(191)     NOT NULL UNIQUE  COMMENT '相对路径，如 data/md/学校简介.md',
    file_type   ENUM('md', 'pdf', 'txt', 'csv')
                                 NOT NULL         COMMENT '文件类型',
    md5_hash    CHAR(32)         NOT NULL         COMMENT '文件 MD5，用于变更检测',
    chunk_count INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT '切分后的向量块数量',
    file_size   BIGINT UNSIGNED  DEFAULT NULL     COMMENT '文件字节数',
    is_active   TINYINT(1)       NOT NULL DEFAULT 1 COMMENT '是否仍在知识库：1 是 / 0 否',
    indexed_at  DATETIME         NOT NULL         COMMENT '首次入库时间',
    updated_at  DATETIME         NOT NULL         COMMENT '最后更新时间',

    INDEX idx_md5    (md5_hash),
    INDEX idx_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='知识库文档追踪表';
