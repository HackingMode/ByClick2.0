import os
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from passlib.context import CryptContext

# Adicionar o diretório raiz ao path para poder importar módulos da app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.models import (
    Base, Provincia, Municipio, Categoria, Utilizador, PerfilVendedor, Produto, Servico,
    GeneroEnum, TipoUtilizadorEnum, TipoVendedorEnum, TipoLojaEnum, CategoriaStatusEnum
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_db():
    print("Iniciando povoamento da base de dados (kitanda_db)...")
    db = SessionLocal()

    try:
        # 1. Limpar dados existentes (opcional, mas bom para evitar duplicações em testes rápidos)
        # Nota: Só funciona bem se não houver constraints de FK estritas entre tabelas que não estamos a limpar.
        # Mas como a BD foi recém criada, estará vazia.

        # 2. Províncias e Municípios
        print("A criar Províncias e Municípios...")
        prov_luanda = Provincia(nome="Luanda")
        prov_benguela = Provincia(nome="Benguela")
        prov_huila = Provincia(nome="Huíla")
        db.add_all([prov_luanda, prov_benguela, prov_huila])
        db.commit()

        mun_luanda1 = Municipio(nome="Luanda", provincia_id=prov_luanda.id)
        mun_luanda2 = Municipio(nome="Viana", provincia_id=prov_luanda.id)
        mun_benguela1 = Municipio(nome="Benguela", provincia_id=prov_benguela.id)
        mun_benguela2 = Municipio(nome="Lobito", provincia_id=prov_benguela.id)
        db.add_all([mun_luanda1, mun_luanda2, mun_benguela1, mun_benguela2])
        db.commit()

        # 3. Categorias
        print("A criar Categorias...")
        cat_moda = Categoria(nome="Moda & Vestuário", descricao="Roupas, sapatos e acessórios", tipo="produto")
        cat_eletronicos = Categoria(nome="Eletrónicos", descricao="Telemóveis, computadores, etc", tipo="produto")
        cat_servicos_casa = Categoria(nome="Serviços ao Domicílio", descricao="Limpeza, Canalização, Eletricidade", tipo="servico")
        cat_beleza = Categoria(nome="Saúde & Beleza", descricao="Maquilhagem, perfumaria", tipo="produto")
        db.add_all([cat_moda, cat_eletronicos, cat_servicos_casa, cat_beleza])
        db.commit()

        # 4. Utilizadores Fictícios
        print("A criar Utilizadores Fictícios...")
        senha_padrao = get_password_hash("senha123")

        # 4.1 Comprador
        comprador = Utilizador(
            nome_completo="João Comprador",
            nome_utilizador="joao_compra",
            email="comprador@teste.com",
            numero_telefone="910000001",
            senha_hash=senha_padrao,
            tipo_utilizador=TipoUtilizadorEnum.comprador,
            ativo=True, email_verificado=True
        )

        # 4.2 Vendedor Individual
        vendedor_ind = Utilizador(
            nome_completo="Maria Vendedora",
            nome_utilizador="maria_vende",
            email="vendedor@teste.com",
            numero_telefone="910000002",
            senha_hash=senha_padrao,
            tipo_utilizador=TipoUtilizadorEnum.vendedor,
            ativo=True, email_verificado=True
        )

        # 4.3 Empresa
        empresa_user = Utilizador(
            nome_completo="José Gestor (KitandaTech)",
            nome_utilizador="kitandatech",
            email="empresa@teste.com",
            numero_telefone="910000003",
            senha_hash=senha_padrao,
            tipo_utilizador=TipoUtilizadorEnum.vendedor,
            ativo=True, email_verificado=True
        )

        # 4.4 Administrador
        admin_user = Utilizador(
            nome_completo="Administrador Kitanda",
            nome_utilizador="admin_geral",
            email="admin@teste.com",
            numero_telefone="910000004",
            senha_hash=senha_padrao,
            tipo_utilizador=TipoUtilizadorEnum.admin,
            ativo=True, email_verificado=True
        )

        db.add_all([comprador, vendedor_ind, empresa_user, admin_user])
        db.commit()

        # 5. Perfis de Vendedor
        print("A criar Perfis de Vendedor...")
        perfil_maria = PerfilVendedor(
            utilizador_id=vendedor_ind.id,
            nome_loja="Boutique da Maria",
            descricao_loja="Roupas africanas e acessórios de moda feitos à mão.",
            tipo_vendedor=TipoVendedorEnum.individual,
            tipo_loja=TipoLojaEnum.produtos,
            verificado=True
        )

        perfil_empresa = PerfilVendedor(
            utilizador_id=empresa_user.id,
            nome_loja="KitandaTech Service Lda",
            descricao_loja="A melhor loja de eletrónicos e serviços informáticos de Luanda.",
            tipo_vendedor=TipoVendedorEnum.empresa,
            tipo_loja=TipoLojaEnum.ambos,
            verificado=True
        )

        db.add_all([perfil_maria, perfil_empresa])
        db.commit()

        # 6. Produtos e Serviços
        print("A criar Produtos e Serviços...")
        # Produtos Maria
        prod1 = Produto(
            vendedor_id=perfil_maria.id,
            categoria_id=cat_moda.id,
            nome="Vestido de Samakaka",
            descricao="Vestido elegante feito com tecido original de Samakaka. Tamanho M.",
            preco=15000.00,
            stock=5,
            sku="SAM-001"
        )
        prod2 = Produto(
            vendedor_id=perfil_maria.id,
            categoria_id=cat_beleza.id,
            nome="Creme Hidratante Manteiga de Karité",
            descricao="Creme natural para pele seca.",
            preco=5000.00,
            stock=20,
            sku="KAR-001"
        )

        # Produtos Empresa
        prod3 = Produto(
            vendedor_id=perfil_empresa.id,
            categoria_id=cat_eletronicos.id,
            nome="Smartphone Samsung Galaxy S23",
            descricao="Telefone novo na caixa, 256GB.",
            preco=450000.00,
            stock=10,
            sku="SAM-S23"
        )

        # Serviços Empresa
        serv1 = Servico(
            vendedor_id=perfil_empresa.id,
            categoria_id=cat_servicos_casa.id,
            nome="Reparação de Computadores e Portáteis",
            descricao="Formatação, troca de peças e limpeza interna.",
            preco_base=10000.00,
            duracao_estimada="2 horas"
        )

        db.add_all([prod1, prod2, prod3, serv1])
        db.commit()

        print("Povoamento concluído com sucesso!")
        print("---")
        print("Credenciais de Teste (Senha: senha123):")
        print("- comprador@teste.com")
        print("- vendedor@teste.com (Boutique da Maria)")
        print("- empresa@teste.com (KitandaTech Service)")
        print("- admin@teste.com (Administrador Kitanda)")
        print("---")

    except Exception as e:
        print(f"Erro ao inserir dados: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
