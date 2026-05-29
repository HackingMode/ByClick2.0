"""
Endpoints de Autenticação - Registo, Login, Verificação
"""

import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.models import Utilizador, CodigoVerificacao, TipoUtilizadorEnum
from app.schemas.schemas import (
    RegistoComipradorSchema, LoginSchema, TokenSchema, VerificarCodigoSchema, UtilizadorResponseSchema
)
from app.api.v1.endpoints.deps import get_utilizador_atual

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def gerar_codigo_otp(tamanho: int = 6) -> str:
    return "".join(random.choices(string.digits, k=tamanho))


@router.post("/registar", response_model=dict, status_code=status.HTTP_201_CREATED)
def registar_comprador(dados: RegistoComipradorSchema, db: Session = Depends(get_db)):
    """Registar novo utilizador (comprador por defeito)."""

    # Verificar duplicados
    if db.query(Utilizador).filter(Utilizador.email == dados.email).first():
        raise HTTPException(status_code=400, detail="Este email já está registado")

    if db.query(Utilizador).filter(Utilizador.nome_utilizador == dados.nome_utilizador).first():
        raise HTTPException(status_code=400, detail="Este nome de utilizador já existe")

    if db.query(Utilizador).filter(Utilizador.numero_telefone == dados.numero_telefone).first():
        raise HTTPException(status_code=400, detail="Este número de telefone já está registado")

    # Criar utilizador
    novo_utilizador = Utilizador(
        nome_completo=dados.nome_completo,
        nome_utilizador=dados.nome_utilizador,
        email=dados.email,
        numero_telefone=dados.numero_telefone,
        senha_hash=hash_password(dados.senha),
        data_nascimento=dados.data_nascimento,
        genero=dados.genero,
        tipo_utilizador=TipoUtilizadorEnum.comprador,
    )
    db.add(novo_utilizador)
    db.commit()
    db.refresh(novo_utilizador)

    # Gerar código de verificação de email
    codigo = CodigoVerificacao(
        utilizador_id=novo_utilizador.id,
        codigo=gerar_codigo_otp(),
        tipo="email",
        expira_em=datetime.utcnow() + timedelta(minutes=30),
    )
    db.add(codigo)
    db.commit()

    # TODO: enviar email com código
    # send_verification_email(novo_utilizador.email, codigo.codigo)

    return {
        "mensagem": "Registo efetuado com sucesso. Verifique o seu email.",
        "utilizador_id": novo_utilizador.id,
    }


@router.post("/login", response_model=TokenSchema)
def login(dados: LoginSchema, db: Session = Depends(get_db)):
    """Login com email/telefone e senha."""

    # Procurar por email ou telefone
    utilizador = (
        db.query(Utilizador)
        .filter(
            (Utilizador.email == dados.identificador) |
            (Utilizador.numero_telefone == dados.identificador)
        )
        .first()
    )

    if not utilizador or not verify_password(dados.senha, utilizador.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    if not utilizador.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada")

    # Atualizar último login
    utilizador.ultimo_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(utilizador.id), "tipo": utilizador.tipo_utilizador.value}

    return TokenSchema(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/verificar-codigo")
def verificar_codigo(dados: VerificarCodigoSchema, db: Session = Depends(get_db)):
    """Verificar código OTP de email ou telefone."""

    codigo = (
        db.query(CodigoVerificacao)
        .filter(
            CodigoVerificacao.utilizador_id == dados.utilizador_id,
            CodigoVerificacao.codigo == dados.codigo,
            CodigoVerificacao.tipo == dados.tipo,
            CodigoVerificacao.usado == False,
            CodigoVerificacao.expira_em > datetime.utcnow(),
        )
        .first()
    )

    if not codigo:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")

    codigo.usado = True
    utilizador = db.query(Utilizador).filter(Utilizador.id == dados.utilizador_id).first()

    if dados.tipo == "email":
        utilizador.email_verificado = True
    elif dados.tipo == "telefone":
        utilizador.telefone_verificado = True

    db.commit()
    return {"mensagem": "Verificação concluída com sucesso"}


@router.get("/me", response_model=UtilizadorResponseSchema)
def obter_utilizador_atual_endpoint(utilizador: Utilizador = Depends(get_utilizador_atual)):
    """Obter dados do utilizador autenticado pelo token JWT."""
    return utilizador
