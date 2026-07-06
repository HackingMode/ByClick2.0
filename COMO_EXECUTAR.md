# Como Executar o Projeto noutro Computador

Este guia explica todos os passos necessários para configurar e executar o projeto (ByClick 2.0 / Kitanda 2.0) num novo computador, assumindo que a pasta do projeto já está no computador.

---

## 🛠️ Tecnologias Necessárias

Antes de começar, certifica-te de que o computador tem instalado:
1. **Python 3.11+**: Para correr o backend.
2. **PostgreSQL 15+**: O sistema de base de dados.
3. Um editor de código, como o **Visual Studio Code (VS Code)** (com a extensão *Live Server* recomendada).

---

## 🗄️ Passo 1: Configurar a Base de Dados (PostgreSQL)

1. Abre o teu PostgreSQL (via pgAdmin ou terminal).
2. Cria uma nova base de dados para o projeto (ex: `byclick2`).
3. Tem à mão o teu **nome de utilizador** e a **password** do PostgreSQL.

---

## ⚙️ Passo 2: Configurar e Executar o Backend (FastAPI)

No teu editor (ex: VS Code), abre a pasta raiz do projeto e depois abre um terminal novo.
Entra na pasta `back-end`:

```bash
cd back-end
```

### 2.1. Criar e ativar o ambiente virtual (venv)
É boa prática usar um ambiente virtual para não misturar as bibliotecas.

**No Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**No Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.2. Instalar as dependências
Com o ambiente virtual ativado, instala as bibliotecas necessárias:

```bash
pip install -r requirements.txt
```

### 2.3. Configurar as Variáveis de Ambiente (`.env`)
1. Na pasta `back-end`, faz uma cópia do ficheiro `.env.example` e chama-lhe `.env`.
2. Abre o ficheiro `.env` e preenche os dados:

```env
# Exemplo de configuração:
DATABASE_URL=postgresql+asyncpg://<TEU_USER>:<TUA_PASSWORD>@localhost/<NOME_DA_TUA_BD>
SECRET_KEY=gera_uma_chave_segura_aqui  # (Podes gerar com: python -c "import secrets; print(secrets.token_hex(32))")
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```
*(Substitui `<TEU_USER>`, `<TUA_PASSWORD>` e `<NOME_DA_TUA_BD>` pelos dados reais do teu PostgreSQL).*

### 2.4. Criar as tabelas na Base de Dados
Como o repositório já contém um ficheiro `schema.sql`, podes criar a estrutura da base de dados de duas formas:

**Opção A: Usar o `schema.sql` (Recomendado para setup rápido)**
Podes importar/executar o ficheiro `schema.sql` (disponível na raiz do projeto ou na pasta `back-end`) diretamente no teu PostgreSQL (via pgAdmin ou terminal) para criar todas as tabelas imediatamente.

**Opção B: Usar as Migrações (Alembic)**
Alternativamente, podes executar o Alembic para aplicar as migrações automaticamente pelo terminal:
```bash
alembic upgrade head
```

### 2.5. Popular a Base de Dados com os Seeds Iniciais
O projeto já possui *seeds* prontos na pasta `back-end` (`seed_data.py`, `seed_angola.py`, `seed_localidades.py`, `create_test_data.py`). Estes ficheiros servem para preencher a base de dados com informações predefinidas para que não comeces com a aplicação vazia.

Podes executá-los em sequência (dentro do teu terminal na pasta `back-end`):
```bash
python seed_angola.py
python seed_localidades.py
python seed_data.py
```

### 2.6. Iniciar o Servidor FastAPI
Corre o servidor:

```bash
uvicorn app.main:app --reload
```
Se tudo correr bem, o backend estará disponível em: **`http://localhost:8000`**
Podes testar e ver a documentação interativa da API em: **`http://localhost:8000/docs`**

---

## 🎨 Passo 3: Executar o Frontend (HTML/CSS/JS)

O frontend é composto por ficheiros web tradicionais que estão na pasta `front-end/public`.

1. No VS Code (ou noutro editor), navega até à pasta `front-end/public`.
2. Abre o ficheiro HTML principal (geralmente `index.html`).
3. Se usares o VS Code com a extensão **Live Server** instalada, clica com o botão direito no código do `index.html` e escolhe **"Open with Live Server"**.

Isso irá abrir o frontend no teu browser (geralmente em **`http://localhost:5500`** ou similar).

---

## ✅ Resumo / Checklist para Execução Rápida no Futuro

Sempre que quiseres apenas **ligar** o projeto (depois de já estar configurado):

1. **Backend:** Abre o terminal na pasta raiz do projeto, entra no `back-end`, ativa o `venv` e corre o servidor.
   ```bash
   cd back-end
   venv\Scripts\activate
   uvicorn app.main:app --reload
   ```
2. **Frontend:** Abre o `front-end/public/index.html` com o Live Server.
