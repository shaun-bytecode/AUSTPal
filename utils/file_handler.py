import os
import hashlib
from typing import Optional, List, Tuple
from utils.logger_handler import logger
from langchain_core.documents import Document
from langchain_community.document_loaders import CSVLoader, PyPDFLoader, TextLoader


_LOADER_MAP = {
    ".md":  lambda p: TextLoader(p, encoding="utf-8").load(),
    ".pdf": lambda p: PyPDFLoader(p).load(),
    ".txt": lambda p: TextLoader(p, encoding="utf-8").load(),
    ".csv": lambda p: CSVLoader(p, encoding="utf-8").load(),
}


# ── MD5 ──────────────────────────────────────────────────────────────────────
def get_file_md5_hex(file_path: str) -> Optional[str]:
    """返回文件的 MD5 十六进制字符串，失败时返回 None。"""
    if not os.path.exists(file_path):
        logger.debug(f"[md5计算] 文件不存在: {file_path}")
        return None
    if not os.path.isfile(file_path):
        logger.debug(f"[md5计算] 不是文件: {file_path}")
        return None

    md5_obj = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5_obj.update(chunk)
        return md5_obj.hexdigest()
    except Exception as e:
        logger.error(f"[md5计算] 读取失败 {file_path}: {e}")
        return None


# ── 文件列举 ──────────────────────────────────────────────────────────────────
def list_files(path: str, allowed_types: Tuple[str, ...]) -> List[str]:
    """递归返回 path 下所有后缀在 allowed_types 中的文件绝对路径。"""
    if not os.path.exists(path):
        logger.error(f"[文件列表] 目录不存在: {path}")
        return []

    result = []
    for root, _, files in os.walk(path):
        for file in files:
            if file.endswith(allowed_types):
                result.append(os.path.join(root, file))
    return result


_EXT_FUNCS = {
    "md":  (".md",),
    "pdf": (".pdf",),
    "txt": (".txt",),
    "csv": (".csv",),
}

def list_md_files(path: str)  -> List[str]: return list_files(path, _EXT_FUNCS["md"])
def list_pdf_files(path: str) -> List[str]: return list_files(path, _EXT_FUNCS["pdf"])
def list_txt_files(path: str) -> List[str]: return list_files(path, _EXT_FUNCS["txt"])
def list_csv_files(path: str) -> List[str]: return list_files(path, _EXT_FUNCS["csv"])


# ── 文件加载器 ────────────────────────────────────────────────────────────────
def load_document(file_path: str) -> List[Document]:
    """根据文件扩展名自动选择加载器，不支持的类型返回空列表，加载失败则抛出异常。"""
    ext = os.path.splitext(file_path)[1].lower()
    loader = _LOADER_MAP.get(ext)
    if not loader:
        logger.warning(f"[文件加载] 不支持的文件类型: {ext} ({file_path})")
        return []
    return loader(file_path)
