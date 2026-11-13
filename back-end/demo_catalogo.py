"""Completa o catálogo de demonstração, apenas na base local isolada."""
import demo_local  # configura exclusivamente a base SQLite da demonstração
from app.core.database import SessionLocal
from app.models.models import Categoria, Produto, ImagemProduto, PerfilVendedor

ofertas = [
    ('Mala clássica', 'Mala elegante para acompanhar o teu dia.', 42000, 'Moda', 'bag.jpg'),
    ('Relógio minimalista', 'Uma peça discreta para todas as ocasiões.', 36500, 'Moda', 'watch.jpg'),
    ('Auscultadores sem fios', 'Som envolvente para trabalho ou lazer.', 48500, 'Informática', 'headphones.jpg'),
    ('Cadeira de design', 'Conforto e linhas simples para o teu espaço.', 89000, 'Casa', 'chair.jpg'),
    ('Câmara fotográfica', 'Captura os momentos que importam.', 310000, 'Informática', 'camera.jpg'),
    ('Perfume elegante', 'Uma fragrância marcante para o dia a dia.', 52000, 'Moda', 'perfume.jpg'),
]
with SessionLocal() as db:
    loja = db.query(PerfilVendedor).filter_by(nome_loja='Luanda Concept Store').one()
    for nome, descricao, preco, categoria, imagem in ofertas:
        if db.query(Produto).filter_by(nome=nome, vendedor_id=loja.id).first():
            continue
        cat = db.query(Categoria).filter_by(nome=categoria).one()
        produto = Produto(vendedor_id=loja.id, categoria_id=cat.id, nome=nome, descricao=descricao, preco=preco, stock=10)
        db.add(produto); db.flush()
        db.add(ImagemProduto(produto_id=produto.id, url=f'http://127.0.0.1:8000/imagens/demo/{imagem}', principal=True))
    db.commit()
print('Catálogo de demonstração preparado.')
