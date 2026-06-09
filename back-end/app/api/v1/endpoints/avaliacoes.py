from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, Optional
from pydantic import BaseModel

from app.api.v1.endpoints.deps import get_utilizador_atual
from app.core.database import get_db
from app.models.models import Avaliacao, Utilizador, PerfilVendedor, Pedido, PedidoServico

router = APIRouter(prefix="/avaliacoes", tags=["Avaliacoes"])


class AvaliacaoCreateSchema(BaseModel):
    vendedor_id: int
    produto_id: Optional[int] = None
    servico_id: Optional[int] = None
    nota: int  # 1-5
    comentario: Optional[str] = None


class AvaliacaoResponseSchema(BaseModel):
    id: int
    avaliador_id: int
    vendedor_id: int
    produto_id: Optional[int] = None
    servico_id: Optional[int] = None
    nota: int
    comentario: Optional[str] = None
    avaliador_nome: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/", status_code=status.HTTP_201_CREATED)
def criar_avaliacao(
    dados: AvaliacaoCreateSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_utilizador_atual),
) -> Any:
    """
    Cria uma avaliação para um vendedor.
    O utilizador deve ter comprado algo do vendedor para avaliar.
    """
    if dados.nota < 1 or dados.nota > 5:
        raise HTTPException(status_code=400, detail="A nota deve ser entre 1 e 5.")

    # Verificar que o vendedor existe
    vendedor = db.query(PerfilVendedor).filter(PerfilVendedor.id == dados.vendedor_id).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor não encontrado.")

    # Verificar que não está a avaliar a si próprio
    if vendedor.utilizador_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não pode avaliar a si próprio.")

    # Verificar duplicidade
    existing = db.query(Avaliacao).filter(
        Avaliacao.avaliador_id == current_user.id,
        Avaliacao.vendedor_id == dados.vendedor_id,
        Avaliacao.produto_id == dados.produto_id,
        Avaliacao.servico_id == dados.servico_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já avaliou este item.")

    avaliacao = Avaliacao(
        avaliador_id=current_user.id,
        vendedor_id=dados.vendedor_id,
        produto_id=dados.produto_id,
        servico_id=dados.servico_id,
        nota=dados.nota,
        comentario=dados.comentario,
    )
    db.add(avaliacao)

    # Atualizar média do vendedor
    all_reviews = db.query(Avaliacao).filter(Avaliacao.vendedor_id == dados.vendedor_id).all()
    total = sum(r.nota for r in all_reviews) + dados.nota
    count = len(all_reviews) + 1
    vendedor.avaliacao_media = round(total / count, 2)

    db.commit()
    db.refresh(avaliacao)

    return {"mensagem": "Avaliação criada com sucesso", "id": avaliacao.id}


@router.get("/")
def listar_avaliacoes(
    vendedor_id: Optional[int] = None,
    produto_id: Optional[int] = None,
    servico_id: Optional[int] = None,
    limit: int = 20,
    skip: int = 0,
    db: Session = Depends(get_db),
) -> Any:
    """
    Lista avaliações com filtros opcionais.
    """
    query = db.query(Avaliacao)
    if vendedor_id:
        query = query.filter(Avaliacao.vendedor_id == vendedor_id)
    if produto_id:
        query = query.filter(Avaliacao.produto_id == produto_id)
    if servico_id:
        query = query.filter(Avaliacao.servico_id == servico_id)

    avaliacoes = query.order_by(Avaliacao.criado_em.desc()).offset(skip).limit(limit).all()

    result = []
    for a in avaliacoes:
        result.append({
            "id": a.id,
            "avaliador_id": a.avaliador_id,
            "avaliador_nome": a.avaliador.nome_completo if a.avaliador else "Anónimo",
            "vendedor_id": a.vendedor_id,
            "produto_id": a.produto_id,
            "servico_id": a.servico_id,
            "nota": a.nota,
            "comentario": a.comentario,
            "criado_em": a.criado_em.isoformat() if a.criado_em else None,
        })

    return result
