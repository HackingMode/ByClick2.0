"""
Endpoints de autenticacao - registo, login e verificacao.
"""

import base64
import os
import random
import re
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.v1.endpoints.deps import get_utilizador_atual
from app.core.database import get_db
from app.core.email import enviar_otp_recuperacao
from app.core.phone import normalizar_telefone_angola, parece_telefone, variantes_telefone_angola
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.models import (
    CodigoVerificacao,
    DocumentoBI,
    Endereco,
    PerfilVendedor,
    TipoLojaEnum,
    TipoUtilizadorEnum,
    TipoVendedorEnum,
    Utilizador,
)
from app.schemas.schemas import (
    LoginSchema,
    RegistoCompradorSchema,
    RegistoContaVendedorSchema,
    RegistoEmpresaSchema,
    TokenSchema,
    UtilizadorResponseSchema,
    VerificarCodigoSchema,
    RecuperarSenhaSchema,
    RedefinirSenhaSchema,
    MudarSenhaSchema,
)

router = APIRouter(prefix="/auth", tags=["Autenticacao"])


def gerar_codigo_otp(tamanho: int = 6) -> str:
    return "".join(random.choices(string.digits, k=tamanho))


def salvar_foto_perfil(base64_str: str, tipo_utilizador: str, utilizador_id: int) -> str:
    if "," in base64_str:
        header, b64_data = base64_str.split(",", 1)
        ext = header.split("/")[1].split(";")[0]
        if ext == "jpeg":
            ext = "jpg"
    else:
        b64_data = base64_str
        ext = "jpg"
    
    # Save relatively in back-end/imagens/<tipo_utilizador>/<utilizador_id>
    path = os.path.join("imagens", tipo_utilizador, str(utilizador_id))
    os.makedirs(path, exist_ok=True)
    file_path = os.path.join(path, f"perfil.{ext}")
    
    with open(file_path, "wb") as fh:
        fh.write(base64.b64decode(b64_data))
        
    return f"http://localhost:8000/imagens/{tipo_utilizador}/{utilizador_id}/perfil.{ext}"


