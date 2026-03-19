import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag.vector_store import VectorStoreService
from langchain_core.documents import Document
from typing import List


_NO_CONTEXT_REPLY = "抱歉，知识库中暂未找到与该问题相关的资料，请尝试换个问法或联系学校相关部门。"


class RagSummarizeService:
    def __init__(self):
        self.vector_store = VectorStoreService()
        self.retriever = self.vector_store.get_retriever()

    def retriever_docs(self, query: str) -> List[Document]:
        return self.retriever.invoke(query)

    def rag_summarize(self, query: str) -> str:
        """检索相关文档，返回格式化的参考资料，由主模型负责最终总结。"""
        context_docs = self.retriever_docs(query)
        if not context_docs:
            return _NO_CONTEXT_REPLY

        return "".join(
            f"【参考资料{i}】{doc.page_content} | 来源:{doc.metadata.get('source', '未知')}\n"
            for i, doc in enumerate(context_docs, 1)
        )


if __name__ == "__main__":
    rag = RagSummarizeService()
    print(rag.rag_summarize("有哪些学院"))
