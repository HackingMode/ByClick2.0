"""
Endpoints do Módulo Vendedor - Criar loja, gerir perfil
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional, List

from app.core.database import get_db
from app.models.models import (
    Utilizador, PerfilVendedor, TipoUtilizadorEnum,
    Produto, Pedido, ItemPedido, Servico, PedidoServico,
    PedidoPromocao, Notificacao, StatusPedidoPromocaoEnum, TipoNotificacaoEnum, Categoria
)
from app.schemas.schemas import (
    RegistoVendedorSchema, PerfilVendedorResponseSchema, PerfilVendedorUpdateSchema,
    PedidoPromocaoCreateSchema, PedidoPromocaoResponseSchema, ProdutoResponseSchema, ServicoResponseSchema
)
from app.api.v1.endpoints.deps import get_utilizador_atual
from app.schemas.schemas import UtilizadorUpdateSchema
from app.api.v1.endpoints.auth import salvar_foto_perfil

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


@router.get("/meus-produtos", response_model=List[ProdutoResponseSchema])
def get_meus_produtos(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Retorna a lista de produtos criados pelo vendedor logado."""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")
    produtos = db.query(Produto).filter(
        Produto.vendedor_id == utilizador.perfil_vendedor.id,
        Produto.ativo == True
    ).order_by(Produto.criado_em.desc()).all()
    return produtos


