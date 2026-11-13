BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> a98e3f5c908a

CREATE TYPE categoriastatusenum AS ENUM ('ativo', 'inativo');

CREATE TABLE categorias (
    id SERIAL NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    icone_url VARCHAR(500),
    categoria_pai_id INTEGER,
    tipo VARCHAR(20),
    status categoriastatusenum,
    ordem INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY(categoria_pai_id) REFERENCES categorias (id)
);

CREATE INDEX ix_categorias_id ON categorias (id);

CREATE TYPE generoenum AS ENUM ('masculino', 'feminino', 'outro');

CREATE TYPE tipoutilizadorenum AS ENUM ('comprador', 'vendedor', 'admin');

CREATE TABLE utilizadores (
    id SERIAL NOT NULL,
    nome_completo VARCHAR(200) NOT NULL,
    nome_utilizador VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    numero_telefone VARCHAR(20) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    data_nascimento DATE,
    genero generoenum,
    foto_perfil_url VARCHAR(500),
    tipo_utilizador tipoutilizadorenum NOT NULL,
    ativo BOOLEAN,
    email_verificado BOOLEAN,
    telefone_verificado BOOLEAN,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    ultimo_login TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    UNIQUE (numero_telefone)
);

CREATE UNIQUE INDEX ix_utilizadores_email ON utilizadores (email);

CREATE INDEX ix_utilizadores_id ON utilizadores (id);

CREATE UNIQUE INDEX ix_utilizadores_nome_utilizador ON utilizadores (nome_utilizador);

CREATE TABLE codigos_verificacao (
    id SERIAL NOT NULL,
    utilizador_id INTEGER NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    expira_em TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    usado BOOLEAN,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(utilizador_id) REFERENCES utilizadores (id)
);

CREATE INDEX ix_codigos_verificacao_id ON codigos_verificacao (id);

CREATE TYPE statusverificacaoenum AS ENUM ('pendente', 'em_analise', 'aprovado', 'rejeitado');

CREATE TABLE documentos_bi (
    id SERIAL NOT NULL,
    utilizador_id INTEGER NOT NULL,
    numero_bi VARCHAR(30) NOT NULL,
    data_emissao DATE NOT NULL,
    data_validade DATE NOT NULL,
    foto_bi_frente_url VARCHAR(500),
    selfie_verificacao_url VARCHAR(500),
    status_verificacao statusverificacaoenum,
    observacao_rejeicao TEXT,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(utilizador_id) REFERENCES utilizadores (id),
    UNIQUE (numero_bi),
    UNIQUE (utilizador_id)
);

CREATE INDEX ix_documentos_bi_id ON documentos_bi (id);

CREATE TABLE enderecos (
    id SERIAL NOT NULL,
    utilizador_id INTEGER NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    bairro VARCHAR(150),
    endereco_completo TEXT,
    nif VARCHAR(20),
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(utilizador_id) REFERENCES utilizadores (id),
    UNIQUE (nif),
    UNIQUE (utilizador_id)
);

CREATE INDEX ix_enderecos_id ON enderecos (id);

CREATE TYPE statuspedidoenum AS ENUM ('pendente', 'confirmado', 'em_processamento', 'enviado', 'entregue', 'cancelado', 'reembolsado');

CREATE TYPE statuspagamentoenum AS ENUM ('pendente', 'pago', 'falhou', 'reembolsado');

CREATE TABLE pedidos (
    id SERIAL NOT NULL,
    comprador_id INTEGER NOT NULL,
    numero_pedido VARCHAR(50) NOT NULL,
    status statuspedidoenum,
    status_pagamento statuspagamentoenum,
    valor_subtotal NUMERIC(12, 2) NOT NULL,
    valor_entrega NUMERIC(12, 2),
    valor_total NUMERIC(12, 2) NOT NULL,
    moeda VARCHAR(5),
    endereco_entrega_provincia VARCHAR(100),
    endereco_entrega_municipio VARCHAR(100),
    endereco_entrega_bairro VARCHAR(150),
    endereco_entrega_completo TEXT,
    notas TEXT,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(comprador_id) REFERENCES utilizadores (id),
    UNIQUE (numero_pedido)
);

