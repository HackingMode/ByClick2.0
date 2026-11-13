# ByClick2.0 — versão revista

## Executar com kitanda_db

Requisitos: Python 3.12 e PostgreSQL 15 ou superior disponível. Os comandos seguintes são para PowerShell, na pasta deste projeto.

```powershell
cd back-end
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Edite `.env`: coloque o segredo gerado em `SECRET_KEY` e configure `DATABASE_URL` com o utilizador, a palavra-passe e o servidor reais, terminando em `/kitanda_db`. Caracteres especiais na palavra-passe devem ser codificados como URL. O valor `CHANGE_ME` é intencionalmente recusado.

Se a base ainda não existir, crie-a com a sua ferramenta PostgreSQL ou execute, numa sessão administrativa:

```sql
CREATE DATABASE kitanda_db;
```

Para uma base existente, faça uma cópia de segurança antes da atualização. Depois execute:

```powershell
python -m alembic current
python -m alembic upgrade head
python -m alembic current
python -m alembic check
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

A revisão final esperada é `71b26f9c804d`. Consulte `http://localhost:8000/health` e `http://localhost:8000/docs`.

Não importe os antigos `schema.sql` sobre as migrações. Não use `stamp head` para ocultar erros: isso não cria tabelas nem colunas. Se a base já foi criada por `create_all` ou por um dump, compare a estrutura com as migrações antes de estabelecer uma revisão de partida. A validação aqui não confirma o estado da sua base existente.

## Frontend

Num segundo terminal, na raiz do projeto:

```powershell
python -m http.server 5500 --directory front-end/public --bind 127.0.0.1
```

Abra `http://localhost:5500`. Para alojamento separado, defina antes de carregar `api.js`:

```html
<script>window.BYCLICK_API_BASE_URL = 'https://api.exemplo.ao/api/v1';</script>
```

Configure também `BASE_URL` com a origem pública do backend e `CORS_ORIGINS` com a origem exata do frontend. Em alojamento com a mesma origem, o cliente utiliza `/api/v1`. A aplicação foi testada por API; os fluxos visuais no navegador não foram validados nesta sessão.

## Testes

Na pasta `back-end`, com as dependências de desenvolvimento instaladas:

```powershell
python -m unittest discover -s tests -v
```

O teste PostgreSQL fica explicitamente ignorado sem `TEST_DATABASE_URL`. Para o executar, a partir da raiz e com o ambiente virtual ativo:

```powershell
.\VALIDAR_POSTGRESQL.ps1 -TestDatabaseUrl 'postgresql+psycopg2://utilizador:senha@localhost:5432/kitanda_db'
```

O teste cria e elimina apenas um schema temporário `byclick_test_<uuid>`, verificando upgrade, downgrade, novo upgrade, enums e preservação do chat. A conta precisa de autorização para criar schemas. Use preferencialmente uma base de testes.

## Limites desta entrega

Os testes locais de API e estrutura passaram, mas o PostgreSQL real não ficou acessível neste ambiente. Portanto, `python -m alembic upgrade head` em `kitanda_db` continua por validar. Não foi feita qualquer alteração à sua base.

A revisão de segurança identificou pontos adicionais descritos em `REVISAO_TECNICA.md`. Esta versão corrige falhas concretas; não representa uma certificação de segurança ou uma validação completa de produção.
