# AUSTPal — 安徽理工大学智能小帮手

> 基于 RAG + ReAct Agent 的高校智能问答助手，帮助同学和老师快速获取准确的校园信息。

## 项目简述

AUSTPal（安徽理工大学智能小帮手）是一款面向安徽理工大学师生的校园智能问答系统，采用 RAG（检索增强生成）与 LangChain ReAct Agent 架构，将学校简介、院系设置、招生计划、校园标识等官方资料构建为向量知识库，结合通义千问大语言模型进行精准问答；同时集成天气查询、校园风光展示、校歌播放等实用工具，通过 FastAPI 后端提供 SSE 流式接口，配合 React 前端实现多轮对话与会话记忆，为用户提供流畅、准确、多模态的校园信息服务体验。

---

## 功能特性

- **智能问答**：通过 RAG 检索增强生成，回答学校信息相关问题
- **天气查询**：实时获取校区天气状况
- **校园风光**：展示 41 张精选校园风光照片
- **校歌播放**：随时聆听安徽理工大学校歌
- **多轮对话**：支持会话历史记忆，上下文连贯
- **流式输出**：SSE 实时流式响应，体验流畅

## 技术栈

| 层次 | 技术 |
|------|------|
| 后端框架 | FastAPI + Uvicorn |
| AI 框架 | LangChain ReAct Agent |
| 向量数据库 | ChromaDB |
| 语言模型 | 通义千问 qwen3-max |
| 嵌入模型 | text-embedding-v4 |
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 知识库 | Markdown / PDF / CSV 文档 |

## 项目结构

```
AUSTPal/
├── server.py              # FastAPI 主服务（SSE 流式接口）
├── agent/
│   ├── react_agent.py     # LangChain ReAct Agent 核心
│   └── tools/             # Agent 工具集
│       ├── get_weather.py        # 天气查询工具
│       ├── show_photos.py        # 校园风光展示工具
│       ├── play_school_song.py   # 校歌播放工具
│       ├── rag_summarize.py      # RAG 检索工具
│       └── middleware.py         # 工具中间件
├── rag/
│   ├── rag_service.py     # RAG 检索服务
│   ├── vector_store.py    # ChromaDB 向量存储
│   └── chroma_db/         # 向量数据库文件
├── config/
│   ├── agent.yml          # Agent 配置
│   ├── rag.yml            # RAG 配置
│   ├── chroma.yml         # ChromaDB 配置
│   └── prompts.yml        # Prompts 配置
├── prompts/
│   ├── main_prompt.txt         # 主系统提示词
│   ├── rag_prompt.txt          # RAG 链提示词
│   ├── weather_prompt.txt      # 天气工具提示词
│   ├── photo_prompt.txt        # 图片工具提示词
│   └── school_song_prompt.txt  # 校歌工具提示词
├── utils/
│   ├── config_handler.py  # 配置加载工具
│   ├── chat_history.py    # 会话历史管理
│   ├── logger_handler.py  # 日志工具
│   ├── path_tool.py       # 路径工具
│   ├── file_handler.py    # 文件工具
│   ├── prompt_loader.py   # 提示词加载器
│   └── health_check.py    # 健康检查工具
├── data/
│   ├── md/                # Markdown 知识库文档
│   ├── pdf/               # PDF 文档
│   ├── csv/               # 表格数据
│   ├── photo/             # 校园风光照片（41 张）
│   ├── music/             # 校歌音频
│   └── history/           # 用户会话历史
└── web/                   # React 前端
    ├── src/               # 前端源码
    ├── public/            # 静态资源
    └── dist/              # 构建产物
```

## 知识库内容

- 学校简介 / 学校章程
- 教学机构 / 管理机构
- 现任领导 / 历任领导
- 校园标识（校训、校徽、校旗）
- 硕士研究生招生计划
- 校园地图（3 张）

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+

### 安装依赖

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 安装前端依赖
cd web
npm install
```

### 配置

在项目根目录创建 `.env` 文件，填入 API Key：

```env
DASHSCOPE_API_KEY=your_api_key_here
```

### 启动服务

```bash
# 启动后端
python server.py

# 启动前端（另开终端）
cd web
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat` | SSE 流式对话 |
| GET | `/files/{path}` | 本地媒体文件访问 |
| GET | `/proxy/image` | 图片反向代理 |
| GET | `/history/{user_id}` | 列出用户会话 |
| GET | `/history/{user_id}/{session_id}` | 获取会话记录 |
| DELETE | `/history/{user_id}/{session_id}` | 删除会话 |
| GET | `/health` | 健康检查 |

## 许可证

MIT License

---

*安徽理工大学 · AUSTPal Team · 2026*
