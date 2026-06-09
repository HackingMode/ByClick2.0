"""
Endpoints do Módulo Empresa - Dados e estatísticas de empresas
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models.models import (
    Utilizador, PerfilVendedor, TipoUtilizadorEnum,
    Produto, Pedido, ItemPedido, Servico, PedidoServico
)
from app.schemas.schemas import PerfilVendedorResponseSchema
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/empresa", tags=["Empresa"])


@router.get("/minha-empresa", response_model=PerfilVendedorResponseSchema)
def get_my_company(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Retorna dados da empresa do utilizador autenticado"""
    if utilizador.tipo_utilizador != TipoUtilizadorEnum.empresa:
        raise HTTPException(status_code=403, detail="Não é uma empresa")

    perfil = utilizador.perfil_vendedor
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil de empresa não encontrado")

    return perfil


@router.get("/minhas-estatisticas/dashboard")
def get_company_stats(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Retorna estatísticas da empresa para o dashboard"""
    if utilizador.tipo_utilizador != TipoUtilizadorEnum.empresa:
        raise HTTPException(status_code=403, detail="Não é uma empresa")

    perfil = utilizador.perfil_vendedor
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil de empresa não encontrado")

    # Contar produtos ativos
    produtos_count = db.query(func.count(Produto.id)).filter(
        Produto.vendedor_id == perfil.id,
        Produto.ativo == True
    ).scalar() or 0

    # Contar serviços ativos
    servicos_count = db.query(func.count(Servico.id)).filter(
        Servico.vendedor_id == perfil.id,
        Servico.ativo == True
    ).scalar() or 0

    # Contar pedidos deste mês (produtos)
    hoje = datetime.now()
    primeiro_dia = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    pedidos_mes = db.query(func.count(Pedido.id.distinct())).join(ItemPedido).filter(
        ItemPedido.vendedor_id == perfil.id,
        Pedido.criado_em >= primeiro_dia
    ).scalar() or 0

    # Contar pedidos de serviço deste mês
    pedidos_servico_mes = db.query(func.count(PedidoServico.id)).join(Servico).filter(
        Servico.vendedor_id == perfil.id,
        PedidoServico.criado_em >= primeiro_dia
    ).scalar() or 0

    # Calcular receita do mês (produtos + serviços)
    receita_produtos = db.query(func.sum(ItemPedido.subtotal)).filter(
        ItemPedido.vendedor_id == perfil.id,
        Pedido.criado_em >= primeiro_dia
    ).scalar() or 0

    receita_servicos = db.query(func.sum(PedidoServico.valor_total)).join(Servico).filter(
        Servico.vendedor_id == perfil.id,
        PedidoServico.criado_em >= primeiro_dia
    ).scalar() or 0

    receita_mes = float(receita_produtos) + float(receita_servicos)

    return {
        "produtos_count": int(produtos_count),
        "servicos_count": int(servicos_count),
        "pedidos_mes": int(pedidos_mes) + int(pedidos_servico_mes),
        "receita_mes": float(receita_mes),
        "avaliacao_media": float(perfil.avaliacao_media) if perfil.avaliacao_media else 0.0,
        "total_vendas": perfil.total_vendas or 0
    }


@router.get("/meus-pedidos/recentes")
def get_company_orders(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
    limit: int = 10,
    status: Optional[str] = None
):
    """Retorna pedidos recentes da empresa"""
    if utilizador.tipo_utilizador != TipoUtilizadorEnum.empresa:
        raise HTTPException(status_code=403, detail="Não é uma empresa")

    perfil = utilizador.perfil_vendedor
    if not perfil:
        raise HTTPException(status_code=404, detail="Perfil de empresa não encontrado")

    # Buscar pedidos de produtos desta empresa
    query_prod = db.query(Pedido).join(ItemPedido).filter(
        ItemPedido.vendedor_id == perfil.id
    ).distinct()

    if status:
        query_prod = query_prod.filter(Pedido.status == status)

    pedidos_produtos = query_prod.order_by(Pedido.criado_em.desc()).limit(limit).all()

    # Buscar pedidos de serviço desta empresa
    query_serv = db.query(PedidoServico).join(Servico).filter(
        Servico.vendedor_id == perfil.id
    ).distinct()

    if status:
        query_serv = query_serv.filter(PedidoServico.status == status)

    pedidos_servicos = query_serv.order_by(PedidoServico.criado_em.desc()).limit(limit).all()

    # Unificar e formatar
    resultados = []
    for p in pedidos_produtos:
        resultados.append({
            "id": p.id,
            "tipo": "produto",
            "numero_pedido": p.numero_pedido,
            "cliente_nome": p.comprador.nome_completo if p.comprador else "Cliente",
            "valor_total": float(p.valor_total or 0),
            "status": p.status,
            "criado_em": p.criado_em.isoformat() if p.criado_em else None,
            "atualizado_em": p.atualizado_em.isoformat() if p.atualizado_em else None
        })

    for s in pedidos_servicos:
        resultados.append({
            "id": s.id,
            "tipo": "servico",
            "numero_pedido": s.numero_pedido,
            "cliente_nome": s.comprador.nome_completo if s.comprador else "Cliente",
            "valor_total": float(s.valor_total or 0),
            "status": s.status,
            "criado_em": s.criado_em.isoformat() if s.criado_em else None,
            "atualizado_em": s.atualizado_em.isoformat() if s.atualizado_em else None
        })

    # Ordenar por data mais recente
    resultados.sort(key=lambda x: x["criado_em"], reverse=True)
    return resultados[:limit]
