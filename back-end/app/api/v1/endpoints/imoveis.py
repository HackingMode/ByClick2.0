from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.v1.endpoints.deps import get_utilizador_atual as get_current_user
from app.models.models import Utilizador, Imovel, ImagemImovel, PropostaImovel, PerfilVendedor, StatusPropostaImovelEnum
from app.schemas.schemas import ImovelCreateSchema, ImovelResponseSchema, PropostaImovelCreateSchema, PropostaImovelResponseSchema

router = APIRouter()

@router.post("/", response_model=ImovelResponseSchema)
def criar_imovel(
    dados: ImovelCreateSchema,
    db: Session = Depends(get_db),
    usuario_atual: Utilizador = Depends(get_current_user)
):
    """
    Cria um novo anúncio de imóvel. 
    Apenas utilizadores com perfil de vendedor ou empresa podem criar.
    """
    if not usuario_atual.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Apenas vendedores podem criar imóveis")
    
    imovel = Imovel(
        vendedor_id=usuario_atual.perfil_vendedor.id,
        **dados.model_dump()
    )
    db.add(imovel)
    db.commit()
    db.refresh(imovel)
    return imovel

@router.get("/", response_model=List[ImovelResponseSchema])
def listar_imoveis(
    db: Session = Depends(get_db),
    vendedor_id: Optional[int] = None,
    tipo_negocio: Optional[str] = None, # venda ou aluguer
    tipo_imovel: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """
    Lista os imóveis disponíveis. Pode ser filtrado.
    """
    query = db.query(Imovel).filter(Imovel.ativo == True)
    
    if vendedor_id:
        query = query.filter(Imovel.vendedor_id == vendedor_id)
    if tipo_negocio:
        query = query.filter(Imovel.finalidade == tipo_negocio)
    if tipo_imovel:
        query = query.filter(Imovel.tipo_imovel == tipo_imovel)
        
    imoveis = query.offset(skip).limit(limit).all()
    
    # Preencher info do vendedor
    for imovel in imoveis:
        vendedor = imovel.vendedor
        if vendedor and vendedor.utilizador:
            setattr(imovel, "vendedor_nome", vendedor.nome_loja)
            setattr(imovel, "vendedor_telefone", vendedor.utilizador.numero_telefone)
            if vendedor.utilizador.endereco:
                setattr(imovel, "vendedor_latitude", vendedor.utilizador.endereco.latitude)
                setattr(imovel, "vendedor_longitude", vendedor.utilizador.endereco.longitude)
                
    return imoveis

@router.get("/{imovel_id}", response_model=ImovelResponseSchema)
def ver_imovel(imovel_id: int, db: Session = Depends(get_db)):
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id, Imovel.ativo == True).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
        
    vendedor = imovel.vendedor
    if vendedor and vendedor.utilizador:
        setattr(imovel, "vendedor_nome", vendedor.nome_loja)
        setattr(imovel, "vendedor_telefone", vendedor.utilizador.numero_telefone)
        if vendedor.utilizador.endereco:
            setattr(imovel, "vendedor_latitude", vendedor.utilizador.endereco.latitude)
            setattr(imovel, "vendedor_longitude", vendedor.utilizador.endereco.longitude)
            
    return imovel

@router.put("/{imovel_id}", response_model=ImovelResponseSchema)
def editar_imovel(
    imovel_id: int,
    dados: ImovelCreateSchema,
    db: Session = Depends(get_db),
    usuario_atual: Utilizador = Depends(get_current_user)
):
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
        
    if not usuario_atual.perfil_vendedor or imovel.vendedor_id != usuario_atual.perfil_vendedor.id:
        raise HTTPException(status_code=403, detail="Não tem permissão para editar este imóvel")
        
    for key, value in dados.model_dump(exclude_unset=True).items():
        setattr(imovel, key, value)
        
    db.commit()
    db.refresh(imovel)
    return imovel

@router.delete("/{imovel_id}")
def apagar_imovel(
    imovel_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Utilizador = Depends(get_current_user)
):
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
        
    if not usuario_atual.perfil_vendedor or imovel.vendedor_id != usuario_atual.perfil_vendedor.id:
        raise HTTPException(status_code=403, detail="Não tem permissão para remover este imóvel")
        
    db.delete(imovel)
    db.commit()
    return {"mensagem": "Imóvel removido com sucesso"}


# ─────────────────────── PROPOSTAS DE IMÓVEIS ───────────────────────

@router.post("/{imovel_id}/propostas", response_model=PropostaImovelResponseSchema)
def enviar_proposta(
    imovel_id: int,
    dados: PropostaImovelCreateSchema,
    db: Session = Depends(get_db),
    usuario_atual: Utilizador = Depends(get_current_user)
):
    """
    Envia uma proposta / mensagem para um imóvel.
    """
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id, Imovel.ativo == True).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
        
    # Impedir enviar proposta para o próprio imóvel
    if usuario_atual.perfil_vendedor and imovel.vendedor_id == usuario_atual.perfil_vendedor.id:
        raise HTTPException(status_code=400, detail="Não pode enviar propostas para o seu próprio imóvel")
        
    proposta = PropostaImovel(
        imovel_id=imovel_id,
        comprador_id=usuario_atual.id,
        mensagem=dados.mensagem,
        valor_proposto=dados.valor_proposto
    )
    db.add(proposta)
    db.commit()
    db.refresh(proposta)
    
    setattr(proposta, "comprador_nome", usuario_atual.nome_completo)
    setattr(proposta, "comprador_telefone", usuario_atual.numero_telefone)
    return proposta

@router.get("/{imovel_id}/propostas", response_model=List[PropostaImovelResponseSchema])
def listar_propostas_do_imovel(
    imovel_id: int,
    db: Session = Depends(get_db),
    usuario_atual: Utilizador = Depends(get_current_user)
):
    """
    Lista as propostas recebidas para um imóvel específico. Apenas o dono pode ver.
    """
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
        
    if not usuario_atual.perfil_vendedor or imovel.vendedor_id != usuario_atual.perfil_vendedor.id:
        raise HTTPException(status_code=403, detail="Não tem permissão para ver estas propostas")
        
    propostas = db.query(PropostaImovel).filter(PropostaImovel.imovel_id == imovel_id).all()
    
    for p in propostas:
        setattr(p, "comprador_nome", p.comprador.nome_completo)
        setattr(p, "comprador_telefone", p.comprador.numero_telefone)
        
    return propostas