def gerar_nome_utilizador_empresa(db: Session, nome_empresa: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", nome_empresa.lower()).strip("-") or "empresa"
    base = base[:70]
    candidato = base
    contador = 2

    while db.query(Utilizador).filter(Utilizador.nome_utilizador == candidato).first():
        sufixo = f"-{contador}"
        candidato = f"{base[:80 - len(sufixo)]}{sufixo}"
        contador += 1

    return candidato


def validar_utilizador_unico(
    db: Session,
    email: str,
    nome_utilizador: str,
    numero_telefone: str,
):
    if db.query(Utilizador).filter(Utilizador.email == email).first():
        raise HTTPException(status_code=400, detail="Este email ja esta registado")

    if db.query(Utilizador).filter(Utilizador.nome_utilizador == nome_utilizador).first():
        raise HTTPException(status_code=400, detail="Este nome de utilizador ja existe")

    if db.query(Utilizador).filter(
        Utilizador.numero_telefone.in_(variantes_telefone_angola(numero_telefone))
    ).first():
        raise HTTPException(status_code=400, detail="Este numero de telefone ja esta registado")


def validar_nome_loja_unico(db: Session, nome_loja: str):
    if db.query(PerfilVendedor).filter(PerfilVendedor.nome_loja == nome_loja).first():
        raise HTTPException(status_code=400, detail="Este nome de loja ja existe")


def criar_utilizador(
    db: Session,
    *,
    nome_completo: str,
    nome_utilizador: str,
    email: str,
    numero_telefone: str,
    senha: str,
    tipo_utilizador: TipoUtilizadorEnum,
    data_nascimento=None,
    genero=None,
) -> Utilizador:
    validar_utilizador_unico(db, email, nome_utilizador, numero_telefone)

    utilizador = Utilizador(
        nome_completo=nome_completo,
        nome_utilizador=nome_utilizador,
        email=email,
        numero_telefone=numero_telefone,
        senha_hash=hash_password(senha),
        data_nascimento=data_nascimento,
        genero=genero,
        tipo_utilizador=tipo_utilizador,
    )
    db.add(utilizador)
    db.flush()
    return utilizador


def criar_endereco(db: Session, utilizador_id: int, dados):
    provincia = getattr(dados, "provincia", None)
    municipio = getattr(dados, "municipio", None)
    bairro = getattr(dados, "bairro", None)
    endereco_completo = getattr(dados, "endereco_completo", None)
    nif = getattr(dados, "nif", None)

    if not any([provincia, municipio, bairro, endereco_completo, nif]):
        return

    if not provincia or not municipio:
        raise HTTPException(
            status_code=422,
            detail="Provincia e municipio sao obrigatorios para guardar endereco",
        )

    if nif and db.query(Endereco).filter(Endereco.nif == nif).first():
        raise HTTPException(status_code=400, detail="Este NIF ja esta registado")

    db.add(Endereco(
        utilizador_id=utilizador_id,
        provincia=provincia,
        municipio=municipio,
        bairro=bairro,
        endereco_completo=endereco_completo,
        nif=nif,
    ))


def criar_documento_bi(db: Session, utilizador_id: int, dados: RegistoContaVendedorSchema):
    if db.query(DocumentoBI).filter(DocumentoBI.numero_bi == dados.numero_bi).first():
        raise HTTPException(status_code=400, detail="Este numero de BI ja esta registado")

    db.add(DocumentoBI(
        utilizador_id=utilizador_id,
        numero_bi=dados.numero_bi,
        data_emissao=dados.data_emissao,
        data_validade=dados.data_validade,
    ))


def criar_perfil_vendedor(
    db: Session,
    utilizador_id: int,
    *,
    nome_loja: str,
    descricao_loja: str | None,
    tipo_vendedor: TipoVendedorEnum,
    tipo_loja: TipoLojaEnum,
):
    validar_nome_loja_unico(db, nome_loja)

    db.add(PerfilVendedor(
        utilizador_id=utilizador_id,
        nome_loja=nome_loja,
        descricao_loja=descricao_loja,
        tipo_vendedor=tipo_vendedor,
        tipo_loja=tipo_loja,
    ))


def criar_codigo_verificacao(db: Session, utilizador_id: int):
    db.add(CodigoVerificacao(
        utilizador_id=utilizador_id,
        codigo=gerar_codigo_otp(),
        tipo="email",
        expira_em=datetime.utcnow() + timedelta(minutes=30),
    ))


def resposta_registo(utilizador: Utilizador, mensagem: str, **extra):
    resposta = {
        "mensagem": mensagem,
        "utilizador_id": utilizador.id,
        "tipo_utilizador": utilizador.tipo_utilizador.value,
        "numero_telefone": utilizador.numero_telefone,
    }
    resposta.update(extra)
    return resposta


def montar_descricao_empresa(dados: RegistoEmpresaSchema) -> str | None:
    partes = [dados.descricao] if dados.descricao else []
    detalhes = []

    for rotulo, valor in (
        ("Tipo de empresa", dados.tipo_empresa),
        ("Categoria principal", dados.categoria_principal),
        ("Website", dados.website),
        ("Representante", dados.representante_nome),
        ("Cargo do representante", dados.representante_cargo),
        ("BI do representante", dados.representante_bi),
        ("Email do representante", dados.representante_email),
        ("Telefone do representante", dados.representante_telefone),
    ):
        if valor:
            detalhes.append(f"{rotulo}: {valor}")

    if detalhes:
        partes.append("Dados empresariais:\n" + "\n".join(detalhes))

    return "\n\n".join(partes) or None


@router.post("/registar", response_model=dict, status_code=status.HTTP_201_CREATED)
@router.post("/registar-comprador", response_model=dict, status_code=status.HTTP_201_CREATED)
def registar_comprador(dados: RegistoCompradorSchema, db: Session = Depends(get_db)):
    """Registar novo comprador."""

    try:
        utilizador = criar_utilizador(
            db,
            nome_completo=dados.nome_completo,
            nome_utilizador=dados.nome_utilizador,
            email=dados.email,
            numero_telefone=dados.numero_telefone,
            senha=dados.senha,
            data_nascimento=dados.data_nascimento,
            genero=dados.genero,
            tipo_utilizador=TipoUtilizadorEnum.comprador,
        )
        criar_endereco(db, utilizador.id, dados)
        criar_codigo_verificacao(db, utilizador.id)
        if dados.foto_perfil:
            utilizador.foto_perfil_url = salvar_foto_perfil(dados.foto_perfil, "comprador", utilizador.id)
        db.commit()
        db.refresh(utilizador)
    except Exception:
        db.rollback()
        raise

    return resposta_registo(
        utilizador,
        "Registo de comprador efetuado com sucesso. Verifique o seu email.",
    )


@router.post("/registar-vendedor", response_model=dict, status_code=status.HTTP_201_CREATED)
def registar_vendedor(dados: RegistoContaVendedorSchema, db: Session = Depends(get_db)):
    """Registar novo vendedor individual."""

    nome_loja = dados.nome_loja or dados.nome_utilizador

    try:
        utilizador = criar_utilizador(
            db,
            nome_completo=dados.nome_completo,
            nome_utilizador=dados.nome_utilizador,
            email=dados.email,
            numero_telefone=dados.numero_telefone,
            senha=dados.senha,
            data_nascimento=dados.data_nascimento,
            genero=dados.genero,
            tipo_utilizador=TipoUtilizadorEnum.vendedor,
        )
        criar_endereco(db, utilizador.id, dados)
        criar_documento_bi(db, utilizador.id, dados)
        criar_perfil_vendedor(
            db,
            utilizador.id,
            nome_loja=nome_loja,
            descricao_loja=dados.descricao_loja,
            tipo_vendedor=TipoVendedorEnum.individual,
            tipo_loja=dados.tipo_loja,
        )
        criar_codigo_verificacao(db, utilizador.id)
        if dados.foto_perfil:
            utilizador.foto_perfil_url = salvar_foto_perfil(dados.foto_perfil, "vendedor", utilizador.id)
        db.commit()
        db.refresh(utilizador)
    except Exception:
        db.rollback()
        raise

    return resposta_registo(
        utilizador,
        "Registo de vendedor efetuado com sucesso. Verifique o seu email.",
        nome_loja=nome_loja,
    )


@router.post("/registar-empresa", response_model=dict, status_code=status.HTTP_201_CREATED)
def registar_empresa(dados: RegistoEmpresaSchema, db: Session = Depends(get_db)):
    """Registar nova conta empresarial."""

    nome_utilizador = dados.nome_utilizador or gerar_nome_utilizador_empresa(db, dados.nome_empresa)

    try:
        utilizador = criar_utilizador(
            db,
            nome_completo=dados.representante_nome,
            nome_utilizador=nome_utilizador,
            email=dados.email,
            numero_telefone=dados.telefone,
            senha=dados.senha,
            tipo_utilizador=TipoUtilizadorEnum.vendedor,
        )
        criar_endereco(db, utilizador.id, dados)
        criar_perfil_vendedor(
            db,
            utilizador.id,
            nome_loja=dados.nome_empresa,
            descricao_loja=montar_descricao_empresa(dados),
            tipo_vendedor=TipoVendedorEnum.empresa,
            tipo_loja=dados.tipo_loja,
        )
        criar_codigo_verificacao(db, utilizador.id)
        if dados.foto_perfil:
            utilizador.foto_perfil_url = salvar_foto_perfil(dados.foto_perfil, "empresa", utilizador.id)
        db.commit()
        db.refresh(utilizador)
    except Exception:
        db.rollback()
        raise

    return resposta_registo(
        utilizador,
        "Registo de empresa efetuado com sucesso. Verifique o seu email.",
        nome_loja=dados.nome_empresa,
        nome_utilizador=nome_utilizador,
    )


@router.post("/login", response_model=TokenSchema)
def login(dados: LoginSchema, db: Session = Depends(get_db)):
    """Login com email/telefone e senha."""

    identificador = dados.identificador.strip().lower()
    telefone_normalizado = None

    if parece_telefone(identificador):
        try:
            telefone_normalizado = normalizar_telefone_angola(identificador)
        except ValueError:
            telefone_normalizado = None

    filtros = [Utilizador.email == identificador]
    if telefone_normalizado:
        filtros.append(Utilizador.numero_telefone.in_(variantes_telefone_angola(telefone_normalizado)))
    filtros.append(Utilizador.numero_telefone == dados.identificador)

    utilizador = db.query(Utilizador).filter(or_(*filtros)).first()

    if not utilizador or not verify_password(dados.senha, utilizador.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais invalidas",
        )

    if not utilizador.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada")

    utilizador.ultimo_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(utilizador.id), "tipo": utilizador.tipo_utilizador.value}

    return TokenSchema(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/verificar-codigo")
def verificar_codigo(dados: VerificarCodigoSchema, db: Session = Depends(get_db)):
    """Verificar codigo OTP de email ou telefone."""

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
        raise HTTPException(status_code=400, detail="Codigo invalido ou expirado")

    codigo.usado = True
    utilizador = db.query(Utilizador).filter(Utilizador.id == dados.utilizador_id).first()

    if dados.tipo == "email":
        utilizador.email_verificado = True
    elif dados.tipo == "telefone":
        utilizador.telefone_verificado = True

    db.commit()
    return {"mensagem": "Verificacao concluida com sucesso"}


@router.get("/me", response_model=UtilizadorResponseSchema)
def obter_utilizador_atual_endpoint(utilizador: Utilizador = Depends(get_utilizador_atual)):
    """Obter dados do utilizador autenticado pelo token JWT."""
    return utilizador


@router.post("/recuperar-senha")
def recuperar_senha(dados: RecuperarSenhaSchema, db: Session = Depends(get_db)):
    """Envia código OTP (imprime no terminal) para recuperação de senha."""
    identificador = dados.identificador.strip().lower()
    telefone_normalizado = None

    if parece_telefone(identificador):
        try:
            telefone_normalizado = normalizar_telefone_angola(identificador)
        except ValueError:
            telefone_normalizado = None

    filtros = [Utilizador.email == identificador]
    if telefone_normalizado:
        filtros.append(Utilizador.numero_telefone.in_(variantes_telefone_angola(telefone_normalizado)))
    filtros.append(Utilizador.numero_telefone == dados.identificador)

    utilizador = db.query(Utilizador).filter(or_(*filtros)).first()

    if not utilizador:
        # Por questoes de segurança, retornamos sucesso sempre.
        return {"mensagem": "Se a conta existir, foi enviado um código de recuperação."}

    codigo_otp = gerar_codigo_otp()
    
    # Invalida codigos de reset anteriores
    db.query(CodigoVerificacao).filter(
        CodigoVerificacao.utilizador_id == utilizador.id,
        CodigoVerificacao.tipo == "reset_senha"
    ).update({"usado": True})

    db.add(CodigoVerificacao(
        utilizador_id=utilizador.id,
        codigo=codigo_otp,
        tipo="reset_senha",
        expira_em=datetime.utcnow() + timedelta(minutes=30),
    ))
    db.commit()

    # Enviar email se o identificador for um email
    if "@" in utilizador.email:
        sucesso_email = enviar_otp_recuperacao(utilizador.email, codigo_otp)
        if sucesso_email:
            print(f"\n[EMAIL ENVIADO] Código OTP {codigo_otp} para {utilizador.email}\n")
        else:
            print(f"\n[FALLBACK TERMINAL] Código de recuperação (OTP) gerado: {codigo_otp}")
            print("Configure o servidor SMTP no ficheiro .env para enviar e-mails reais.\n")
    else:
        print(f"\n[TERMINAL] SMS Simulator - OTP: {codigo_otp}\n")

    return {"mensagem": "Se a conta existir, foi enviado um código de recuperação."}


@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefinirSenhaSchema, db: Session = Depends(get_db)):
    """Redefine a senha através do código OTP."""
    identificador = dados.identificador.strip().lower()
    telefone_normalizado = None

    if parece_telefone(identificador):
        try:
            telefone_normalizado = normalizar_telefone_angola(identificador)
        except ValueError:
            pass

    filtros = [Utilizador.email == identificador]
    if telefone_normalizado:
        filtros.append(Utilizador.numero_telefone.in_(variantes_telefone_angola(telefone_normalizado)))
    filtros.append(Utilizador.numero_telefone == dados.identificador)

    utilizador = db.query(Utilizador).filter(or_(*filtros)).first()

    if not utilizador:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")

    codigo_db = (
        db.query(CodigoVerificacao)
        .filter(
            CodigoVerificacao.utilizador_id == utilizador.id,
            CodigoVerificacao.codigo == dados.codigo,
            CodigoVerificacao.tipo == "reset_senha",
            CodigoVerificacao.usado == False,
            CodigoVerificacao.expira_em > datetime.utcnow(),
        )
        .first()
    )

    if not codigo_db:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")

    # Atualiza a senha
    utilizador.senha_hash = hash_password(dados.nova_senha)
    codigo_db.usado = True
    db.commit()

    return {"mensagem": "Palavra-passe alterada com sucesso!"}


@router.put("/mudar-senha")
def mudar_senha(
    dados: MudarSenhaSchema,
    utilizador: Utilizador = Depends(get_utilizador_atual),
    db: Session = Depends(get_db)
):
    """Muda a palavra-passe do utilizador autenticado."""
    if not verify_password(dados.senha_atual, utilizador.senha_hash):
        raise HTTPException(status_code=400, detail="A palavra-passe atual está incorreta")

    utilizador.senha_hash = hash_password(dados.nova_senha)
    db.commit()

    return {"mensagem": "Palavra-passe alterada com sucesso!"}
