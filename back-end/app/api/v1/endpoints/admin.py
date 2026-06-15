"""
Endpoints do Módulo Admin
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Utilizador, TipoUtilizadorEnum
from app.api.v1.endpoints.deps import get_utilizador_atual
from app.schemas.schemas import UtilizadorUpdateSchema
from app.api.v1.endpoints.auth import salvar_foto_perfil

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.put("/meu-perfil")
def atualizar_meu_perfil_utilizador(
    dados: UtilizadorUpdateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Atualiza dados pessoais do admin"""
    if utilizador.tipo_utilizador != TipoUtilizadorEnum.admin:
        raise HTTPException(status_code=403, detail="Não tem permissões de administrador")

    if dados.nome_completo:
        utilizador.nome_completo = dados.nome_completo
    if dados.numero_telefone:
        utilizador.numero_telefone = dados.numero_telefone
    if dados.foto_perfil:
        utilizador.foto_perfil_url = salvar_foto_perfil(dados.foto_perfil, "admin", utilizador.id)

    db.commit()
    db.refresh(utilizador)
    return {"mensagem": "Perfil atualizado com sucesso"}
