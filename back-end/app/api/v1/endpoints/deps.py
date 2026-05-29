from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import Utilizador

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_utilizador_atual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Utilizador:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    utilizador = db.query(Utilizador).filter(Utilizador.id == int(payload["sub"])).first()
    if not utilizador or not utilizador.ativo:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    return utilizador


def get_vendedor_atual(utilizador: Utilizador = Depends(get_utilizador_atual)):
    if not utilizador.perfil_vendedor:
        raise HTTPException(status_code=403, detail="Esta conta não tem perfil de vendedor")
    return utilizador
