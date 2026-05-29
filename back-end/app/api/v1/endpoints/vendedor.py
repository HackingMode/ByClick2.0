"""
Endpoints do Módulo Vendedor - Criar loja, gerir perfil
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Utilizador, PerfilVendedor, TipoUtilizadorEnum
from app.schemas.schemas import RegistoVendedorSchema, PerfilVendedorResponseSchema
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/vendedor", tags=["Vendedor"])


@router.post("/registar-loja", response_model=PerfilVendedorResponseSchema, status_code=201)
def registar_loja(
    dados: RegistoVendedorSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    """Criar loja virtual para um utilizador existente."""

    if utilizador.perfil_vendedor:
        raise HTTPException(status_code=400, detail="Já tem uma loja criada")

    # Verificar nome único
    if db.query(PerfilVendedor).filter(PerfilVendedor.nome_loja == dados.nome_loja).first():
        raise HTTPException(status_code=400, detail="Este nome de loja já existe")

    perfil = PerfilVendedor(
        utilizador_id=utilizador.id,
        nome_loja=dados.nome_loja,
        descricao_loja=dados.descricao_loja,
        tipo_vendedor=dados.tipo_vendedor,
        tipo_loja=dados.tipo_loja,
    )
    db.add(perfil)

    # Atualizar tipo do utilizador
    utilizador.tipo_utilizador = TipoUtilizadorEnum.vendedor
    db.commit()
    db.refresh(perfil)

    return perfil


@router.get("/minha-loja", response_model=PerfilVendedorResponseSchema)
def ver_minha_loja(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")
    return utilizador.perfil_vendedor


@router.get("/{nome_loja}", response_model=PerfilVendedorResponseSchema)
def ver_loja_publica(nome_loja: str, db: Session = Depends(get_db)):
    loja = db.query(PerfilVendedor).filter(
        PerfilVendedor.nome_loja == nome_loja,
        PerfilVendedor.ativo == True
    ).first()
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return loja
