"""
Schemas Pydantic - Validação de dados de entrada e saída da API.
"""

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import date, datetime
from app.core.phone import normalizar_telefone_angola
from app.models.models import (
    GeneroEnum, TipoUtilizadorEnum, TipoVendedorEnum,
    TipoLojaEnum, StatusVerificacaoEnum
)


# ─────────────────────── AUTENTICAÇÃO ───────────────────────

class RegistoBaseSchema(BaseModel):
    """Dados comuns para criar uma conta de acesso."""
    model_config = ConfigDict(str_strip_whitespace=True)

    nome_completo: str
    nome_utilizador: str
    email: EmailStr
    numero_telefone: str
    senha: str
    confirmar_senha: str
    data_nascimento: Optional[date] = None
    genero: Optional[GeneroEnum] = None
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None
    endereco_completo: Optional[str] = None
    nif: Optional[str] = None
    foto_perfil: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_minusculo(cls, v):
        return str(v).lower()

    @field_validator("numero_telefone")
    @classmethod
    def telefone_normalizado(cls, v):
        return normalizar_telefone_angola(v)

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v):
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        return v

    @model_validator(mode="after")
    def senhas_iguais(self):
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas não coincidem")
        return self


class RegistoCompradorSchema(RegistoBaseSchema):
    """Dados para registar um comprador."""
    pass


# Mantem compatibilidade com o nome usado anteriormente no endpoint.
RegistoComipradorSchema = RegistoCompradorSchema


class RegistoContaVendedorSchema(RegistoBaseSchema):
    """Dados para criar uma conta de vendedor individual."""
    numero_bi: str
    data_emissao: date
    data_validade: date
    nome_loja: Optional[str] = None
    descricao_loja: Optional[str] = None
    tipo_loja: TipoLojaEnum = TipoLojaEnum.produtos


class RegistoEmpresaSchema(BaseModel):
    """Dados para criar uma conta empresarial."""
    model_config = ConfigDict(str_strip_whitespace=True)

    nome_empresa: str
    nif: str
    tipo_empresa: Optional[str] = None
    categoria_principal: Optional[str] = None
    data_criacao: Optional[date] = None
    provincia: str
    municipio: str
    website: Optional[str] = None
    telefone: str
    email: EmailStr
    whatsapp: Optional[str] = None
    representante_nome: str
    representante_cargo: str
    representante_bi: str
    representante_nif: Optional[str] = None
    representante_telefone: Optional[str] = None
    representante_email: Optional[EmailStr] = None
    descricao: Optional[str] = None
    iban: Optional[str] = None
    titular_conta: Optional[str] = None
    numero_express: Optional[str] = None
    paypay_entidade: Optional[str] = None
    paypay_referencia: Optional[str] = None
    senha: str
    confirmar_senha: str
    nome_utilizador: Optional[str] = None
    tipo_loja: TipoLojaEnum = TipoLojaEnum.ambos

    @field_validator("email")
    @classmethod
    def email_empresa_minusculo(cls, v):
        return str(v).lower()

    @field_validator("representante_email")
    @classmethod
    def email_representante_minusculo(cls, v):
        return str(v).lower() if v else v

    @field_validator("telefone", "whatsapp", "representante_telefone")
    @classmethod
    def telefone_empresa_normalizado(cls, v):
        return normalizar_telefone_angola(v) if v else v

    @field_validator("senha")
    @classmethod
    def senha_empresa_minima(cls, v):
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        return v

    @model_validator(mode="after")
    def senhas_empresa_iguais(self):
        if self.senha != self.confirmar_senha:
            raise ValueError("As senhas nao coincidem")
        return self


class LoginSchema(BaseModel):
    """Login com email ou telefone."""
    model_config = ConfigDict(str_strip_whitespace=True)

    identificador: str  # email ou numero_telefone
    senha: str


class MudarSenhaSchema(BaseModel):
    senha_atual: str
    nova_senha: str

    @field_validator("nova_senha")
    @classmethod
    def nova_senha_minima(cls, v):
        if len(v) < 8:
            raise ValueError("A nova senha deve ter pelo menos 8 caracteres")
        return v


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VerificarCodigoSchema(BaseModel):
    utilizador_id: int
    codigo: str
    tipo: str  # "email", "telefone"


