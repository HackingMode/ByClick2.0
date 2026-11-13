"""
Kitanda - Backend API
"""

import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.endpoints.deps import get_utilizador_atual
from app.models.models import Pedido, PedidoServico, Utilizador, TipoUtilizadorEnum
from pathlib import Path
from app.core.config import settings, BASE_DIR
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints import auth, vendedor, empresa, produtos, comprador, servicos, explorar, pedidos, categorias, avaliacoes, localidades, notificacoes, admin, imoveis

os.makedirs(BASE_DIR / "imagens", exist_ok=True)

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
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get('/imagens/pagamentos/{arquivo:path}', include_in_schema=False)
def comprovativo_privado(arquivo: str, db: Session = Depends(get_db), utilizador: Utilizador = Depends(get_utilizador_atual)):
    partes = arquivo.split('/')
    if len(partes) != 2 or not partes[1] or partes[1] in {'.', '..'}:
        raise HTTPException(404, 'Comprovativo não encontrado')
    identificador, nome = partes
    is_servico = identificador.startswith('serv_')
    numero = identificador[5:] if is_servico else identificador
    if not numero.isdigit():
        raise HTTPException(404, 'Comprovativo não encontrado')
    pedido = db.get(PedidoServico if is_servico else Pedido, int(numero))
    if not pedido or not pedido.pagamento or not pedido.pagamento.comprovativo_url:
        raise HTTPException(404, 'Comprovativo não encontrado')
    if pedido.pagamento.comprovativo_url.rsplit('/', 1)[-1] != nome:
        raise HTTPException(404, 'Comprovativo não encontrado')
    vendedores = [pedido.servico.vendedor] if is_servico else [item.vendedor for item in pedido.itens]
    autorizado = (utilizador.tipo_utilizador == TipoUtilizadorEnum.admin or pedido.comprador_id == utilizador.id or
                  any(v and v.utilizador_id == utilizador.id for v in vendedores))
    if not autorizado:
        raise HTTPException(403, 'Sem permissão para este comprovativo')
    caminho = (BASE_DIR / 'imagens' / 'pagamentos' / identificador / nome).resolve()
    raiz = (BASE_DIR / 'imagens' / 'pagamentos').resolve()
    if not caminho.is_relative_to(raiz) or not caminho.is_file():
        raise HTTPException(404, 'Comprovativo não encontrado')
    return FileResponse(caminho, headers={'Cache-Control': 'private, no-store'})

app.mount("/imagens", StaticFiles(directory=BASE_DIR / "imagens"), name="imagens")

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
