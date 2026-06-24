import base64
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Produto, Utilizador, ImagemProduto
from app.schemas.schemas import ProdutoCreateSchema, ProdutoResponseSchema
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/produtos", tags=["Produtos"])

def salvar_imagem_produto(base64_str: str, produto_id: int) -> str:
    if "," in base64_str:
        header, b64_data = base64_str.split(",", 1)
        ext = header.split("/")[1].split(";")[0]
        if ext == "jpeg":
            ext = "jpg"
    else:
        b64_data = base64_str
        ext = "jpg"
    
    path = os.path.join("imagens", "produtos", str(produto_id))
    os.makedirs(path, exist_ok=True)
    file_path = os.path.join(path, f"capa.{ext}")
    
    with open(file_path, "wb") as fh:
        fh.write(base64.b64decode(b64_data))
        
    return f"http://localhost:8000/imagens/produtos/{produto_id}/capa.{ext}"

@router.post("/", response_model=ProdutoResponseSchema, status_code=201)
def criar_produto(
    dados: ProdutoCreateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Precisa de ter uma loja para adicionar produtos")

    produto_data = dados.model_dump(exclude={"imagem"})
    produto = Produto(
        vendedor_id=utilizador.perfil_vendedor.id,
        **produto_data
    )
    db.add(produto)
    db.flush()
    
    if dados.imagem:
        img_url = salvar_imagem_produto(dados.imagem, produto.id)
        img_produto = ImagemProduto(produto_id=produto.id, url=img_url, principal=True)
        db.add(img_produto)
        
    db.commit()
    db.refresh(produto)
    return produto


@router.get("/", response_model=List[ProdutoResponseSchema])
def listar_produtos(
    skip: int = 0,
    limit: int = 20,
    categoria_id: Optional[int] = None,
    q: Optional[str] = None,
    ordenar: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Produto).filter(Produto.ativo == True)
    if categoria_id:
        query = query.filter(Produto.categoria_id == categoria_id)
    if q:
        termo = f"%{q}%"
        query = query.filter(
            (Produto.nome.ilike(termo)) | (Produto.descricao.ilike(termo))
        )
    # Ordenação
    if ordenar == "preco_asc":
        query = query.order_by(Produto.preco.asc())
    elif ordenar == "preco_desc":
        query = query.order_by(Produto.preco.desc())
    elif ordenar == "avaliacao":
        query = query.order_by(Produto.avaliacao_media.desc())
    else:
        query = query.order_by(Produto.criado_em.desc())
    return query.offset(skip).limit(limit).all()


@router.get("/{produto_id}", response_model=ProdutoResponseSchema)
def ver_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id, Produto.ativo == True).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.put("/{produto_id}", response_model=ProdutoResponseSchema)
def editar_produto(
    produto_id: int,
    dados: ProdutoCreateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    """Editar um produto (apenas o dono)."""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Sem perfil de vendedor")

    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.vendedor_id == utilizador.perfil_vendedor.id,
        Produto.ativo == True
    ).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado ou sem permissão")

    produto_data = dados.model_dump(exclude_unset=True, exclude={"imagem"})
    for key, value in produto_data.items():
        setattr(produto, key, value)

    if dados.imagem:
        img_url = salvar_imagem_produto(dados.imagem, produto.id)
        # Remover imagens antigas principais se necessário, mas por agora limpa tudo e recria
        db.query(ImagemProduto).filter(ImagemProduto.produto_id == produto.id).delete()
        img_produto = ImagemProduto(produto_id=produto.id, url=img_url, principal=True)
        db.add(img_produto)

    db.commit()
    db.refresh(produto)
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

