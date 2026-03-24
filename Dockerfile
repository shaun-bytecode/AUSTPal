# ── Backend: FastAPI + LangChain ──
FROM python:3.11-slim

WORKDIR /app

# System deps for pymysql / chromadb
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
