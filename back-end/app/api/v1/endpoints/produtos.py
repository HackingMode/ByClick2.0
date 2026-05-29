from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Produto, Utilizador
from app.schemas.schemas import ProdutoCreateSchema, ProdutoResponseSchema
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/produtos", tags=["Produtos"])


@router.post("/", response_model=ProdutoResponseSchema, status_code=201)
def criar_produto(
    dados: ProdutoCreateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Precisa de ter uma loja para adicionar produtos")

    produto = Produto(
        vendedor_id=utilizador.perfil_vendedor.id,
        **dados.model_dump()
    )
    db.add(produto)
    db.commit()
    db.refresh(produto)
    return produto


@router.get("/", response_model=List[ProdutoResponseSchema])
def listar_produtos(
    skip: int = 0,
    limit: int = 20,
    categoria_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Produto).filter(Produto.ativo == True)
    if categoria_id:
        query = query.filter(Produto.categoria_id == categoria_id)
    return query.offset(skip).limit(limit).all()


@router.get("/{produto_id}", response_model=ProdutoResponseSchema)
def ver_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id, Produto.ativo == True).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.delete("/{produto_id}", status_code=204)
def remover_produto(
    produto_id: int,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.vendedor_id == utilizador.perfil_vendedor.id
    ).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado ou sem permissão")
    produto.ativo = False
    db.commit()
