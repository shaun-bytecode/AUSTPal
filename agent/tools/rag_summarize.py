import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from langchain_core.tools import tool
from rag.rag_service import RagSummarizeService

rag = RagSummarizeService()

@tool(description="从安徽理工大学知识库中检索相关参考资料，返回原文段落供主模型作答")
def rag_summarize(query: str) -> str:
    return rag.rag_summarize(query)