class UtilizadorUpdateSchema(BaseModel):
    nome_completo: Optional[str] = None
    numero_telefone: Optional[str] = None
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None


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
    numero_telefone: Optional[str] = None
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None
    foto_perfil: Optional[str] = None


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
    iban: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True

class PerfilVendedorUpdateSchema(BaseModel):
    nome_loja: Optional[str] = None
    descricao_loja: Optional[str] = None
    iban: Optional[str] = None


# ─────────────────────── PRODUTO ───────────────────────

class ProdutoCreateSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float
    preco_promocional: Optional[float] = None
    stock: int = 0
    categoria_id: Optional[int] = None
    sku: Optional[str] = None
    imagem: Optional[str] = None

    @field_validator("preco")
    @classmethod
    def preco_positivo(cls, v):
        if v <= 0:
            raise ValueError("O preço deve ser maior que zero")
        return v


class ImagemProdutoResponseSchema(BaseModel):
    id: int
    url: str
    principal: bool

    class Config:
        from_attributes = True

class ProdutoResponseSchema(ProdutoCreateSchema):
    id: int
    vendedor_id: int
    ativo: bool
    avaliacao_media: float
    criado_em: datetime
    imagens: list[ImagemProdutoResponseSchema] = []

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
    imagem: Optional[str] = None


class ImagemServicoResponseSchema(BaseModel):
    id: int
    url: str
    principal: bool

    class Config:
        from_attributes = True

class ServicoResponseSchema(ServicoCreateSchema):
    id: int
    vendedor_id: int
    ativo: bool
    avaliacao_media: float
    criado_em: datetime
    imagens: list[ImagemServicoResponseSchema] = []

    class Config:
        from_attributes = True

# ─────────────────────── PEDIDOS ───────────────────────

class PedidoItemCreateSchema(BaseModel):
    produto_id: int
    quantidade: int

class PedidoCreateSchema(BaseModel):
    itens: list[PedidoItemCreateSchema]
    endereco_entrega_provincia: Optional[str] = None
    endereco_entrega_municipio: Optional[str] = None
    endereco_entrega_bairro: Optional[str] = None
    notas: Optional[str] = None
    metodo_pagamento: str = "multicaixa"

class PedidoServicoCreateSchema(BaseModel):
    servico_id: int
    data_agendada: Optional[datetime] = None
    descricao_necessidade: Optional[str] = None
    metodo_pagamento: str = "multicaixa"

class PedidoStatusUpdateSchema(BaseModel):
    status: str # pendente, processando, enviado, entregue, cancelado

class PedidoServicoStatusUpdateSchema(BaseModel):
    status: str # pendente, em_andamento, concluido, cancelado


# ─────────────────────── LOCALIDADES ───────────────────────

class MunicipioResponseSchema(BaseModel):
    id: int
    provincia_id: int
    nome: str

    model_config = ConfigDict(from_attributes=True)


class ProvinciaResponseSchema(BaseModel):
    id: int
    nome: str

    model_config = ConfigDict(from_attributes=True)


class RecuperarSenhaSchema(BaseModel):
    identificador: str

class RedefinirSenhaSchema(BaseModel):
    identificador: str
    codigo: str
    nova_senha: str
    confirmar_senha: str

    @field_validator('nova_senha')
    @classmethod
    def senha_minima(cls, v):
        if len(v) < 8:
            raise ValueError('A senha deve ter pelo menos 8 caracteres')
        return v

    @model_validator(mode='after')
    def senhas_iguais(self):
        if self.nova_senha != self.confirmar_senha:
            raise ValueError('As senhas nao coincidem')
        return self


# ─────────────────────── NOTIFICAÇÕES ───────────────────────

class NotificacaoResponseSchema(BaseModel):
    id: int
    titulo: str
    mensagem: str
    lida: bool
    tipo: str
    criado_em: datetime

    class Config:
        from_attributes = True


# ─────────────────────── PEDIDO DE PROMOÇÃO ───────────────────────

class PedidoPromocaoCreateSchema(BaseModel):
    mensagem_solicitacao: Optional[str] = None

class PedidoPromocaoResponseSchema(BaseModel):
    id: int
    vendedor_id: int
    mensagem_solicitacao: Optional[str] = None
    status: str
    observacoes_admin: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
