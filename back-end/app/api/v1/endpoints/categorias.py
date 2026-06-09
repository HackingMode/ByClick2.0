from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Categoria, CategoriaStatusEnum

router = APIRouter(prefix="/categorias", tags=["Categorias"])


class CategoriaResponseSchema(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    icone_url: Optional[str] = None
    tipo: str
    categoria_pai_id: Optional[int] = None
    ordem: int

    class Config:
        from_attributes = True


class CategoriaCreateSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None
    icone_url: Optional[str] = None
    tipo: str = "produto"  # "produto" ou "servico"
    categoria_pai_id: Optional[int] = None
    ordem: int = 0


@router.get("/", response_model=List[CategoriaResponseSchema])
def listar_categorias(
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Lista todas as categorias ativas.
    Filtro opcional por tipo: 'produto' ou 'servico'.
    """
    query = db.query(Categoria).filter(Categoria.status == CategoriaStatusEnum.ativo)
    if tipo:
        query = query.filter(Categoria.tipo == tipo)
    return query.order_by(Categoria.ordem, Categoria.nome).all()


@router.get("/{categoria_id}", response_model=CategoriaResponseSchema)
def ver_categoria(categoria_id: int, db: Session = Depends(get_db)):
    """Retorna detalhes de uma categoria."""
    cat = db.query(Categoria).filter(
        Categoria.id == categoria_id,
        Categoria.status == CategoriaStatusEnum.ativo
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return cat


@router.post("/", response_model=CategoriaResponseSchema, status_code=201)
def criar_categoria(
    dados: CategoriaCreateSchema,
    db: Session = Depends(get_db),
):
    """Cria uma nova categoria (admin only — proteger depois)."""
    cat = Categoria(**dados.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat
