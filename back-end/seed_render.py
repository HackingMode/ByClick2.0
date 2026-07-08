import asyncio
import sys
from pathlib import Path
import os

# Adicionar a pasta raiz ao path do Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.models import (
    Base, Utilizador, PerfilVendedor, Categoria, Produto, Servico,
    TipoUtilizadorEnum, TipoVendedorEnum, TipoLojaEnum, GeneroEnum, Endereco
)
from app.core.security import hash_password as get_password_hash

def create_categorias(db: Session):
    print("A criar/verificar categorias...")
    categorias_iniciais = [
        {"nome": "Tecnologia", "tipo": "produto", "ordem": 1},
        {"nome": "Moda", "tipo": "produto", "ordem": 2},
        {"nome": "Casa & Jardim", "tipo": "produto", "ordem": 3},
        {"nome": "Tecnologia", "tipo": "servico", "ordem": 1},
        {"nome": "Reparações", "tipo": "servico", "ordem": 2},
        {"nome": "Consultoria", "tipo": "servico", "ordem": 3},
    ]
    
    cats = []
    for cat_data in categorias_iniciais:
        cat = db.query(Categoria).filter_by(nome=cat_data["nome"], tipo=cat_data["tipo"]).first()
        if not cat:
            cat = Categoria(**cat_data)
            db.add(cat)
        cats.append(cat)
        
    db.commit()
    return cats

def create_users(db: Session):
    print("A criar/verificar utilizadores e lojas...")
    senha_hash = get_password_hash("password123")

    users_data = [
        {
            "nome_completo": "João Comprador",
            "nome_utilizador": "joaocompra",
            "email": "comprador@teste.com",
            "numero_telefone": "+244910000001",
            "tipo_utilizador": TipoUtilizadorEnum.comprador,
        },
        {
            "nome_completo": "Maria Vendedora",
            "nome_utilizador": "mariavende",
            "email": "vendedor@teste.com",
            "numero_telefone": "+244920000002",
            "tipo_utilizador": TipoUtilizadorEnum.vendedor,
        },
        {
            "nome_completo": "Admin Tech Lda",
            "nome_utilizador": "techlda",
            "email": "empresa@teste.com",
            "numero_telefone": "+244930000003",
            "tipo_utilizador": TipoUtilizadorEnum.vendedor,
        },
        {
            "nome_completo": "Administrador Kitanda",
            "nome_utilizador": "admin_geral",
            "email": "admin@kitanda.com",
            "numero_telefone": "+244940000004",
            "tipo_utilizador": TipoUtilizadorEnum.admin,
        }
    ]

    users = {}
    for u_data in users_data:
        user = db.query(Utilizador).filter_by(email=u_data["email"]).first()
        if not user:
            user = Utilizador(
                **u_data,
                senha_hash=senha_hash,
                email_verificado=True
            )
            db.add(user)
        else:
            # Force update the password and active status so we can always log in
            user.senha_hash = senha_hash
            user.ativo = True
        users[u_data["email"]] = user
    
    db.commit()

    # Adicionar Endereços e Perfis se não existirem
    enderecos_data = [
        {"user": users["comprador@teste.com"], "provincia": "Luanda", "municipio": "Talatona", "bairro": "Morro Bento"},
        {"user": users["vendedor@teste.com"], "provincia": "Luanda", "municipio": "Belas", "bairro": "Kilamba", "latitude": -8.839988, "longitude": 13.289437},
        {"user": users["empresa@teste.com"], "provincia": "Benguela", "municipio": "Lobito", "bairro": "Restinga", "latitude": -12.35, "longitude": 13.5333},
    ]

    for end_data in enderecos_data:
        user = end_data.pop("user")
        end = db.query(Endereco).filter_by(utilizador_id=user.id).first()
        if not end:
            end = Endereco(utilizador_id=user.id, **end_data)
            db.add(end)
        elif "latitude" in end_data:
            end.latitude = end_data["latitude"]
            end.longitude = end_data["longitude"]

    db.commit()

    # Perfis de vendedor
    perfis_data = [
        {
            "user": users["vendedor@teste.com"],
            "nome_loja": "Loja da Maria",
            "descricao_loja": "Moda e acessórios feitos à mão.",
            "tipo_vendedor": TipoVendedorEnum.individual,
            "tipo_loja": TipoLojaEnum.produtos,
        },
        {
            "user": users["empresa@teste.com"],
            "nome_loja": "Tech Angola Lda",
            "descricao_loja": "Tudo em informática e reparação.",
            "tipo_vendedor": TipoVendedorEnum.empresa,
            "tipo_loja": TipoLojaEnum.ambos,
        }
    ]

    perfis = {}
    for p_data in perfis_data:
        user = p_data.pop("user")
        perfil = db.query(PerfilVendedor).filter_by(utilizador_id=user.id).first()
        if not perfil:
            perfil = PerfilVendedor(utilizador_id=user.id, verificado=True, **p_data)
            db.add(perfil)
        perfis[user.email] = perfil
    
    db.commit()

    return users["comprador@teste.com"], users["vendedor@teste.com"], users["empresa@teste.com"], perfis.get("vendedor@teste.com"), perfis.get("empresa@teste.com")

