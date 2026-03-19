import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import html as _html
import re
from urllib.parse import quote

import requests
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool

from model.factory import chat_model
from utils.prompt_loader import load_photo_prompts


def _extract_keywords(user_query: str) -> str:
    messages = [
        SystemMessage(content=load_photo_prompts()),
        HumanMessage(content=user_query),
    ]
    result = chat_model.invoke(messages).content.strip()
    # 过滤掉常见的模型思考标签（qwen3 / deepseek 等）
    result = re.sub(r"<(think|thinking|reasoning)>.*?</\1>", "", result, flags=re.DOTALL).strip()
    return result


_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9",
}


_ENGINES = {
    "baidu": {
        "url":     lambda kw: f"https://image.baidu.com/search/index?tn=baiduimage&word={quote(kw)}&ie=utf-8",
        "headers": lambda: {**_HEADERS, "Referer": "https://image.baidu.com/"},
        "pattern": r'"thumbURL"\s*:\s*"(https?://[^"]+)"',
        "unescape": False,
    },
    "bing": {
        "url":     lambda kw: f"https://cn.bing.com/images/search?q={quote(kw)}&form=HDRSC2&first=1",
        "headers": lambda: _HEADERS,
        "pattern": r'"murl":"(https?://[^"]+)"',
        "unescape": True,
    },
}


def _image_search(engine: str, keywords: str, max_results: int = 5) -> list[str]:
    """通用图片搜索，engine 可为 'baidu' 或 'bing'。"""
    cfg = _ENGINES[engine]
    resp = requests.get(cfg["url"](keywords), headers=cfg["headers"](), timeout=15)
    resp.raise_for_status()
    text = _html.unescape(resp.text) if cfg["unescape"] else resp.text
    return re.findall(cfg["pattern"], text)[:max_results]


@tool(description="根据用户描述智能搜索安徽理工大学相关图片，返回图片链接列表以供展示")
def show_photos(query: str) -> str:
    """
    理解用户意图，提取关键词后在网络上搜索安徽理工大学相关图片。

    参数:
        query: 用户对图片内容的描述，例如"校园风景"、"图书馆"、"校徽"等
    """
    keywords = _extract_keywords(query)

    baidu_err = bing_err = None
    urls: list[str] = []

    try:
        urls = _image_search("baidu", keywords)
    except Exception as e:
        baidu_err = e

    if not urls:
        try:
            urls = _image_search("bing", keywords)
        except Exception as e:
            bing_err = e

    if not urls:
        if baidu_err or bing_err:
            return f"图片搜索失败（百度：{baidu_err}；Bing：{bing_err}），请稍后重试。"
        return f"未找到与「{keywords}」相关的图片，请尝试更换描述。"

    lines = [f"KEYWORDS:{keywords}", f"COUNT:{len(urls)}"]
    lines.extend(f"IMG:{u}" for u in urls)
    return "\n".join(lines)

if __name__ == "__main__":
    _kw = "安徽理工大学校史沿革"
    _urls = _image_search("bing", _kw, max_results=5)
    for _u in _urls:
        print(_u)