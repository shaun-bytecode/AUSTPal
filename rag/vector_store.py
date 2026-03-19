import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from langchain_chroma import Chroma
from utils.config_handler import chroma_conf
from model.factory import embed_model
from langchain_text_splitters import RecursiveCharacterTextSplitter
from utils.path_tool import get_abs_path
from utils.file_handler import load_document, list_md_files, list_pdf_files, list_txt_files, list_csv_files, get_file_md5_hex
from utils.logger_handler import logger


class VectorStoreService:
    def __init__(self):
        self.vector_store = Chroma(
            collection_name=chroma_conf["collection_name"],
            embedding_function=embed_model,
            persist_directory=get_abs_path(chroma_conf["persist_directory"]),
        )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chroma_conf["chunk_size"],
            chunk_overlap=chroma_conf["chunk_overlap"],
            separators=chroma_conf["separators"],
            length_function=len,
        )

    def get_retriever(self):
        return self.vector_store.as_retriever(search_kwargs={"k": chroma_conf["k"]})

    def load_documents(self):
        """从数据文件夹读取文件并加载到向量库，用 MD5 防止重复加载。"""
        md5_path = get_abs_path(chroma_conf["md5_hex_store"])
        os.makedirs(os.path.dirname(md5_path), exist_ok=True)

        if os.path.exists(md5_path):
            with open(md5_path, "r", encoding="utf-8") as f:
                seen_md5 = {line.strip() for line in f if line.strip()}
        else:
            seen_md5 = set()

        files = (
            list_md_files(chroma_conf["MD_DIR"])
            + list_pdf_files(chroma_conf["PDF_DIR"])
            + list_txt_files(chroma_conf["TXT_DIR"])
            + list_csv_files(chroma_conf["CSV_DIR"])
        )

        new_md5s: list[str] = []
        for file_path in files:
            md5_hex = get_file_md5_hex(file_path)
            if md5_hex is None:
                continue
            if md5_hex in seen_md5:
                logger.info(f"[加载知识库] 已存在，跳过: {file_path}")
                continue

            try:
                documents = load_document(file_path)
                if not documents:
                    logger.info(f"[加载知识库] 无有效内容，跳过: {file_path}")
                    continue
                split_documents = self.splitter.split_documents(documents)
                if not split_documents:
                    logger.info(f"[加载知识库] 分片后无内容，跳过: {file_path}")
                    continue

                self.vector_store.add_documents(split_documents)
                # 文档写入成功后才记录 MD5，防止崩溃导致重复加载
                seen_md5.add(md5_hex)
                new_md5s.append(md5_hex)
                logger.info(f"[加载知识库] 已加载: {file_path}")
            except Exception as e:
                logger.error(f"[加载知识库] 加载失败: {file_path} | {e}", exc_info=True)

        # 批量追加新 MD5，减少 IO 次数
        if new_md5s:
            with open(md5_path, "a", encoding="utf-8") as f:
                f.write("\n".join(new_md5s) + "\n")

        logger.info(f"[加载知识库] 完成，本次新增 {len(new_md5s)} 个文件")

    def get_stats(self) -> dict:
        """返回向量库当前统计信息。"""
        count = len(self.vector_store.get(include=[])["ids"])
        return {"collection": chroma_conf["collection_name"], "doc_count": count}

    def rebuild_store(self):
        """清空向量库和 MD5 记录，下次 load_documents 将重新全量加载。"""
        embed_fn = self.vector_store.embeddings
        self.vector_store.delete_collection()
        self.vector_store = Chroma(
            collection_name=chroma_conf["collection_name"],
            embedding_function=embed_fn,
            persist_directory=get_abs_path(chroma_conf["persist_directory"]),
        )
        md5_path = get_abs_path(chroma_conf["md5_hex_store"])
        if os.path.exists(md5_path):
            os.remove(md5_path)
        logger.info("[向量库] 已清空，MD5 记录已删除")

    def delete_docs_by_source(self, source_path: str) -> int:
        """删除来源文件路径匹配的所有向量文档，返回删除数量。"""
        results = self.vector_store.get(where={"source": source_path})
        ids = results.get("ids", [])
        if ids:
            self.vector_store.delete(ids=ids)
            logger.info(f"[向量库] 已删除 {len(ids)} 条文档，来源: {source_path}")
        return len(ids)


if __name__ == "__main__":
    vs = VectorStoreService()
    vs.load_documents()
    stats = vs.get_stats()
    print(f"向量库文档总数: {stats['doc_count']}")
    retriever = vs.get_retriever()
    res = retriever.invoke("有哪些学院")
    print(f"检索结果数量: {len(res)}")
    for r in res:
        print(r.page_content)
        print('#' * 30)