CREATE INDEX ix_pedidos_id ON pedidos (id);

CREATE TYPE tipovendedorenum AS ENUM ('individual', 'empresa');

CREATE TYPE tipolojaenum AS ENUM ('produtos', 'servicos', 'ambos');

CREATE TABLE perfis_vendedor (
    id SERIAL NOT NULL,
    utilizador_id INTEGER NOT NULL,
    nome_loja VARCHAR(150) NOT NULL,
    descricao_loja TEXT,
    logo_loja_url VARCHAR(500),
    banner_loja_url VARCHAR(500),
    tipo_vendedor tipovendedorenum,
    tipo_loja tipolojaenum,
    verificado BOOLEAN,
    ativo BOOLEAN,
    avaliacao_media FLOAT,
    total_vendas INTEGER,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(utilizador_id) REFERENCES utilizadores (id),
    UNIQUE (utilizador_id)
);

CREATE INDEX ix_perfis_vendedor_id ON perfis_vendedor (id);

CREATE UNIQUE INDEX ix_perfis_vendedor_nome_loja ON perfis_vendedor (nome_loja);

CREATE TABLE pagamentos (
    id SERIAL NOT NULL,
    pedido_id INTEGER NOT NULL,
    metodo VARCHAR(50) NOT NULL,
    referencia_externa VARCHAR(200),
    valor NUMERIC(12, 2) NOT NULL,
    moeda VARCHAR(5),
    status statuspagamentoenum,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    pago_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(pedido_id) REFERENCES pedidos (id),
    UNIQUE (pedido_id)
);

CREATE INDEX ix_pagamentos_id ON pagamentos (id);

CREATE TABLE produtos (
    id SERIAL NOT NULL,
    vendedor_id INTEGER NOT NULL,
    categoria_id INTEGER,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    preco NUMERIC(12, 2) NOT NULL,
    preco_promocional NUMERIC(12, 2),
    stock INTEGER,
    sku VARCHAR(100),
    ativo BOOLEAN,
    destaque BOOLEAN,
    avaliacao_media FLOAT,
    total_avaliacoes INTEGER,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(categoria_id) REFERENCES categorias (id),
    FOREIGN KEY(vendedor_id) REFERENCES perfis_vendedor (id),
    UNIQUE (sku)
);

CREATE INDEX ix_produtos_id ON produtos (id);

CREATE INDEX ix_produtos_nome ON produtos (nome);

CREATE TABLE servicos (
    id SERIAL NOT NULL,
    vendedor_id INTEGER NOT NULL,
    categoria_id INTEGER,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    preco_base NUMERIC(12, 2) NOT NULL,
    duracao_estimada VARCHAR(100),
    disponivel_online BOOLEAN,
    disponivel_presencial BOOLEAN,
    ativo BOOLEAN,
    destaque BOOLEAN,
    avaliacao_media FLOAT,
    total_avaliacoes INTEGER,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(categoria_id) REFERENCES categorias (id),
    FOREIGN KEY(vendedor_id) REFERENCES perfis_vendedor (id)
);

CREATE INDEX ix_servicos_id ON servicos (id);

CREATE INDEX ix_servicos_nome ON servicos (nome);

CREATE TABLE avaliacoes (
    id SERIAL NOT NULL,
    avaliador_id INTEGER NOT NULL,
    vendedor_id INTEGER NOT NULL,
    produto_id INTEGER,
    servico_id INTEGER,
    nota INTEGER NOT NULL,
    comentario TEXT,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(avaliador_id) REFERENCES utilizadores (id),
    FOREIGN KEY(produto_id) REFERENCES produtos (id),
    FOREIGN KEY(servico_id) REFERENCES servicos (id),
    FOREIGN KEY(vendedor_id) REFERENCES perfis_vendedor (id)
);

CREATE INDEX ix_avaliacoes_id ON avaliacoes (id);

