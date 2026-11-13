import base64
from io import BytesIO
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

os.environ.setdefault('DATABASE_URL', 'sqlite://')
os.environ.setdefault('SECRET_KEY', 'test-only-secret-at-least-32-characters')

from alembic import command
from alembic.config import Config
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.core.rate_limit import _buckets
from app.models.models import *


class BackendRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        @event.listens_for(cls.engine, 'connect')
        def foreign_keys(connection, record):
            connection.execute('PRAGMA foreign_keys=ON')
        cls.sessions = sessionmaker(bind=cls.engine, autoflush=False)

    def setUp(self):
        _buckets.clear()
        Base.metadata.create_all(self.engine)
        def db_override():
            with self.sessions() as db:
                try:
                    yield db
                except Exception:
                    db.rollback()
                    raise
        app.dependency_overrides[get_db] = db_override
        self.client = TestClient(app)
        with self.sessions() as db:
            buyer = Utilizador(nome_completo='Comprador', nome_utilizador='buyer', email='buyer@example.com', numero_telefone='244923456789', senha_hash=hash_password('password123'))
            seller = Utilizador(nome_completo='Vendedor', nome_utilizador='seller', email='seller@example.com', numero_telefone='244923456788', senha_hash=hash_password('password123'), tipo_utilizador=TipoUtilizadorEnum.vendedor)
            db.add_all([buyer, seller]); db.flush()
            profile = PerfilVendedor(utilizador_id=seller.id, nome_loja='Loja', tipo_loja=TipoLojaEnum.ambos)
            db.add(profile); db.flush()
            db.add_all([Produto(vendedor_id=profile.id, nome='Produto', preco='12.50', stock=5), Servico(vendedor_id=profile.id, nome='Serviço', preco_base='100.00')])
            db.commit()
            self.buyer, self.seller = buyer.id, seller.id
        self.headers = {'Authorization': 'Bearer ' + create_access_token({'sub':str(self.buyer)})}
        self.seller_headers = {'Authorization': 'Bearer ' + create_access_token({'sub':str(self.seller)})}

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine)

    def test_health_openapi_and_seed_removed(self):
        self.assertEqual(self.client.get('/health').json(), {'status':'ok'})
        self.assertEqual(self.client.get('/openapi.json').status_code, 200)
        self.assertEqual(self.client.get('/seed-db').status_code, 404)

    def test_login_and_token_separation(self):
        r = self.client.post('/api/v1/auth/login', json={'identificador':'buyer@example.com','senha':'password123'})
        self.assertEqual(r.status_code, 200, r.text)
        tokens = r.json()
        for token, expected in [(tokens['access_token'],200), (tokens['refresh_token'],401), (create_access_token({}),401), (create_access_token({'sub':'abc'}),401)]:
            self.assertEqual(self.client.get('/api/v1/auth/me',headers={'Authorization':'Bearer '+token}).status_code,expected)

    def test_registration_email_code_and_delivery_failure(self):
        payload = {'nome_completo':'Novo comprador', 'nome_utilizador':'novo', 'email':'novo@example.com', 'numero_telefone':'244923456786', 'senha':'password123', 'confirmar_senha':'password123'}
        with patch('app.api.v1.endpoints.auth.enviar_otp_verificacao', return_value=True) as envio:
            r = self.client.post('/api/v1/auth/registar-comprador', json=payload)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertTrue(r.json()['email_enviado'])
        codigo = envio.call_args.args[1]
        self.assertEqual(envio.call_args.args[0], payload['email'])
        r = self.client.post('/api/v1/auth/verificar-codigo', json={'utilizador_id':r.json()['utilizador_id'], 'codigo':codigo, 'tipo':'email'})
        self.assertEqual(r.status_code, 200, r.text)
        payload.update(nome_utilizador='sememail', email='sememail@example.com', numero_telefone='244923456785')
        with patch('app.api.v1.endpoints.auth.enviar_otp_verificacao', return_value=False):
            r = self.client.post('/api/v1/auth/registar-comprador', json=payload)
        self.assertEqual(r.status_code, 201, r.text)
        self.assertFalse(r.json()['email_enviado'])
        self.assertIn('indisponível', r.json()['mensagem'])

    def test_seller_registration_with_identity_and_address(self):
        payload = {'nome_completo':'Vendedor Novo', 'nome_utilizador':'vendedor_novo', 'email':'vendedor-novo@example.com', 'numero_telefone':'244923456784', 'senha':'password123', 'confirmar_senha':'password123', 'numero_bi':'123456789LA123', 'data_emissao':'2020-01-01', 'data_validade':'2030-01-01', 'provincia':'Luanda', 'municipio':'Luanda', 'bairro':'Centro'}
        with patch('app.api.v1.endpoints.auth.enviar_otp_verificacao', return_value=False):
            response = self.client.post('/api/v1/auth/registar-vendedor', json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertFalse(response.json()['email_enviado'])
        with self.sessions() as db:
            user = db.get(Utilizador, response.json()['utilizador_id'])
            self.assertEqual(user.perfil_vendedor.nome_loja, 'vendedor_novo')
            self.assertEqual(user.documento_bi.numero_bi, payload['numero_bi'])
            self.assertEqual(user.endereco.municipio, 'Luanda')

    def test_payment_receipt_requires_authorization(self):
        r = self.client.post('/api/v1/pedidos/produtos', headers=self.headers, json={'itens':[{'produto_id':1,'quantidade':1}]})
        self.assertEqual(r.status_code, 201, r.text)
        order_id = r.json()['pedido_id']
        image = BytesIO()
        Image.new('RGB', (1, 1), 'red').save(image, format='PNG')
        data = base64.b64encode(image.getvalue()).decode()
        r = self.client.post(f'/api/v1/pedidos/{order_id}/comprovativo', headers=self.headers, json={'imagem_base64':data})
        self.assertEqual(r.status_code, 200, r.text)
        from urllib.parse import urlparse
        path = urlparse(r.json()['url']).path
        self.assertEqual(self.client.get(path).status_code, 401)
        self.assertEqual(self.client.get(path, headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get(path, headers=self.seller_headers).status_code, 200)
        with self.sessions() as db:
            other = Utilizador(nome_completo='Outra pessoa', nome_utilizador='other', email='other@example.com', numero_telefone='244923456787', senha_hash=hash_password('password123'))
            db.add(other); db.commit(); other_id = other.id
        token = create_access_token({'sub':str(other_id)})
        self.assertEqual(self.client.get(path, headers={'Authorization':'Bearer '+token}).status_code, 403)

    def test_service_schedule_is_preserved(self):
        r = self.client.post('/api/v1/pedidos/servicos', headers=self.headers, json={'servico_id':1, 'data_agendada':'2027-02-20T10:30:00', 'descricao_necessidade':'Visita à loja'})
        self.assertEqual(r.status_code, 201, r.text)
        with self.sessions() as db:
            order = db.get(PedidoServico, r.json()['pedido_id'])
            self.assertEqual(order.data_agendada.isoformat(), '2027-02-20T10:30:00')
            self.assertEqual(order.descricao_necessidade, 'Visita à loja')
            self.assertEqual(float(order.valor_acordado), 100.0)

    def test_public_store_and_service_details(self):
        r = self.client.get('/api/v1/vendedor/lojas/1')
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()['nome'], 'Loja')
        self.assertEqual({i['tipo'] for i in r.json()['ofertas']}, {'produto', 'servico'})
        self.assertNotIn('iban', r.json())
        self.assertEqual(self.client.get('/api/v1/vendedor/lojas/999').status_code, 404)
        r = self.client.get('/api/v1/servicos/1')
        self.assertEqual(r.json()['vendedor_nome'], 'Loja')
        self.assertEqual(r.json()['vendedor_telefone'], '244923456788')

    def test_seller_dashboard_counts_only_paid_revenue(self):
        order = self.client.post('/api/v1/pedidos/produtos', headers=self.headers, json={'itens':[{'produto_id':1,'quantidade':2}]})
        self.assertEqual(order.status_code, 201, order.text)
        service = self.client.post('/api/v1/pedidos/servicos', headers=self.headers, json={'servico_id':1})
        self.assertEqual(service.status_code, 201, service.text)
        url = '/api/v1/vendedor/minhas-estatisticas/dashboard'
        response = self.client.get(url, headers=self.seller_headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['produtos_count'], 1)
        self.assertEqual(response.json()['servicos_count'], 1)
        self.assertEqual(response.json()['receita_mes'], 0)
        self.assertEqual(response.json()['pedidos_mes'], 2)
        with self.sessions() as db:
            item = db.get(Pedido, order.json()['pedido_id'])
            item.status_pagamento = StatusPagamentoEnum.pago
            item.status = StatusPedidoEnum.entregue
            db.commit()
        response = self.client.get(url, headers=self.seller_headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['receita_mes'], 25.0)
        self.assertEqual(response.json()['total_vendas'], 1)
        self.assertEqual(sum(response.json()['grafico_vendas']), 25.0)

    def test_checkout_totals_stock_and_status(self):
        r=self.client.post('/api/v1/pedidos/produtos',headers=self.headers,json={'itens':[{'produto_id':1,'quantidade':2}]})
        self.assertEqual(r.status_code,201,r.text)
        with self.sessions() as db:
            order=db.get(Pedido,r.json()['pedido_id'])
            self.assertEqual(str(order.valor_subtotal),'25.00')
            self.assertEqual(order.valor_total,order.pagamento.valor)
            self.assertEqual(db.get(Produto,1).stock,3)
        url=f"/api/v1/pedidos/produtos/{r.json()['pedido_id']}/status"
        self.assertEqual(self.client.put(url,headers=self.headers,json={'status':'confirmado'}).status_code,403)
        r=self.client.put(url,headers=self.seller_headers,json={'status':'confirmado'})
        self.assertEqual(r.status_code,200,r.text)

    def test_negative_quantity_and_atomic_failed_checkout(self):
        for quantity in [0,-1]:
            self.assertEqual(self.client.post('/api/v1/pedidos/produtos',headers=self.headers,json={'itens':[{'produto_id':1,'quantidade':quantity}]}).status_code,422)
        r=self.client.post('/api/v1/pedidos/produtos',headers=self.headers,json={'itens':[{'produto_id':1,'quantidade':1},{'produto_id':999,'quantidade':1}]})
        self.assertEqual(r.status_code,404,r.text)
        with self.sessions() as db:
            self.assertEqual(db.get(Produto,1).stock,5)
            self.assertEqual(db.query(Pedido).count(),0)

    def test_services_and_real_estate(self):
        r=self.client.post('/api/v1/pedidos/servicos',headers=self.headers,json={'servico_id':1})
        self.assertEqual(r.status_code,201,r.text)
        r=self.client.post('/api/v1/imoveis/',headers=self.seller_headers,json={'titulo':'Casa','preco':500000,'finalidade':'venda','tipo_imovel':'moradia'})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(self.client.get('/api/v1/imoveis/').status_code,200)

    def test_cors(self):
        headers={'Origin':'http://localhost:5500','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Authorization,Content-Type'}
        self.assertEqual(self.client.options('/api/v1/auth/login',headers=headers).status_code,200)
        headers['Origin']='https://untrusted.example'
        self.assertEqual(self.client.options('/api/v1/auth/login',headers=headers).status_code,400)

    def test_rate_limit(self):
        for _ in range(10):
            self.assertEqual(self.client.post('/api/v1/auth/login',json={'identificador':'missing','senha':'bad'}).status_code,401)
        self.assertEqual(self.client.post('/api/v1/auth/login',json={'identificador':'missing','senha':'bad'}).status_code,429)

    def test_image_validation(self):
        from app.core.images import save_image
        from fastapi import HTTPException
        for data in ['!!!', base64.b64encode(b'<svg onload="alert(1)"/>').decode(), 'data:image/../../evil;base64,AAAA']:
            with self.assertRaises(HTTPException):
                save_image(data,'produtos/1','capa')
        with tempfile.TemporaryDirectory() as folder:
            image=BytesIO();Image.new('RGB',(4,4),'red').save(image,'PNG')
            with patch('app.core.images.BASE_DIR',Path(folder)):
                url=save_image(base64.b64encode(image.getvalue()).decode(),'produtos/1','capa')
                self.assertTrue(url.endswith('.jpg'))
                self.assertEqual(len(list(Path(folder).rglob('*.jpg'))),1)

    def test_review_requires_purchase(self):
        r=self.client.post('/api/v1/avaliacoes/',headers=self.headers,json={'vendedor_id':1,'produto_id':1,'nota':5})
        self.assertEqual(r.status_code,403,r.text)


class MigrationRegression(unittest.TestCase):
    def test_migration_chain_and_metadata(self):
        # SQLite validates the historical table DDL. PostgreSQL enums need the integration test below.
        cfg=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
        with tempfile.TemporaryDirectory() as tmp:
            url='sqlite:///'+str(Path(tmp)/'migration.db')
            with patch('app.core.config.settings.DATABASE_URL',url):
                command.upgrade(cfg,'head')
            engine=create_engine(url)
            try:
                with engine.connect() as connection:
                    def compare_types(ctx, inspected, model, inspected_type, model_type):
                        if isinstance(model_type, __import__('sqlalchemy').Enum):
                            return False  # SQLite stores enum labels as VARCHAR.
                        return None
                    diffs=compare_metadata(MigrationContext.configure(connection, opts={'compare_type':compare_types}),Base.metadata)
                    self.assertEqual(diffs,[])
            finally:
                engine.dispose()


if __name__ == '__main__':
    unittest.main()