def create_produtos_servicos(db: Session, perf_ind, perf_emp):
    if not perf_ind or not perf_emp:
        print("Aviso: Perfis de vendedor não encontrados. Pulando criação de produtos/serviços.")
        return

    print("A criar/verificar produtos e serviços...")
    
    cat_tec = db.query(Categoria).filter_by(nome="Tecnologia", tipo="produto").first()
    cat_moda = db.query(Categoria).filter_by(nome="Moda", tipo="produto").first()
    cat_rep = db.query(Categoria).filter_by(nome="Reparações", tipo="servico").first()

    produtos_data = [
        {"vendedor_id": perf_ind.id, "categoria_id": cat_moda.id, "nome": "Vestido Samakaka", "descricao": "Vestido artesanal", "preco": 15000, "stock": 10},
        {"vendedor_id": perf_ind.id, "categoria_id": cat_moda.id, "nome": "Bolsa de Couro", "descricao": "Bolsa de couro natural", "preco": 25000, "stock": 5},
        {"vendedor_id": perf_emp.id, "categoria_id": cat_tec.id, "nome": "Portátil Asus i7", "descricao": "16GB RAM, 512GB SSD", "preco": 650000, "stock": 3},
        {"vendedor_id": perf_emp.id, "categoria_id": cat_tec.id, "nome": "Rato Sem Fios", "descricao": "Rato ergonómico", "preco": 12000, "stock": 50},
    ]

    for p_data in produtos_data:
        prod = db.query(Produto).filter_by(vendedor_id=p_data["vendedor_id"], nome=p_data["nome"]).first()
        if not prod:
            db.add(Produto(**p_data))

    servicos_data = [
        {"vendedor_id": perf_emp.id, "categoria_id": cat_rep.id, "nome": "Formatação de PC", "descricao": "Instalação de Windows e Office", "preco_base": 15000, "duracao_estimada": "2h"},
        {"vendedor_id": perf_emp.id, "categoria_id": cat_rep.id, "nome": "Reparação de Telemóveis", "descricao": "Troca de ecrã e bateria", "preco_base": 20000, "duracao_estimada": "1 dia"},
    ]

    for s_data in servicos_data:
        serv = db.query(Servico).filter_by(vendedor_id=s_data["vendedor_id"], nome=s_data["nome"]).first()
        if not serv:
            db.add(Servico(**s_data))

    db.commit()

def main():
    db = SessionLocal()
    try:
        # AQUI NÃO FAZEMOS drop_all() !
        # Apenas criamos as tabelas que não existem
        Base.metadata.create_all(bind=engine)
        
        create_categorias(db)
        c, v, e, p_ind, p_emp = create_users(db)
        create_produtos_servicos(db, p_ind, p_emp)
        
        print("\n" + "="*50)
        print("SEED DE RENDER EXECUTADO COM SUCESSO!")
        print("Aceda com a senha: password123")
        print("="*50)
        print(f"1. COMPRADOR: {c.email}")
        print(f"2. VENDEDOR (Individual): {v.email}")
        print(f"3. EMPRESA: {e.email}")
        print(f"4. ADMIN: admin@kitanda.com")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"Erro ao gerar dados: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
