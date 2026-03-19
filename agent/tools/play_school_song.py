import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from langchain_core.tools import tool

from utils.config_handler import agent_conf

MUSIC_PATH = agent_conf["MUSIC_PATH"]
LYRICS_PATH = agent_conf["LYRICS_PATH"]


def _check_files():
    """检查音频和歌词图片是否存在，缺失时返回错误信息。"""
    missing = [p for p in (MUSIC_PATH, LYRICS_PATH) if not os.path.exists(p)]
    if missing:
        return "文件缺失：" + "、".join(missing)
    return None


@tool(description="返回安徽理工大学校歌的音频路径和歌词图片路径，供前端在聊天框中播放和展示")
def play_school_song() -> str:
    """
    返回校歌音频文件路径和歌词图片路径，由前端负责播放和展示，不调用系统程序。
    """
    err = _check_files()
    if err:
        return err

    return f"AUDIO:{MUSIC_PATH}\nIMG:{LYRICS_PATH}"

if __name__ == "__main__":
    print(play_school_song())

