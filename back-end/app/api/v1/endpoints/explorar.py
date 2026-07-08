from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
import math
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Produto, Servico

router = APIRouter(prefix="/explorar", tags=["Explorar"])

class ExplorarItemSchema(BaseModel):
    id: int
    tipo: str  # "produto" ou "servico"
    nome: str
    descricao: Optional[str] = None
    preco: float
    avaliacao_media: float
    vendedor_id: int
    imagem_url: Optional[str] = None
    
    # Específico de Serviço
    duracao_estimada: Optional[str] = None
    
    # Específico de Localização
    distancia_km: Optional[float] = None

def calcular_distancia(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    R = 6371 # Raio da terra em km
    try:
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2) * math.sin(dlat/2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dlon/2) * math.sin(dlon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    except:
        return None

@router.get("/pesquisa", response_model=List[ExplorarItemSchema])
def pesquisar(
    q: Optional[str] = None,
    tipo: Optional[str] = None,  # "produto", "servico", ou vazio para ambos
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db)
):
    resultados = []
    
    termo = f"%{q}%" if q else None

    # Pesquisa Produtos
    if not tipo or tipo == "produto":
        query_prod = db.query(Produto).filter(Produto.ativo == True)
        if termo:
            query_prod = query_prod.filter((Produto.nome.ilike(termo)) | (Produto.descricao.ilike(termo)))
            
        for p in query_prod.limit(50).all():
            img_url = p.imagens[0].url if p.imagens else None
            
            # Localizacao do Vendedor
            dist = None
            if p.vendedor and p.vendedor.utilizador and p.vendedor.utilizador.endereco:
                vend_lat = p.vendedor.utilizador.endereco.latitude
                vend_lon = p.vendedor.utilizador.endereco.longitude
                dist = calcular_distancia(lat, lon, vend_lat, vend_lon)
                
            resultados.append(ExplorarItemSchema(
                id=p.id,
                tipo="produto",
                nome=p.nome,
                descricao=p.descricao,
                preco=float(p.preco),
                avaliacao_media=p.avaliacao_media,
                vendedor_id=p.vendedor_id,
                imagem_url=img_url,
                distancia_km=dist
            ))

    # Pesquisa Serviços
    if not tipo or tipo == "servico":
        query_serv = db.query(Servico).filter(Servico.ativo == True)
        if termo:
            query_serv = query_serv.filter((Servico.nome.ilike(termo)) | (Servico.descricao.ilike(termo)))
            
        for s in query_serv.limit(50).all():
            img_url = s.imagens[0].url if s.imagens else None
            
            # Localizacao do Vendedor
            dist = None
            if s.vendedor and s.vendedor.utilizador and s.vendedor.utilizador.endereco:
                vend_lat = s.vendedor.utilizador.endereco.latitude
                vend_lon = s.vendedor.utilizador.endereco.longitude
                dist = calcular_distancia(lat, lon, vend_lat, vend_lon)
                
            resultados.append(ExplorarItemSchema(
                id=s.id,
                tipo="servico",
                nome=s.nome,
                descricao=s.descricao,
                preco=float(s.preco_base),
                avaliacao_media=s.avaliacao_media,
                vendedor_id=s.vendedor_id,
                imagem_url=img_url,
                duracao_estimada=s.duracao_estimada,
                distancia_km=dist
            ))

    # Ordenar: Primeiro por distancia (se houver), depois por avaliação
    def sort_key(x):
        # Se distancia for None, colocamos num valor muito alto (float('inf')) para ficar no fim
        d = x.distancia_km if x.distancia_km is not None else float('inf')
        return (d, -x.avaliacao_media)
        
    resultados.sort(key=sort_key)
    return resultados
