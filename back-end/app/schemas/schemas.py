"""
Schemas Pydantic - Validação de dados de entrada e saída da API.
"""

from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import date, datetime
from app.core.phone import normalizar_telefone_angola
from app.models.models import (
    GeneroEnum, TipoUtilizadorEnum, TipoVendedorEnum,
    TipoLojaEnum, StatusVerificacaoEnum
)


# ─────────────────────── AUTENTICAÇÃO ───────────────────────

class RegistoComipradorSchema(BaseModel):
    """Dados para registar um comprador."""
    nome_completo: str
    nome_utilizador: str
    email: EmailStr
    numero_telefone: str
    senha: str
    confirmar_senha: str
    data_nascimento: Optional[date] = None
    genero: Optional[GeneroEnum] = None

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v):
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        return v

    @field_validator("email")
    @classmethod
    def email_minusculo(cls, v):
        return str(v).lower()

    @field_validator("numero_telefone")
    @classmethod
    def telefone_normalizado(cls, v):
        return normalizar_telefone_angola(v)

    @model_validator(mode="after")
    def senhas_iguais(self):
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas não coincidem")
        return self


class LoginSchema(BaseModel):
    """Login com email ou telefone."""
    identificador: str  # email ou numero_telefone
    senha: str


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VerificarCodigoSchema(BaseModel):
    utilizador_id: int
    codigo: str
    tipo: str  # "email", "telefone"


# ─────────────────────── ENDEREÇO ───────────────────────

class EnderecoBaseSchema(BaseModel):
    provincia: str
    municipio: str
    bairro: Optional[str] = None
    endereco_completo: Optional[str] = None
    nif: Optional[str] = None


class EnderecoCreateSchema(EnderecoBaseSchema):
    pass


class EnderecoResponseSchema(EnderecoBaseSchema):
    id: int
    criado_em: datetime

    class Config:
        from_attributes = True


# ─────────────────────── DOCUMENTO BI ───────────────────────

class DocumentoBICreateSchema(BaseModel):
    numero_bi: str
    data_emissao: date
    data_validade: date


class DocumentoBIResponseSchema(DocumentoBICreateSchema):
    id: int
    status_verificacao: StatusVerificacaoEnum
    foto_bi_frente_url: Optional[str] = None
    selfie_verificacao_url: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────── UTILIZADOR ───────────────────────

class UtilizadorResponseSchema(BaseModel):
    id: int
    nome_completo: str
    nome_utilizador: str
    email: str
    numero_telefone: str
    tipo_utilizador: TipoUtilizadorEnum
    foto_perfil_url: Optional[str] = None
    email_verificado: bool
    telefone_verificado: bool
    ativo: bool
    criado_em: datetime
    endereco: Optional[EnderecoResponseSchema] = None

    class Config:
        from_attributes = True


class UtilizadorUpdateSchema(BaseModel):
    nome_completo: Optional[str] = None
    data_nascimento: Optional[date] = None
    genero: Optional[GeneroEnum] = None


# ─────────────────────── VENDEDOR ───────────────────────

class RegistoVendedorSchema(BaseModel):
    """Dados para criar perfil de vendedor."""
    nome_loja: str
    descricao_loja: Optional[str] = None
    tipo_vendedor: TipoVendedorEnum = TipoVendedorEnum.individual
    tipo_loja: TipoLojaEnum = TipoLojaEnum.produtos


class PerfilVendedorResponseSchema(BaseModel):
    id: int
    nome_loja: str
    descricao_loja: Optional[str] = None
    logo_loja_url: Optional[str] = None
    tipo_vendedor: TipoVendedorEnum
    tipo_loja: TipoLojaEnum
    verificado: bool
    avaliacao_media: float
    total_vendas: int
    criado_em: datetime

    class Config:
        from_attributes = True


# ─────────────────────── PRODUTO ───────────────────────

class ProdutoCreateSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float
    preco_promocional: Optional[float] = None
    stock: int = 0
    categoria_id: Optional[int] = None
    sku: Optional[str] = None

    @field_validator("preco")
    @classmethod
    def preco_positivo(cls, v):
        if v <= 0:
            raise ValueError("O preço deve ser maior que zero")
        return v


class ProdutoResponseSchema(ProdutoCreateSchema):
    id: int
    vendedor_id: int
    ativo: bool
    avaliacao_media: float
    criado_em: datetime

    class Config:
        from_attributes = True


# ─────────────────────── SERVIÇO ───────────────────────

class ServicoCreateSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco_base: float
    duracao_estimada: Optional[str] = None
    disponivel_online: bool = False
    disponivel_presencial: bool = True
    categoria_id: Optional[int] = None


class ServicoResponseSchema(ServicoCreateSchema):
    id: int
    vendedor_id: int
    ativo: bool
    avaliacao_media: float
    criado_em: datetime

    class Config:
        from_attributes = True
