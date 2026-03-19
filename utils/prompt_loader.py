from functools import lru_cache

from utils.config_handler import prompts_conf
from utils.path_tool import get_abs_path
from utils.logger_handler import logger


@lru_cache(maxsize=16)
def _load_prompt(config_key: str) -> str:
    try:
        prompt_path = get_abs_path(prompts_conf[config_key])
    except KeyError as e:
        logger.error(f"[load_prompt] yaml配置项中未找到 {config_key}")
        raise e
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"[load_prompt] 解析 {config_key} 提示词失败")
        raise e


def load_system_prompts() -> str:
    return _load_prompt("main_prompt_path")


def load_rag_prompts() -> str:
    return _load_prompt("rag_prompt_path")


def load_weather_prompts() -> str:
    return _load_prompt("weather_prompt_path")


def load_photo_prompts() -> str:
    return _load_prompt("photo_prompt_path")


def load_photo_response_prompts() -> str:
    return _load_prompt("photo_response_prompt_path")


def load_school_song_prompts() -> str:
    return _load_prompt("school_song_prompt_path")


def reload_prompts() -> None:
    """清除提示词缓存，下次调用时重新从文件读取。修改提示词文件后调用此函数。"""
    _load_prompt.cache_clear()
    logger.info("[prompt_loader] 提示词缓存已清除")


if __name__ == "__main__":
    print(load_system_prompts())
    print(load_rag_prompts())
