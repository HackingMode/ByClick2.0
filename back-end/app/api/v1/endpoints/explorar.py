from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Produto, Servico

router = APIRouter(prefix="/explorar", tags=["Explorar"])

class ExplorarItemSchema(BaseModel):
    id: int
    tipo: str  # "produto" ou "servico"
    nome: str
    descricao: Optional[str] = None
    preco: float
    avaliacao_media: float
    vendedor_id: int
    imagem_url: Optional[str] = None
    
    # Específico de Serviço
    duracao_estimada: Optional[str] = None

@router.get("/pesquisa", response_model=List[ExplorarItemSchema])
def pesquisar(
    q: Optional[str] = None,
    tipo: Optional[str] = None,  # "produto", "servico", ou vazio para ambos
    db: Session = Depends(get_db)
):
    resultados = []
    
    termo = f"%{q}%" if q else None

    # Pesquisa Produtos
    if not tipo or tipo == "produto":
        query_prod = db.query(Produto).filter(Produto.ativo == True)
        if termo:
            query_prod = query_prod.filter((Produto.nome.ilike(termo)) | (Produto.descricao.ilike(termo)))
            
        for p in query_prod.limit(50).all():
            img_url = p.imagens[0].url if p.imagens else None
            resultados.append(ExplorarItemSchema(
                id=p.id,
                tipo="produto",
                nome=p.nome,
                descricao=p.descricao,
                preco=float(p.preco),
                avaliacao_media=p.avaliacao_media,
                vendedor_id=p.vendedor_id,
                imagem_url=img_url
            ))

    # Pesquisa Serviços
    if not tipo or tipo == "servico":
        query_serv = db.query(Servico).filter(Servico.ativo == True)
        if termo:
            query_serv = query_serv.filter((Servico.nome.ilike(termo)) | (Servico.descricao.ilike(termo)))
            
        for s in query_serv.limit(50).all():
            img_url = s.imagens[0].url if s.imagens else None
            resultados.append(ExplorarItemSchema(
                id=s.id,
                tipo="servico",
                nome=s.nome,
                descricao=s.descricao,
                preco=float(s.preco_base),
                avaliacao_media=s.avaliacao_media,
                vendedor_id=s.vendedor_id,
                imagem_url=img_url,
                duracao_estimada=s.duracao_estimada
            ))

    # Ordenar por avaliação
    resultados.sort(key=lambda x: x.avaliacao_media, reverse=True)
    return resultados
