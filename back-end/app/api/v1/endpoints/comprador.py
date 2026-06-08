"""Endpoints do comprador — pedidos e perfil."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Utilizador, Pedido, PedidoServico
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/comprador", tags=["Comprador"])


@router.get("/meu-perfil")
def meu_perfil(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    """Obter perfil completo do comprador com endereço."""
    user = db.query(Utilizador).options(
        joinedload(Utilizador.endereco)
    ).filter(Utilizador.id == utilizador.id).first()

    endereco = None
    if user.endereco:
        endereco = {
            "provincia": user.endereco.provincia,
            "municipio": user.endereco.municipio,
            "bairro": user.endereco.bairro,
            "endereco_completo": user.endereco.endereco_completo,
            "nif": user.endereco.nif,
        }

    return {
        "id": user.id,
        "nome_completo": user.nome_completo,
        "nome_utilizador": user.nome_utilizador,
        "email": user.email,
        "numero_telefone": user.numero_telefone,
        "foto_perfil_url": user.foto_perfil_url,
        "tipo_utilizador": user.tipo_utilizador.value if user.tipo_utilizador else "comprador",
        "email_verificado": user.email_verificado,
        "criado_em": user.criado_em.isoformat() if user.criado_em else None,
        "endereco": endereco,
    }


@router.get("/meus-pedidos")
def meus_pedidos(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    """Listar pedidos de produtos do comprador autenticado."""
    query = db.query(Pedido).filter(
        Pedido.comprador_id == utilizador.id
    )

    if status:
        query = query.filter(Pedido.status == status)

    pedidos = query.order_by(Pedido.criado_em.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": p.id,
            "numero_pedido": p.numero_pedido,
            "status": p.status.value if p.status else "pendente",
            "status_pagamento": p.status_pagamento.value if p.status_pagamento else "pendente",
            "valor_subtotal": float(p.valor_subtotal) if p.valor_subtotal else 0,
            "valor_entrega": float(p.valor_entrega) if p.valor_entrega else 0,
            "valor_total": float(p.valor_total) if p.valor_total else 0,
            "endereco_entrega_provincia": p.endereco_entrega_provincia,
            "notas": p.notas,
            "criado_em": p.criado_em.isoformat() if p.criado_em else None,
            "itens_count": len(p.itens) if p.itens else 0,
        }
        for p in pedidos
    ]


@router.get("/meus-pedidos/servicos")
def meus_pedidos_servicos(
    skip: int = 0,
    limit: int = 20,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    """Listar pedidos de serviços do comprador."""
    pedidos = db.query(PedidoServico).filter(
        PedidoServico.comprador_id == utilizador.id
    ).order_by(PedidoServico.criado_em.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": ps.id,
            "numero_pedido": ps.numero_pedido,
            "status": ps.status.value if ps.status else "pendente",
            "status_pagamento": ps.status_pagamento.value if ps.status_pagamento else "pendente",
            "valor_total": float(ps.valor_total) if ps.valor_total else 0,
            "criado_em": ps.criado_em.isoformat() if ps.criado_em else None,
        }
        for ps in pedidos
    ]
