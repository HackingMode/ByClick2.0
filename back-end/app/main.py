"""
Byclick - Backend API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import auth, vendedor, empresa, produtos, comprador, servicos, explorar, pedidos, categorias, avaliacoes

app = FastAPI(
    title="Byclick API",
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


@app.get("/", tags=["Root"])
def root():
    return {"mensagem": "Byclick API está online 🇦🇴", "versao": "1.0.0"}


@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "ok"}
