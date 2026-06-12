import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.v1.endpoints.deps import get_db, get_utilizador_atual as get_current_user
from app.models.models import (
    Utilizador, Pedido, ItemPedido, Produto,
    PedidoServico, Servico, StatusPedidoEnum, Pagamento, PagamentoServico
)
from app.schemas.schemas import (
    PedidoCreateSchema, PedidoServicoCreateSchema,
    PedidoStatusUpdateSchema, PedidoServicoStatusUpdateSchema
)
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

router = APIRouter()


# ─────────────────────────── MEUS PEDIDOS (COMPRADOR) ───────────────────────────
@router.get("/meus-pedidos")
def meus_pedidos(
    limit: int = 20,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
) -> Any:
    """
    Lista os pedidos do comprador autenticado (produtos e serviços).
    """
    pedidos_produto = db.query(Pedido).filter(
        Pedido.comprador_id == current_user.id
    ).order_by(Pedido.criado_em.desc()).offset(skip).limit(limit).all()

    pedidos_servico = db.query(PedidoServico).filter(
        PedidoServico.comprador_id == current_user.id
    ).order_by(PedidoServico.criado_em.desc()).offset(skip).limit(limit).all()

    resultado = []

    for p in pedidos_produto:
        itens = []
        for item in p.itens:
            itens.append({
                "produto_id": item.produto_id,
                "nome": item.produto.nome if item.produto else "—",
                "quantidade": item.quantidade,
                "preco_unitario": float(item.preco_unitario),
                "subtotal": float(item.subtotal),
            })
        resultado.append({
            "tipo": "produto",
            "id": p.id,
            "numero_pedido": p.numero_pedido,
            "status": p.status.value if p.status else "pendente",
            "status_pagamento": p.status_pagamento.value if p.status_pagamento else "pendente",
            "valor_total": float(p.valor_total),
            "moeda": p.moeda,
            "criado_em": p.criado_em.isoformat() if p.criado_em else None,
            "itens": itens,
        })

    for ps in pedidos_servico:
        resultado.append({
            "tipo": "servico",
            "id": ps.id,
            "numero_pedido": ps.numero_pedido,
            "status": ps.status.value if ps.status else "pendente",
            "status_pagamento": ps.status_pagamento.value if ps.status_pagamento else "pendente",
            "valor_total": float(ps.valor_acordado) if ps.valor_acordado else 0,
            "moeda": ps.moeda,
            "criado_em": ps.criado_em.isoformat() if ps.criado_em else None,
            "servico_nome": ps.servico.nome if ps.servico else "—",
        })

    # Ordenar por data
    resultado.sort(key=lambda x: x.get("criado_em", ""), reverse=True)
    return resultado

# ─────────────────────────── CRIAR PEDIDO (PRODUTO) ───────────────────────────
@router.post("/produtos", status_code=status.HTTP_201_CREATED)
def criar_pedido_produto(
    dados: PedidoCreateSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
) -> Any:
    """
    Cria um novo pedido para um ou mais produtos.
    """
    if not dados.itens:
        raise HTTPException(status_code=400, detail="O pedido deve ter pelo menos um item.")

    # Criar registro de pedido
    novo_pedido = Pedido(
        comprador_id=current_user.id,
        numero_pedido=f"P-{uuid.uuid4().hex[:8].upper()}",
        valor_total=0.0,
        endereco_entrega_provincia=dados.endereco_entrega_provincia,
        endereco_entrega_municipio=dados.endereco_entrega_municipio,
        endereco_entrega_bairro=dados.endereco_entrega_bairro,
        notas=dados.notas
    )
    db.add(novo_pedido)
    db.flush()

    valor_total = 0.0

    for item in dados.itens:
        produto = db.query(Produto).filter(Produto.id == item.produto_id).first()
        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto com ID {item.produto_id} não encontrado.")
        if produto.stock < item.quantidade:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para o produto {produto.nome}.")

        preco_usado = produto.preco_promocional if produto.preco_promocional else produto.preco
        subtotal = float(preco_usado) * item.quantidade
        valor_total += subtotal

        # Reduzir stock
        produto.stock -= item.quantidade

        # Criar item do pedido
        item_pedido = ItemPedido(
            pedido_id=novo_pedido.id,
            produto_id=produto.id,
            vendedor_id=produto.vendedor_id,
            quantidade=item.quantidade,
            preco_unitario=preco_usado,
            subtotal=subtotal
        )
        db.add(item_pedido)

    novo_pedido.valor_total = valor_total

    # Criar Pagamento associado
    pagamento = Pagamento(
        pedido_id=novo_pedido.id,
        metodo=dados.metodo_pagamento,
        valor=valor_total,
        moeda="AOA"
    )
    db.add(pagamento)

    db.commit()
    db.refresh(novo_pedido)

    # Obter os IBANs dos vendedores envolvidos
    vendedores_ibans = set()
    for item in novo_pedido.itens:
        if item.produto and item.produto.vendedor and item.produto.vendedor.iban:
            vendedores_ibans.add(f"{item.produto.vendedor.nome_loja}: {item.produto.vendedor.iban}")

    return {
        "mensagem": "Pedido criado com sucesso",
        "numero_pedido": novo_pedido.numero_pedido,
        "pedido_id": novo_pedido.id,
        "vendedores_ibans": list(vendedores_ibans)
    }


