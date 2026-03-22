import yaml
from utils.path_tool import get_abs_path


def _load_yaml(path: str, encoding: str = "utf-8") -> dict:
    with open(path, "r", encoding=encoding) as f:
        return yaml.safe_load(f)


def load_config(path: str) -> dict:
    """加载任意 YAML 配置文件（相对于项目根目录的路径）。"""
    return _load_yaml(get_abs_path(path))


rag_conf     = _load_yaml(get_abs_path("config/rag.yml"))
chroma_conf  = _load_yaml(get_abs_path("config/chroma.yml"))
prompts_conf = _load_yaml(get_abs_path("config/prompts.yml"))
agent_conf   = _load_yaml(get_abs_path("config/agent.yml"))


if __name__ == "__main__":
    print(rag_conf["chat_model_name"])
