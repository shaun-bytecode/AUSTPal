from langchain_community.embeddings import DashScopeEmbeddings
from langchain_community.chat_models.tongyi import ChatTongyi
from utils.config_handler import rag_conf


chat_model  = ChatTongyi(model=rag_conf["chat_model_name"])
embed_model = DashScopeEmbeddings(model=rag_conf["embedding_model_name"])
