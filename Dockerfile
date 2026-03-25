# ── Backend: FastAPI + LangChain ──
FROM python:3.11-slim

WORKDIR /app

# 使用国内镜像源加速
RUN sed -i 's|deb.debian.org|mirrors.cloud.tencent.com|g' /etc/apt/sources.list.d/debian.sources

# System deps for pymysql / chromadb
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -i https://mirrors.cloud.tencent.com/pypi/simple/ -r requirements.txt

# Copy project files
COPY server.py .
COPY agent/ agent/
COPY config/ config/
COPY data/ data/
COPY model/ model/
COPY prompts/ prompts/
COPY rag/ rag/
COPY sql/ sql/
COPY utils/ utils/

# Pre-create directories
RUN mkdir -p logs data/history

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