@router.get("/meus-servicos", response_model=List[ServicoResponseSchema])
def get_meus_servicos(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Retorna a lista de serviços criados pelo vendedor logado."""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")
    servicos = db.query(Servico).filter(
        Servico.vendedor_id == utilizador.perfil_vendedor.id,
        Servico.ativo == True
    ).order_by(Servico.criado_em.desc()).all()
    return servicos


@router.get("/minhas-estatisticas/dashboard")
def get_my_stats(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Retorna estatísticas do vendedor para o dashboard"""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")

    perfil = utilizador.perfil_vendedor

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

    from datetime import timedelta
    data_limite_9_dias = hoje - timedelta(days=8)
    data_limite_9_dias = data_limite_9_dias.replace(hour=0, minute=0, second=0, microsecond=0)

    vendas_diarias = [0.0] * 9
    pedidos_diarios = [0] * 7

    pedidos_prod_recentes = db.query(Pedido).join(ItemPedido).filter(
        ItemPedido.vendedor_id == perfil.id,
        Pedido.criado_em >= data_limite_9_dias
    ).all()

    pedidos_serv_recentes = db.query(PedidoServico).join(Servico).filter(
        Servico.vendedor_id == perfil.id,
        PedidoServico.criado_em >= data_limite_9_dias
    ).all()

    for p in pedidos_prod_recentes:
        if p.criado_em:
            dias_atras = (hoje.date() - p.criado_em.date()).days
            if 0 <= dias_atras <= 8:
                idx = 8 - dias_atras
                valor = sum(item.subtotal for item in p.itens if item.vendedor_id == perfil.id)
                vendas_diarias[idx] += float(valor)
            if 0 <= dias_atras <= 6:
                idx = 6 - dias_atras
                pedidos_diarios[idx] += 1

    for s in pedidos_serv_recentes:
        if s.criado_em:
            dias_atras = (hoje.date() - s.criado_em.date()).days
            if 0 <= dias_atras <= 8:
                idx = 8 - dias_atras
                vendas_diarias[idx] += float(s.valor_total)
            if 0 <= dias_atras <= 6:
                idx = 6 - dias_atras
                pedidos_diarios[idx] += 1

    cat_produtos = db.query(Categoria.nome, func.count(Produto.id)).join(Produto).filter(
        Produto.vendedor_id == perfil.id, Produto.ativo == True
    ).group_by(Categoria.nome).all()

    cat_servicos = db.query(Categoria.nome, func.count(Servico.id)).join(Servico).filter(
        Servico.vendedor_id == perfil.id, Servico.ativo == True
    ).group_by(Categoria.nome).all()

    categorias_dict = {}
    for nome, count in cat_produtos:
        categorias_dict[nome] = categorias_dict.get(nome, 0) + count
    for nome, count in cat_servicos:
        categorias_dict[nome] = categorias_dict.get(nome, 0) + count

    cat_labels = list(categorias_dict.keys())
    cat_data = list(categorias_dict.values())
    if not cat_labels:
        cat_labels = ["Sem categorias"]
        cat_data = [1]

    return {
        "produtos_count": int(produtos_count),
        "servicos_count": int(servicos_count),
        "pedidos_mes": int(pedidos_mes) + int(pedidos_servico_mes),
        "receita_mes": float(receita_mes),
        "avaliacao_media": float(perfil.avaliacao_media) if perfil.avaliacao_media else 0.0,
        "total_vendas": perfil.total_vendas or 0,
        "grafico_vendas": vendas_diarias,
        "grafico_pedidos": pedidos_diarios,
        "grafico_categorias": {
            "labels": cat_labels,
            "data": cat_data
        }
    }


@router.get("/meus-pedidos/recentes")
def get_my_orders(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
    limit: int = 10,
    status: Optional[str] = None
):
    """Retorna pedidos recentes do vendedor"""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")

    perfil = utilizador.perfil_vendedor

    # Buscar pedidos de produtos deste vendedor
    query_prod = db.query(Pedido).join(ItemPedido).filter(
        ItemPedido.vendedor_id == perfil.id
    ).distinct()

    if status:
        query_prod = query_prod.filter(Pedido.status == status)

    pedidos_produtos = query_prod.order_by(Pedido.criado_em.desc()).limit(limit).all()

    # Buscar pedidos de serviço deste vendedor
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
            "atualizado_em": p.atualizado_em.isoformat() if p.atualizado_em else None,
            "itens": [{
                "nome_produto": item.produto.nome,
                "quantidade_comprada": item.quantidade,
                "stock_atual": item.produto.stock
            } for item in p.itens if item.vendedor_id == perfil.id and item.produto]
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


@router.put("/meus-dados", response_model=PerfilVendedorResponseSchema)
def atualizar_meus_dados_loja(
    dados: PerfilVendedorUpdateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Atualiza dados do perfil de vendedor"""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")

    perfil = utilizador.perfil_vendedor

    if dados.nome_loja:
        perfil.nome_loja = dados.nome_loja
    if dados.descricao_loja is not None:
        perfil.descricao_loja = dados.descricao_loja
    if dados.iban is not None:
        perfil.iban = dados.iban

    db.commit()
    db.refresh(perfil)
    return perfil


@router.put("/meu-perfil")
def atualizar_meu_perfil_utilizador(
    dados: UtilizadorUpdateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Atualiza dados pessoais do vendedor (Utilizador)"""
    if dados.nome_completo:
        utilizador.nome_completo = dados.nome_completo
    if dados.numero_telefone:
        utilizador.numero_telefone = dados.numero_telefone
    if dados.foto_perfil:
        utilizador.foto_perfil_url = salvar_foto_perfil(dados.foto_perfil, "vendedor", utilizador.id)

    # Nota: endereço e outros detalhes podem ser geridos aqui futuramente
    db.commit()
    db.refresh(utilizador)
    return {"mensagem": "Perfil pessoal atualizado com sucesso"}



@router.post("/inscricao")
def pedir_inscricao(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Envia um pedido ao administrador para verificar a loja do vendedor."""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")
    
    if utilizador.perfil_vendedor.verificado:
        raise HTTPException(status_code=400, detail="Loja já verificada")

    # Criar uma notificação de sistema a confirmar a receção do pedido
    notificacao = Notificacao(
        utilizador_id=utilizador.id,
        titulo="Pedido de Inscrição Recebido",
        mensagem="Recebemos o seu pedido de verificação da loja. A nossa equipa analisará em breve.",
        tipo=TipoNotificacaoEnum.sistema
    )
    db.add(notificacao)
    db.commit()
    
    return {"success": True, "message": "Pedido de inscrição enviado com sucesso."}


@router.post("/promocao", response_model=PedidoPromocaoResponseSchema)
def solicitar_promocao(
    dados: PedidoPromocaoCreateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """O vendedor solicita promoção para a sua loja."""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=404, detail="Sem loja registada")
        
    perfil_id = utilizador.perfil_vendedor.id
    
    # Verificar se já existe um pedido pendente ou aprovado recentemente
    pedido_existente = db.query(PedidoPromocao).filter(
        PedidoPromocao.vendedor_id == perfil_id,
        PedidoPromocao.status.in_([StatusPedidoPromocaoEnum.pendente, StatusPedidoPromocaoEnum.aprovado])
    ).first()
    
    if pedido_existente:
        raise HTTPException(status_code=400, detail="Já possui um pedido de promoção pendente ou ativo.")

    novo_pedido = PedidoPromocao(
        vendedor_id=perfil_id,
        mensagem_solicitacao=dados.mensagem_solicitacao
    )
    db.add(novo_pedido)
    db.commit()
    db.refresh(novo_pedido)
    return novo_pedido


@router.get("/promocao/status")
def status_promocao(
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Verifica se o botão de promoções deve ser ocultado."""
    if not utilizador.perfil_vendedor:
        return {"pode_solicitar": False}

    pedido = db.query(PedidoPromocao).filter(
        PedidoPromocao.vendedor_id == utilizador.perfil_vendedor.id,
        PedidoPromocao.status.in_([StatusPedidoPromocaoEnum.pendente, StatusPedidoPromocaoEnum.aprovado])
    ).first()

    if pedido:
        return {
            "pode_solicitar": False, 
            "status": pedido.status.value, 
            "mensagem": "Promoção solicitada ou ativa."
        }
    return {"pode_solicitar": True, "status": "nenhum"}

@router.get("/{nome_loja}", response_model=PerfilVendedorResponseSchema)
def ver_loja_publica(nome_loja: str, db: Session = Depends(get_db)):
    loja = db.query(PerfilVendedor).filter(
        PerfilVendedor.nome_loja == nome_loja,
        PerfilVendedor.ativo == True
    ).first()
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return loja
