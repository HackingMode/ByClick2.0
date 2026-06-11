from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Provincia, Municipio
from app.schemas.schemas import ProvinciaResponseSchema, MunicipioResponseSchema

router = APIRouter()


@router.get("/provincias", response_model=List[ProvinciaResponseSchema])
def listar_provincias(db: Session = Depends(get_db)):
    """
    Retorna a lista de todas as províncias registadas na base de dados.
    """
    provincias = db.query(Provincia).order_by(Provincia.nome).all()
    return provincias


@router.get("/provincias/{provincia_id}/municipios", response_model=List[MunicipioResponseSchema])
def listar_municipios_da_provincia(provincia_id: int, db: Session = Depends(get_db)):
    """
    Retorna a lista de municípios pertencentes a uma província específica.
    """
    provincia = db.query(Provincia).filter(Provincia.id == provincia_id).first()
    if not provincia:
        raise HTTPException(status_code=404, detail="Província não encontrada")

    municipios = db.query(Municipio).filter(Municipio.provincia_id == provincia_id).order_by(Municipio.nome).all()
    return municipios
