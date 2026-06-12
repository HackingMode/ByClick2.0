import base64
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Servico, Utilizador, TipoLojaEnum, ImagemServico
from app.schemas.schemas import ServicoCreateSchema, ServicoResponseSchema
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/servicos", tags=["Servicos"])

def salvar_imagem_servico(base64_str: str, servico_id: int) -> str:
    if "," in base64_str:
        header, b64_data = base64_str.split(",", 1)
        ext = header.split("/")[1].split(";")[0]
        if ext == "jpeg":
            ext = "jpg"
    else:
        b64_data = base64_str
        ext = "jpg"
    
    path = os.path.join("imagens", "servicos", str(servico_id))
    os.makedirs(path, exist_ok=True)
    file_path = os.path.join(path, f"capa.{ext}")
    
    with open(file_path, "wb") as fh:
        fh.write(base64.b64decode(b64_data))
        
    return f"http://localhost:8000/imagens/servicos/{servico_id}/capa.{ext}"


@router.post("/", response_model=ServicoResponseSchema, status_code=201)
def criar_servico(
    dados: ServicoCreateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Precisa de ter uma loja/perfil para adicionar serviços")
    
    # Verifica se a loja permite serviços
    if utilizador.perfil_vendedor.tipo_loja == TipoLojaEnum.produtos:
        raise HTTPException(status_code=403, detail="O seu perfil está configurado apenas para produtos. Atualize o seu perfil para permitir serviços.")

    servico_data = dados.model_dump(exclude={"imagem"})
    servico = Servico(
        vendedor_id=utilizador.perfil_vendedor.id,
        **servico_data
    )
    db.add(servico)
    db.flush()
    
    if dados.imagem:
        img_url = salvar_imagem_servico(dados.imagem, servico.id)
        img_servico = ImagemServico(servico_id=servico.id, url=img_url, principal=True)
        db.add(img_servico)
        
    db.commit()
    db.refresh(servico)
    return servico


@router.get("/", response_model=List[ServicoResponseSchema])
def listar_servicos(
    skip: int = 0,
    limit: int = 20,
    categoria_id: Optional[int] = None,
    q: Optional[str] = None,
    ordenar: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Servico).filter(Servico.ativo == True)
    if categoria_id:
        query = query.filter(Servico.categoria_id == categoria_id)
    if q:
        termo = f"%{q}%"
        query = query.filter(
            (Servico.nome.ilike(termo)) | (Servico.descricao.ilike(termo))
        )
    # Ordenação
    if ordenar == "preco_asc":
        query = query.order_by(Servico.preco_base.asc())
    elif ordenar == "preco_desc":
        query = query.order_by(Servico.preco_base.desc())
    elif ordenar == "avaliacao":
        query = query.order_by(Servico.avaliacao_media.desc())
    else:
        query = query.order_by(Servico.criado_em.desc())
    return query.offset(skip).limit(limit).all()


@router.get("/{servico_id}", response_model=ServicoResponseSchema)
def ver_servico(servico_id: int, db: Session = Depends(get_db)):
    servico = db.query(Servico).filter(Servico.id == servico_id, Servico.ativo == True).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return servico


@router.put("/{servico_id}", response_model=ServicoResponseSchema)
def editar_servico(
    servico_id: int,
    dados: ServicoCreateSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    """Editar um serviço (apenas o dono)."""
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Sem perfil de vendedor")

    servico = db.query(Servico).filter(
        Servico.id == servico_id,
        Servico.vendedor_id == utilizador.perfil_vendedor.id,
        Servico.ativo == True
    ).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado ou sem permissão")

    for key, value in dados.model_dump(exclude_unset=True).items():
        setattr(servico, key, value)

    db.commit()
    db.refresh(servico)
    return servico


@router.delete("/{servico_id}", status_code=204)
def remover_servico(
    servico_id: int,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db),
):
    servico = db.query(Servico).filter(
        Servico.id == servico_id,
        Servico.vendedor_id == utilizador.perfil_vendedor.id
    ).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado ou sem permissão")
    servico.ativo = False
    db.commit()