# ─────────────────────────── CRIAR PEDIDO (SERVIÇO) ───────────────────────────
@router.post("/servicos", status_code=status.HTTP_201_CREATED)
def criar_pedido_servico(
    dados: PedidoServicoCreateSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
) -> Any:
    """
    Contrata um novo serviço.
    """
    servico = db.query(Servico).filter(Servico.id == dados.servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

    novo_pedido_servico = PedidoServico(
        comprador_id=current_user.id,
        servico_id=servico.id,
        numero_pedido=f"S-{uuid.uuid4().hex[:8].upper()}",
        data_agendada=dados.data_agendada,
        descricao_necessidade=dados.descricao_necessidade,
        valor_acordado=servico.preco_base
    )
    db.add(novo_pedido_servico)
    db.flush()

    # Criar Pagamento
    pagamento = PagamentoServico(
        pedido_servico_id=novo_pedido_servico.id,
        metodo=dados.metodo_pagamento,
        valor=servico.preco_base,
        moeda="AOA"
    )
    db.add(pagamento)

    db.commit()
    db.refresh(novo_pedido_servico)

    vendedor_iban = servico.vendedor.iban if servico.vendedor.iban else None
    
    return {
        "mensagem": "Serviço solicitado com sucesso", 
        "numero_pedido": novo_pedido_servico.numero_pedido,
        "pedido_id": novo_pedido_servico.id,
        "vendedores_ibans": [f"{servico.vendedor.nome_loja}: {vendedor_iban}"] if vendedor_iban else []
    }


# ─────────────────────────── ATUALIZAR STATUS ───────────────────────────
@router.put("/produtos/{pedido_id}/status")
def atualizar_status_pedido(
    pedido_id: int,
    dados: PedidoStatusUpdateSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
) -> Any:
    """
    Atualiza o status de um pedido de produto. (Vendedor)
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    # Verifica se o current_user é o vendedor de pelo menos um dos itens deste pedido.
    # Em um marketplace multi-vendedor real, o pedido deve ser dividido por vendedor.
    # Assumimos que o vendedor pode atualizar o status geral se for dono de um item.
    is_seller = any(item.vendedor.utilizador_id == current_user.id for item in pedido.itens)
    if not is_seller and current_user.tipo_utilizador.value != "admin":
        raise HTTPException(status_code=403, detail="Não tem permissões para atualizar este pedido.")

    try:
        pedido.status = StatusPedidoEnum[dados.status.lower()]
    except KeyError:
        raise HTTPException(status_code=400, detail="Status inválido.")

    db.commit()
    return {"mensagem": f"Status do pedido atualizado para {dados.status}."}


@router.put("/servicos/{pedido_id}/status")
def atualizar_status_pedido_servico(
    pedido_id: int,
    dados: PedidoServicoStatusUpdateSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
) -> Any:
    """
    Atualiza o status de um pedido de serviço. (Vendedor)
    """
    pedido = db.query(PedidoServico).filter(PedidoServico.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    if pedido.servico.vendedor.utilizador_id != current_user.id and current_user.tipo_utilizador.value != "admin":
        raise HTTPException(status_code=403, detail="Não tem permissões para atualizar este pedido.")

    try:
        pedido.status = StatusPedidoEnum[dados.status.lower()]
    except KeyError:
        raise HTTPException(status_code=400, detail="Status inválido.")

    db.commit()
    return {"mensagem": f"Status do serviço atualizado para {dados.status}."}


def salvar_comprovativo_pagamento(base64_str: str, pedido_id: int) -> str:
    """Guarda a imagem recebida em base64 e retorna o url do comprovativo."""
    if "," in base64_str:
        header, encoded = base64_str.split(",", 1)
        extensao = header.split(";")[0].split("/")[1]
    else:
        encoded = base64_str
        extensao = "jpg"
        
    dir_path = f"imagens/pagamentos/{pedido_id}"
    os.makedirs(dir_path, exist_ok=True)
    
    file_name = f"comprovativo.{extensao}"
    file_path = os.path.join(dir_path, file_name)
    
    with open(file_path, "wb") as f:
        f.write(base64.b64decode(encoded))
        
    return f"http://localhost:8000/{dir_path}/{file_name}"

from pydantic import BaseModel

class ComprovativoSchema(BaseModel):
    imagem_base64: str

@router.post("/{pedido_id}/comprovativo", status_code=status.HTTP_200_OK)
def upload_comprovativo(
    pedido_id: int,
    dados: ComprovativoSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
):
    """
    Faz o upload do comprovativo (base64) para um pedido de produto.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
        
    if pedido.comprador_id != current_user.id:
        raise HTTPException(status_code=403, detail="Não tem permissões para este pedido.")
        
    if not pedido.pagamento:
        raise HTTPException(status_code=400, detail="O pedido não possui um pagamento registado.")
        
    url_comprovativo = salvar_comprovativo_pagamento(dados.imagem_base64, pedido_id)
    pedido.pagamento.comprovativo_url = url_comprovativo
    db.commit()
    
    return {"mensagem": "Comprovativo recebido com sucesso", "url": url_comprovativo}

@router.post("/servicos/{pedido_id}/comprovativo", status_code=status.HTTP_200_OK)
def upload_comprovativo_servico(
    pedido_id: int,
    dados: ComprovativoSchema,
    db: Session = Depends(get_db),
    current_user: Utilizador = Depends(get_current_user)
):
    """
    Faz o upload do comprovativo (base64) para um pedido de serviço.
    """
    pedido = db.query(PedidoServico).filter(PedidoServico.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
        
    if pedido.comprador_id != current_user.id:
        raise HTTPException(status_code=403, detail="Não tem permissões para este pedido.")
        
    if not pedido.pagamento:
        raise HTTPException(status_code=400, detail="O pedido não possui um pagamento registado.")
        
    url_comprovativo = salvar_comprovativo_pagamento(dados.imagem_base64, f"serv_{pedido_id}")
    pedido.pagamento.comprovativo_url = url_comprovativo
    db.commit()
    
    return {"mensagem": "Comprovativo recebido com sucesso", "url": url_comprovativo}