CREATE TABLE imagens_produto (
    id SERIAL NOT NULL,
    produto_id INTEGER NOT NULL,
    url VARCHAR(500) NOT NULL,
    principal BOOLEAN,
    ordem INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY(produto_id) REFERENCES produtos (id)
);

CREATE INDEX ix_imagens_produto_id ON imagens_produto (id);

CREATE TABLE imagens_servico (
    id SERIAL NOT NULL,
    servico_id INTEGER NOT NULL,
    url VARCHAR(500) NOT NULL,
    principal BOOLEAN,
    PRIMARY KEY (id),
    FOREIGN KEY(servico_id) REFERENCES servicos (id)
);

CREATE INDEX ix_imagens_servico_id ON imagens_servico (id);

CREATE TABLE itens_pedido (
    id SERIAL NOT NULL,
    pedido_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    vendedor_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(pedido_id) REFERENCES pedidos (id),
    FOREIGN KEY(produto_id) REFERENCES produtos (id),
    FOREIGN KEY(vendedor_id) REFERENCES perfis_vendedor (id)
);

CREATE INDEX ix_itens_pedido_id ON itens_pedido (id);

CREATE TABLE pedidos_servico (
    id SERIAL NOT NULL,
    comprador_id INTEGER NOT NULL,
    servico_id INTEGER NOT NULL,
    numero_pedido VARCHAR(50) NOT NULL,
    status statuspedidoenum,
    status_pagamento statuspagamentoenum,
    data_agendada TIMESTAMP WITHOUT TIME ZONE,
    descricao_necessidade TEXT,
    valor_acordado NUMERIC(12, 2),
    moeda VARCHAR(5),
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(comprador_id) REFERENCES utilizadores (id),
    FOREIGN KEY(servico_id) REFERENCES servicos (id),
    UNIQUE (numero_pedido)
);

CREATE INDEX ix_pedidos_servico_id ON pedidos_servico (id);

CREATE TABLE pagamentos_servico (
    id SERIAL NOT NULL,
    pedido_servico_id INTEGER NOT NULL,
    metodo VARCHAR(50) NOT NULL,
    referencia_externa VARCHAR(200),
    valor NUMERIC(12, 2) NOT NULL,
    moeda VARCHAR(5),
    status statuspagamentoenum,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    pago_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(pedido_servico_id) REFERENCES pedidos_servico (id),
    UNIQUE (pedido_servico_id)
);

CREATE INDEX ix_pagamentos_servico_id ON pagamentos_servico (id);

INSERT INTO alembic_version (version_num) VALUES ('a98e3f5c908a') RETURNING alembic_version.version_num;

-- Running upgrade a98e3f5c908a -> 0f6548bca26e

CREATE TABLE provincias (
    id SERIAL NOT NULL,
    nome VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (nome)
);

CREATE INDEX ix_provincias_id ON provincias (id);

CREATE TABLE municipios (
    id SERIAL NOT NULL,
    provincia_id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(provincia_id) REFERENCES provincias (id)
);

CREATE INDEX ix_municipios_id ON municipios (id);

UPDATE alembic_version SET version_num='0f6548bca26e' WHERE alembic_version.version_num = 'a98e3f5c908a';

-- Running upgrade 0f6548bca26e -> ea0523db86ad

ALTER TABLE pagamentos ADD COLUMN comprovativo_url VARCHAR(500);

ALTER TABLE pagamentos_servico ADD COLUMN comprovativo_url VARCHAR(500);

ALTER TABLE perfis_vendedor ADD COLUMN iban VARCHAR(50);

UPDATE alembic_version SET version_num='ea0523db86ad' WHERE alembic_version.version_num = '0f6548bca26e';

-- Running upgrade ea0523db86ad -> 323fce88fcab

CREATE TYPE tiponotificacaoenum AS ENUM ('sistema', 'pedido', 'promocao', 'mensagem');

CREATE TABLE notificacoes (
    id SERIAL NOT NULL,
    utilizador_id INTEGER NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN,
    tipo tiponotificacaoenum,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(utilizador_id) REFERENCES utilizadores (id)
);

CREATE INDEX ix_notificacoes_id ON notificacoes (id);

