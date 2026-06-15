"""
Endpoints para Notificações do Utilizador.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Utilizador, Notificacao
from app.schemas.schemas import NotificacaoResponseSchema
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/notificacoes", tags=["Notificacoes"])

@router.get("/", response_model=List[NotificacaoResponseSchema])
def listar_notificacoes(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Retorna todas as notificações do utilizador ordenadas da mais recente para a mais antiga."""
    notificacoes = db.query(Notificacao).filter(
        Notificacao.utilizador_id == utilizador.id
    ).order_by(Notificacao.criado_em.desc()).all()
    
    return notificacoes

@router.put("/{notificacao_id}/ler", response_model=NotificacaoResponseSchema)
def marcar_como_lida(
    notificacao_id: int,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Marca uma notificação específica como lida."""
    notificacao = db.query(Notificacao).filter(
        Notificacao.id == notificacao_id,
        Notificacao.utilizador_id == utilizador.id
    ).first()
    
    if not notificacao:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
        
    notificacao.lida = True
    db.commit()
    db.refresh(notificacao)
    
    return notificacao
