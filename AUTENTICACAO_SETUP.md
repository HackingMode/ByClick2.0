# 🚀 Guia de Execução - ByClick Autenticação

## Prerequisitos

- PostgreSQL instalado e em execução
- Python 3.10+
- Git

## 📋 Checklist Antes de Começar

- [ ] PostgreSQL rodando em localhost:5432
- [ ] Base de dados `byclick_db` criada
- [ ] Usuário PostgreSQL `postgres` com senha `Ilevuosnof%40!`

### Criar Base de Dados (se não existir)

```bash
psql -U postgres -c "CREATE DATABASE byclick_db;"
```

## 🛠️ Configuração do Backend

### 1. Ativar Ambiente Virtual

```bash
cd back-end

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 3. Executar Migrações do Alembic

```bash
alembic upgrade head
```

Se tudo correr bem, deverá ver as tabelas criadas no PostgreSQL.

### 4. Iniciar Backend

```bash
uvicorn app.main:app --reload
```

Backend estará disponível em: **http://localhost:8000**

Documentação automática em: **http://localhost:8000/docs**

## 🌐 Configuração do Frontend

### 1. Navegar para a pasta

```bash
cd front-end
```

### 2. Iniciar servidor HTTP

**Opção A: Python (simples)**
```bash
python -m http.server 8080
```

**Opção B: VS Code Live Server**
- Instalar extensão "Live Server"
- Clicar botão direito em `public/index.html` → "Open with Live Server"

Frontend estará em: **http://localhost:8080/public/index.html**

## ✅ Teste End-to-End

### Fluxo 1: Cadastro de Novo Utilizador

1. Abrir: `http://localhost:8080/public/cadastro/cadastro_comprador/`
2. Preencher formulário (3 etapas):
   - Etapa 1: Dados pessoais (nome, email, telefone, etc)
   - Etapa 2: Foto de perfil (opcional)
   - Etapa 3: Senha (mín. 8 caracteres)
3. Clicar "Enviar Cadastro"
4. **Verificar no DevTools → Network**:
   - Deve fazer POST para `http://localhost:8000/api/v1/auth/registar`
   - Status 201 Created = Sucesso ✅
5. Se sucesso: Deve redirecionar para login em 2 segundos
6. **Verificar localStorage**:
   - Abrir DevTools → Application → Storage → Local Storage
   - Deve ter `access_token` armazenado

### Fluxo 2: Login

1. Abrir: `http://localhost:8080/public/login/`
2. Preencher:
   - Email ou Telefone (do utilizador registado)
   - Senha
3. Clicar "Iniciar Sessão"
4. **Verificar no DevTools → Network**:
   - Deve fazer POST para `http://localhost:8000/api/v1/auth/login`
   - Status 200 OK = Sucesso ✅
5. **Verificar localStorage**:
   - Deve ter `access_token` + `refresh_token`
6. Deve redirecionar para home (`/public/index.html`)

### Fluxo 3: Verificar Autenticação (Futuro)

Uma vez implementada a página de perfil/dashboard:

```javascript
// No DevTools Console
const token = localStorage.getItem('access_token');
fetch('http://localhost:8000/api/v1/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log)
```

## 🔍 Troubleshooting

### Erro: "CORS error"
- Backend: Certificar que CORS está ativado em `app/main.py`
- Frontend: Usar `http://localhost` (não IP)

### Erro: "Connection refused"
- Backend não está rodando? Testar: `curl http://localhost:8000/health`
- PostgreSQL não está rodando? Testar: `psql -U postgres`

### Erro: "Email já está registado"
- Usar um email/telefone diferente
- Ou limpar a base de dados: `alembic downgrade base && alembic upgrade head`

### Erro: "Credenciais inválidas"
- Certificar que o email/telefone está correto
- Password é case-sensitive

## 📁 Estrutura de Ficheiros Criados

### Backend
- ✅ `/back-end/app/api/v1/endpoints/auth.py` - Endpoint GET `/me` adicionado

### Frontend
- ✅ `/front-end/public/login/index.html` - Página de login
- ✅ `/front-end/public/css/login.css` - Estilos de login
- ✅ `/front-end/public/js/api.js` - Funções de API (registar, login, etc)
- ✅ `/front-end/public/js/login.js` - Lógica da página de login
- ✅ `/front-end/public/js/script.js` - Modificado para conectar cadastro

## 🎯 Próximos Passos (Futuro)

1. **Endpoint de Reset de Senha**
2. **Página de Perfil/Dashboard**
3. **Autenticação Social (Google, Facebook)**
4. **Verificação de Email (OTP)**
5. **2FA (Two-Factor Authentication)**
6. **Rate Limiting nos Logins**

---

**Dúvidas?** Consulte a documentação da API em `http://localhost:8000/docs`
