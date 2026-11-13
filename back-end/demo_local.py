"""Dados isolados para demonstração local; nunca utiliza DATABASE_URL externo."""
import os
import secrets
from pathlib import Path

root = Path(__file__).resolve().parent
demo = root / '.venv' / 'byclick-demo'
demo.mkdir(parents=True, exist_ok=True)
secret_file = demo / 'secret'
if not secret_file.exists():
    secret_file.write_text(secrets.token_urlsafe(48))
os.environ['SECRET_KEY'] = secret_file.read_text().strip()
os.environ['DATABASE_URL'] = 'sqlite:///' + str(demo / 'demo.sqlite3')
os.environ['BASE_URL'] = 'http://127.0.0.1:8000'

from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.models import (Utilizador, PerfilVendedor, Categoria, Produto, ImagemProduto,
    Servico, ImagemServico, Provincia, Municipio, Endereco, TipoUtilizadorEnum, TipoVendedorEnum, TipoLojaEnum)

Base.metadata.create_all(engine)
with SessionLocal() as db:
    if db.query(Utilizador).filter_by(email='comprador@demo.byclick').first():
        print('Demonstração local já preparada.')
    else:
        senha = hash_password('ByClick2026!')
        comprador = Utilizador(nome_completo='Ana Manuel', nome_utilizador='ana.demo', email='comprador@demo.byclick', numero_telefone='244923000001', senha_hash=senha, tipo_utilizador=TipoUtilizadorEnum.comprador, email_verificado=True)
        vendedor = Utilizador(nome_completo='Mário Costa', nome_utilizador='mario.demo', email='vendedor@demo.byclick', numero_telefone='244923000002', senha_hash=senha, tipo_utilizador=TipoUtilizadorEnum.vendedor, email_verificado=True)
        db.add_all([comprador, vendedor]); db.flush()
        db.add_all([Endereco(utilizador_id=comprador.id, provincia='Luanda', municipio='Talatona'), Endereco(utilizador_id=vendedor.id, provincia='Luanda', municipio='Luanda')])
        loja = PerfilVendedor(utilizador_id=vendedor.id, nome_loja='Luanda Concept Store', descricao_loja='Produtos e serviços seleccionados em Luanda.', tipo_vendedor=TipoVendedorEnum.individual, tipo_loja=TipoLojaEnum.ambos, verificado=True, iban='AO06000000000000000000000')
        db.add(loja); db.flush()
        provincia = Provincia(nome='Luanda'); db.add(provincia); db.flush()
        db.add_all([Municipio(nome='Luanda', provincia_id=provincia.id), Municipio(nome='Talatona', provincia_id=provincia.id)])
        cats = {}
        for name, kind in [('Smartphones','produto'), ('Informática','produto'), ('Moda','produto'), ('Casa','produto'), ('Serviços','servico')]:
            c = Categoria(nome=name, tipo=kind); db.add(c); db.flush(); cats[name] = c.id
        ofertas = [
            ('Smartphone premium', 'Smartphone em excelente estado, pronto para o dia a dia.', 285000, 'Smartphones', 'phone.jpg'),
            ('Portátil para trabalho', 'Computador portátil para trabalho, estudo e criação.', 420000, 'Informática', 'laptop.jpg'),
            ('Ténis urbano', 'Ténis confortável para acompanhar o teu ritmo.', 38500, 'Moda', 'shoes.jpg'),
            ('Candeeiro de mesa', 'Uma peça elegante para iluminar o teu espaço.', 27500, 'Casa', 'lamp.jpg'),
        ]
        for name, desc, price, cat, img in ofertas:
            p = Produto(vendedor_id=loja.id, categoria_id=cats[cat], nome=name, descricao=desc, preco=price, stock=10, destaque=True)
            db.add(p); db.flush(); db.add(ImagemProduto(produto_id=p.id, url='http://127.0.0.1:8000/imagens/demo/' + img, principal=True))
        s = Servico(vendedor_id=loja.id, categoria_id=cats['Serviços'], nome='Assistência informática', descricao='Diagnóstico e apoio para computadores e dispositivos.', preco_base=15000, duracao_estimada='1 hora')
        db.add(s); db.flush(); db.add(ImagemServico(servico_id=s.id, url='http://127.0.0.1:8000/imagens/demo/service.jpg', principal=True))
        db.commit()
        print('Demonstração local preparada. Conta: comprador@demo.byclick | Palavra-passe: ByClick2026!')
