"""
Modelos da base de dados - Kitanda Angola
Baseado nos requisitos definidos pela equipa.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, Date, Numeric
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# ─────────────────────────── ENUMS ───────────────────────────

class GeneroEnum(str, enum.Enum):
    masculino = "masculino"
    feminino = "feminino"
    outro = "outro"


class TipoUtilizadorEnum(str, enum.Enum):
    comprador = "comprador"
    vendedor = "vendedor"
    admin = "admin"


class TipoVendedorEnum(str, enum.Enum):
    individual = "individual"
    empresa = "empresa"


class TipoLojaEnum(str, enum.Enum):
    produtos = "produtos"
    servicos = "servicos"
    ambos = "ambos"


class StatusVerificacaoEnum(str, enum.Enum):
    pendente = "pendente"
    em_analise = "em_analise"
    aprovado = "aprovado"
    rejeitado = "rejeitado"


class StatusPedidoEnum(str, enum.Enum):
    pendente = "pendente"
    confirmado = "confirmado"
    em_processamento = "em_processamento"
    enviado = "enviado"
    entregue = "entregue"
    cancelado = "cancelado"
    reembolsado = "reembolsado"


class StatusPagamentoEnum(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    falhou = "falhou"
    reembolsado = "reembolsado"


class CategoriaStatusEnum(str, enum.Enum):
    ativo = "ativo"
    inativo = "inativo"


class StatusPedidoPromocaoEnum(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    rejeitado = "rejeitado"


class TipoNotificacaoEnum(str, enum.Enum):
    sistema = "sistema"
    pedido = "pedido"
    promocao = "promocao"
    mensagem = "mensagem"


# ─────────────────────────── LOCALIDADES ───────────────────────────

class Provincia(Base):
    """
    Províncias de Angola.
    """
    __tablename__ = "provincias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False)

    # Relacionamentos
    municipios = relationship("Municipio", back_populates="provincia", cascade="all, delete-orphan")


class Municipio(Base):
    """
    Municípios pertencentes às províncias.
    """
    __tablename__ = "municipios"

    id = Column(Integer, primary_key=True, index=True)
    provincia_id = Column(Integer, ForeignKey("provincias.id"), nullable=False)
    nome = Column(String(100), nullable=False)

    # Relacionamentos
    provincia = relationship("Provincia", back_populates="municipios")


# ─────────────────────────── UTILIZADOR ───────────────────────────

class Utilizador(Base):
    """
    Tabela principal de utilizadores.
    Serve tanto compradores como vendedores.
    """
    __tablename__ = "utilizadores"

    id = Column(Integer, primary_key=True, index=True)
    nome_completo = Column(String(200), nullable=False)
    nome_utilizador = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    numero_telefone = Column(String(20), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)

    # Dados pessoais
    data_nascimento = Column(Date, nullable=True)
    genero = Column(Enum(GeneroEnum), nullable=True)
    foto_perfil_url = Column(String(500), nullable=True)

    # Tipo e estado da conta
    tipo_utilizador = Column(Enum(TipoUtilizadorEnum), default=TipoUtilizadorEnum.comprador, nullable=False)
    ativo = Column(Boolean, default=True)
    email_verificado = Column(Boolean, default=False)
    telefone_verificado = Column(Boolean, default=False)

    # Timestamps
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ultimo_login = Column(DateTime, nullable=True)

    # Relacionamentos
    endereco = relationship("Endereco", back_populates="utilizador", uselist=False, cascade="all, delete-orphan")
    documento_bi = relationship("DocumentoBI", back_populates="utilizador", uselist=False, cascade="all, delete-orphan")
    perfil_vendedor = relationship("PerfilVendedor", back_populates="utilizador", uselist=False, cascade="all, delete-orphan")
    pedidos_comprador = relationship("Pedido", foreign_keys="Pedido.comprador_id", back_populates="comprador")
    avaliacoes_dadas = relationship("Avaliacao", foreign_keys="Avaliacao.avaliador_id", back_populates="avaliador")
    codigos_verificacao = relationship("CodigoVerificacao", back_populates="utilizador", cascade="all, delete-orphan")
    notificacoes = relationship("Notificacao", back_populates="utilizador", cascade="all, delete-orphan")


# ─────────────────────────── ENDEREÇO ───────────────────────────

class Endereco(Base):
    """
    Endereço do utilizador - campos específicos de Angola.
    """
    __tablename__ = "enderecos"

    id = Column(Integer, primary_key=True, index=True)
    utilizador_id = Column(Integer, ForeignKey("utilizadores.id"), unique=True, nullable=False)

    provincia = Column(String(100), nullable=False)  
    municipio = Column(String(100), nullable=False)   
    bairro = Column(String(150), nullable=True)
    endereco_completo = Column(Text, nullable=True)   
    nif = Column(String(20), nullable=True, unique=True) 

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    utilizador = relationship("Utilizador", back_populates="endereco")


# ─────────────────────────── DOCUMENTO BI ───────────────────────────

class DocumentoBI(Base):
    """
    BI angolano para verificação KYC.
    """
    __tablename__ = "documentos_bi"

    id = Column(Integer, primary_key=True, index=True)
    utilizador_id = Column(Integer, ForeignKey("utilizadores.id"), unique=True, nullable=False)

    numero_bi = Column(String(30), unique=True, nullable=False)
    data_emissao = Column(Date, nullable=False)
    data_validade = Column(Date, nullable=False)
    foto_bi_frente_url = Column(String(500), nullable=True)
    selfie_verificacao_url = Column(String(500), nullable=True)

    status_verificacao = Column(Enum(StatusVerificacaoEnum), default=StatusVerificacaoEnum.pendente)
    observacao_rejeicao = Column(Text, nullable=True)  # motivo se rejeitado

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    utilizador = relationship("Utilizador", back_populates="documento_bi")


# ─────────────────────────── VERIFICAÇÃO (OTP) ───────────────────────────

class CodigoVerificacao(Base):
    """
    Códigos OTP para verificação de email/telefone e reset de senha.
    """
    __tablename__ = "codigos_verificacao"

    id = Column(Integer, primary_key=True, index=True)
    utilizador_id = Column(Integer, ForeignKey("utilizadores.id"), nullable=False)
    codigo = Column(String(10), nullable=False)
    tipo = Column(String(30), nullable=False)  # "email", "telefone", "reset_senha"
    expira_em = Column(DateTime, nullable=False)
    usado = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    utilizador = relationship("Utilizador", back_populates="codigos_verificacao")


# ─────────────────────────── PERFIL VENDEDOR ───────────────────────────

class PerfilVendedor(Base):
    """
    Perfil do vendedor com loja virtual.
    Um utilizador pode ser comprador e vendedor ao mesmo tempo.
    """
    __tablename__ = "perfis_vendedor"

    id = Column(Integer, primary_key=True, index=True)
    utilizador_id = Column(Integer, ForeignKey("utilizadores.id"), unique=True, nullable=False)

    # Dados da loja
    nome_loja = Column(String(150), unique=True, nullable=False, index=True)
    descricao_loja = Column(Text, nullable=True)
    logo_loja_url = Column(String(500), nullable=True)
    banner_loja_url = Column(String(500), nullable=True)

    # Tipo de vendedor e o que vende
    tipo_vendedor = Column(Enum(TipoVendedorEnum), default=TipoVendedorEnum.individual)
    tipo_loja = Column(Enum(TipoLojaEnum), default=TipoLojaEnum.produtos)

    # Estado e verificação
    verificado = Column(Boolean, default=False)
    ativo = Column(Boolean, default=True)
    avaliacao_media = Column(Float, default=0.0)
    total_vendas = Column(Integer, default=0)
    iban = Column(String(50), nullable=True)

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    utilizador = relationship("Utilizador", back_populates="perfil_vendedor")
    produtos = relationship("Produto", back_populates="vendedor", cascade="all, delete-orphan")
    servicos = relationship("Servico", back_populates="vendedor", cascade="all, delete-orphan")
    avaliacoes_recebidas = relationship("Avaliacao", foreign_keys="Avaliacao.vendedor_id", back_populates="vendedor")
    pedidos_promocao = relationship("PedidoPromocao", back_populates="vendedor", cascade="all, delete-orphan")


# ─────────────────────────── CATEGORIAS ───────────────────────────

class Categoria(Base):
    """
    Categorias hierárquicas para produtos e serviços.
    """
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    icone_url = Column(String(500), nullable=True)
    categoria_pai_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)  # subcategorias
    tipo = Column(String(20), default="produto")  # "produto" ou "servico"
    status = Column(Enum(CategoriaStatusEnum), default=CategoriaStatusEnum.ativo)
    ordem = Column(Integer, default=0)

    # Relacionamentos
    subcategorias = relationship("Categoria", backref="categoria_pai", remote_side=[id])
    produtos = relationship("Produto", back_populates="categoria")
    servicos = relationship("Servico", back_populates="categoria")


# ─────────────────────────── PRODUTO ───────────────────────────

class Produto(Base):
    """
    Produtos físicos ou digitais vendidos na plataforma.
    """
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("perfis_vendedor.id"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)

    nome = Column(String(200), nullable=False, index=True)
    descricao = Column(Text, nullable=True)
    preco = Column(Numeric(12, 2), nullable=False)  # em Kwanzas (AOA)
    preco_promocional = Column(Numeric(12, 2), nullable=True)
    stock = Column(Integer, default=0)
    sku = Column(String(100), nullable=True, unique=True)  # código interno

    ativo = Column(Boolean, default=True)
    destaque = Column(Boolean, default=False)
    avaliacao_media = Column(Float, default=0.0)
    total_avaliacoes = Column(Integer, default=0)

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    vendedor = relationship("PerfilVendedor", back_populates="produtos")
    categoria = relationship("Categoria", back_populates="produtos")
    imagens = relationship("ImagemProduto", back_populates="produto", cascade="all, delete-orphan")
    itens_pedido = relationship("ItemPedido", back_populates="produto")


class ImagemProduto(Base):
    __tablename__ = "imagens_produto"

    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    url = Column(String(500), nullable=False)
    principal = Column(Boolean, default=False)
    ordem = Column(Integer, default=0)

    produto = relationship("Produto", back_populates="imagens")


# ─────────────────────────── SERVIÇO ───────────────────────────

class Servico(Base):
    """
    Serviços prestados por vendedores individuais ou empresas.
    """
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("perfis_vendedor.id"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)

    nome = Column(String(200), nullable=False, index=True)
    descricao = Column(Text, nullable=True)
    preco_base = Column(Numeric(12, 2), nullable=False)  # preço a partir de...
    duracao_estimada = Column(String(100), nullable=True)  # ex: "2 horas", "1 dia"
    disponivel_online = Column(Boolean, default=False)
    disponivel_presencial = Column(Boolean, default=True)

    ativo = Column(Boolean, default=True)
    destaque = Column(Boolean, default=False)
    avaliacao_media = Column(Float, default=0.0)
    total_avaliacoes = Column(Integer, default=0)

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    vendedor = relationship("PerfilVendedor", back_populates="servicos")
    categoria = relationship("Categoria", back_populates="servicos")
    imagens = relationship("ImagemServico", back_populates="servico", cascade="all, delete-orphan")
    pedidos_servico = relationship("PedidoServico", back_populates="servico")


class ImagemServico(Base):
    __tablename__ = "imagens_servico"

    id = Column(Integer, primary_key=True, index=True)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)
    url = Column(String(500), nullable=False)
    principal = Column(Boolean, default=False)

    servico = relationship("Servico", back_populates="imagens")


# ─────────────────────────── PEDIDO (PRODUTO) ───────────────────────────

class Pedido(Base):
    """
    Pedido de compra de produtos.
    """
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    comprador_id = Column(Integer, ForeignKey("utilizadores.id"), nullable=False)
    numero_pedido = Column(String(50), unique=True, nullable=False)  # ex: AO-2024-00001

    status = Column(Enum(StatusPedidoEnum), default=StatusPedidoEnum.pendente)
    status_pagamento = Column(Enum(StatusPagamentoEnum), default=StatusPagamentoEnum.pendente)

    valor_subtotal = Column(Numeric(12, 2), nullable=False)
    valor_entrega = Column(Numeric(12, 2), default=0)
    valor_total = Column(Numeric(12, 2), nullable=False)
    moeda = Column(String(5), default="AOA")  # Kwanza angolano

    # Endereço de entrega (cópia no momento do pedido)
    endereco_entrega_provincia = Column(String(100), nullable=True)
    endereco_entrega_municipio = Column(String(100), nullable=True)
    endereco_entrega_bairro = Column(String(150), nullable=True)
    endereco_entrega_completo = Column(Text, nullable=True)

    notas = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    comprador = relationship("Utilizador", foreign_keys=[comprador_id], back_populates="pedidos_comprador")
    itens = relationship("ItemPedido", back_populates="pedido", cascade="all, delete-orphan")
    pagamento = relationship("Pagamento", back_populates="pedido", uselist=False)


class ItemPedido(Base):
    __tablename__ = "itens_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("perfis_vendedor.id"), nullable=False)

    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Numeric(12, 2), nullable=False)  # preço no momento da compra
    subtotal = Column(Numeric(12, 2), nullable=False)

    pedido = relationship("Pedido", back_populates="itens")
    produto = relationship("Produto", back_populates="itens_pedido")


# ─────────────────────────── PEDIDO SERVIÇO ───────────────────────────

class PedidoServico(Base):
    """
    Contratação de serviços.
    """
    __tablename__ = "pedidos_servico"

    id = Column(Integer, primary_key=True, index=True)
    comprador_id = Column(Integer, ForeignKey("utilizadores.id"), nullable=False)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)
    numero_pedido = Column(String(50), unique=True, nullable=False)

    status = Column(Enum(StatusPedidoEnum), default=StatusPedidoEnum.pendente)
    status_pagamento = Column(Enum(StatusPagamentoEnum), default=StatusPagamentoEnum.pendente)

    data_agendada = Column(DateTime, nullable=True)
    descricao_necessidade = Column(Text, nullable=True)
    valor_acordado = Column(Numeric(12, 2), nullable=True)
    moeda = Column(String(5), default="AOA")

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    comprador = relationship("Utilizador")
    servico = relationship("Servico", back_populates="pedidos_servico")
    pagamento = relationship("PagamentoServico", back_populates="pedido_servico", uselist=False)


# ─────────────────────────── PAGAMENTO ───────────────────────────

class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), unique=True, nullable=False)
    metodo = Column(String(50), nullable=False)  # "multicaixa", "express", "transferencia"
    referencia_externa = Column(String(200), nullable=True)
    valor = Column(Numeric(12, 2), nullable=False)
    moeda = Column(String(5), default="AOA")
    status = Column(Enum(StatusPagamentoEnum), default=StatusPagamentoEnum.pendente)
    comprovativo_url = Column(String(500), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    pago_em = Column(DateTime, nullable=True)

    pedido = relationship("Pedido", back_populates="pagamento")


class PagamentoServico(Base):
    __tablename__ = "pagamentos_servico"

    id = Column(Integer, primary_key=True, index=True)
    pedido_servico_id = Column(Integer, ForeignKey("pedidos_servico.id"), unique=True, nullable=False)
    metodo = Column(String(50), nullable=False)
    referencia_externa = Column(String(200), nullable=True)
    valor = Column(Numeric(12, 2), nullable=False)
    moeda = Column(String(5), default="AOA")
    status = Column(Enum(StatusPagamentoEnum), default=StatusPagamentoEnum.pendente)
    comprovativo_url = Column(String(500), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    pago_em = Column(DateTime, nullable=True)

    pedido_servico = relationship("PedidoServico", back_populates="pagamento")


# ─────────────────────────── AVALIAÇÃO ───────────────────────────

class Avaliacao(Base):
    """
    Avaliações feitas por compradores a vendedores.
    """
    __tablename__ = "avaliacoes"

    id = Column(Integer, primary_key=True, index=True)
    avaliador_id = Column(Integer, ForeignKey("utilizadores.id"), nullable=False)
    vendedor_id = Column(Integer, ForeignKey("perfis_vendedor.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=True)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=True)

    nota = Column(Integer, nullable=False)  # 1 a 5
    comentario = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    avaliador = relationship("Utilizador", foreign_keys=[avaliador_id], back_populates="avaliacoes_dadas")
    vendedor = relationship("PerfilVendedor", foreign_keys=[vendedor_id], back_populates="avaliacoes_recebidas")


# ─────────────────────────── NOTIFICAÇÕES ───────────────────────────

class Notificacao(Base):
    """
    Notificações do sistema para os utilizadores.
    """
    __tablename__ = "notificacoes"

    id = Column(Integer, primary_key=True, index=True)
    utilizador_id = Column(Integer, ForeignKey("utilizadores.id"), nullable=False)
    
    titulo = Column(String(150), nullable=False)
    mensagem = Column(Text, nullable=False)
    lida = Column(Boolean, default=False)
    tipo = Column(Enum(TipoNotificacaoEnum), default=TipoNotificacaoEnum.sistema)
    
    criado_em = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    utilizador = relationship("Utilizador", back_populates="notificacoes")


# ─────────────────────────── PEDIDO DE PROMOÇÃO ───────────────────────────

class PedidoPromocao(Base):
    """
    Pedidos feitos por vendedores para promoverem a sua loja.
    """
    __tablename__ = "pedidos_promocao"

    id = Column(Integer, primary_key=True, index=True)
    vendedor_id = Column(Integer, ForeignKey("perfis_vendedor.id"), nullable=False)
    
    mensagem_solicitacao = Column(Text, nullable=True)
    status = Column(Enum(StatusPedidoPromocaoEnum), default=StatusPedidoPromocaoEnum.pendente)
    observacoes_admin = Column(Text, nullable=True)
    
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    vendedor = relationship("PerfilVendedor", back_populates="pedidos_promocao")
