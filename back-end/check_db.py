import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import Produto, Utilizador, TipoUtilizadorEnum, TipoVendedorEnum, PerfilVendedor

db = SessionLocal()

print("Utilizadores (vendedores empresas):")
empresas = db.query(Utilizador).join(PerfilVendedor).filter(PerfilVendedor.tipo_vendedor == TipoVendedorEnum.empresa).all()
for emp in empresas:
    print(f"ID: {emp.id}, Nome: {emp.nome_completo}, Email: {emp.email}")
    if emp.perfil_vendedor:
        print(f"  PerfilVendedor ID: {emp.perfil_vendedor.id}")
        produtos = db.query(Produto).filter(Produto.vendedor_id == emp.perfil_vendedor.id).all()
        print(f"  Produtos count: {len(produtos)}")
        for p in produtos:
            print(f"    - {p.id}: {p.nome} (Ativo: {p.ativo})")
