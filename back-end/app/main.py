"""
Kitanda - Backend API
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints import auth, vendedor, empresa, produtos, comprador, servicos, explorar, pedidos, categorias, avaliacoes, localidades, notificacoes, admin, imoveis

os.makedirs("imagens", exist_ok=True)

app = FastAPI(
    title="Kitanda API",
    description="API para compra e venda de produtos e serviços em Angola",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - permitir o frontend ligar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # em produção: colocar o domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/imagens", StaticFiles(directory="imagens"), name="imagens")

# Registar routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(vendedor.router, prefix="/api/v1")
app.include_router(empresa.router, prefix="/api/v1")
app.include_router(produtos.router, prefix="/api/v1")
app.include_router(servicos.router, prefix="/api/v1")
app.include_router(comprador.router, prefix="/api/v1")
app.include_router(explorar.router, prefix="/api/v1")
app.include_router(pedidos.router, prefix="/api/v1/pedidos", tags=["Pedidos"])
app.include_router(categorias.router, prefix="/api/v1")
app.include_router(avaliacoes.router, prefix="/api/v1")
app.include_router(localidades.router, prefix="/api/v1/localidades", tags=["Localidades"])
app.include_router(notificacoes.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(imoveis.router, prefix="/api/v1/imoveis", tags=["Imóveis"])

@app.get("/", tags=["Root"])
def root():
    return {"mensagem": "Kitanda API está online 🇦🇴", "versao": "1.0.0"}


@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "ok"}


@app.get("/seed-db", tags=["Root"])
def seed_database():
    try:
        from seed_render import main as run_seed
        run_seed()
        return {"mensagem": "Base de dados populada e senhas redefinidas com sucesso! Já podes iniciar sessão com a password123"}
    except Exception as e:
        return {"erro": str(e), "mensagem": "Falha ao gerar os dados."}