CREATE TYPE statuspedidopromocaoenum AS ENUM ('pendente', 'aprovado', 'rejeitado');

CREATE TABLE pedidos_promocao (
    id SERIAL NOT NULL,
    vendedor_id INTEGER NOT NULL,
    mensagem_solicitacao TEXT,
    status statuspedidopromocaoenum,
    observacoes_admin TEXT,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(vendedor_id) REFERENCES perfis_vendedor (id)
);

CREATE INDEX ix_pedidos_promocao_id ON pedidos_promocao (id);

UPDATE alembic_version SET version_num='323fce88fcab' WHERE alembic_version.version_num = 'ea0523db86ad';

-- Running upgrade 323fce88fcab -> 3a474861868f

UPDATE alembic_version SET version_num='3a474861868f' WHERE alembic_version.version_num = '323fce88fcab';

-- Running upgrade 3a474861868f -> def0664d357e

CREATE TYPE finalidadeimovelenum AS ENUM ('venda', 'aluguer');

CREATE TYPE tipoimovelenum AS ENUM ('apartamento', 'moradia', 'terreno', 'loja', 'escritorio', 'armazem', 'outro');

CREATE TABLE imoveis (
    id SERIAL NOT NULL,
    vendedor_id INTEGER NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    preco NUMERIC(15, 2) NOT NULL,
    moeda VARCHAR(5),
    finalidade finalidadeimovelenum,
    tipo_imovel tipoimovelenum NOT NULL,
    tipologia VARCHAR(50),
    quartos INTEGER,
    casas_de_banho INTEGER,
    area_m2 FLOAT,
    provincia VARCHAR(100),
    municipio VARCHAR(100),
    bairro VARCHAR(150),
    endereco_completo TEXT,
    latitude FLOAT,
    longitude FLOAT,
    ativo BOOLEAN,
    destaque BOOLEAN,
    avaliacao_media FLOAT,
    total_avaliacoes INTEGER,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(vendedor_id) REFERENCES perfis_vendedor (id)
);

CREATE INDEX ix_imoveis_id ON imoveis (id);

CREATE INDEX ix_imoveis_titulo ON imoveis (titulo);

CREATE TABLE imagens_imovel (
    id SERIAL NOT NULL,
    imovel_id INTEGER NOT NULL,
    url VARCHAR(500) NOT NULL,
    principal BOOLEAN,
    ordem INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY(imovel_id) REFERENCES imoveis (id)
);

CREATE INDEX ix_imagens_imovel_id ON imagens_imovel (id);

CREATE TYPE statuspropostaimovelenum AS ENUM ('pendente', 'em_negociacao', 'aceita', 'rejeitada', 'concluida');

CREATE TABLE propostas_imovel (
    id SERIAL NOT NULL,
    imovel_id INTEGER NOT NULL,
    comprador_id INTEGER NOT NULL,
    mensagem TEXT NOT NULL,
    valor_proposto NUMERIC(15, 2),
    status statuspropostaimovelenum,
    criado_em TIMESTAMP WITHOUT TIME ZONE,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(comprador_id) REFERENCES utilizadores (id),
    FOREIGN KEY(imovel_id) REFERENCES imoveis (id)
);

CREATE INDEX ix_propostas_imovel_id ON propostas_imovel (id);

UPDATE alembic_version SET version_num='def0664d357e' WHERE alembic_version.version_num = '3a474861868f';

-- Running upgrade def0664d357e -> f41c90a62e07

ALTER TYPE tipolojaenum ADD VALUE IF NOT EXISTS 'imobiliaria' BEFORE 'ambos';

UPDATE alembic_version SET version_num='f41c90a62e07' WHERE alembic_version.version_num = 'def0664d357e';

-- Running upgrade f41c90a62e07 -> 71b26f9c804d

ALTER TABLE enderecos ADD COLUMN latitude FLOAT;

ALTER TABLE enderecos ADD COLUMN longitude FLOAT;

UPDATE alembic_version SET version_num='71b26f9c804d' WHERE alembic_version.version_num = 'f41c90a62e07';

COMMIT;
