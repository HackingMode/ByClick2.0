# Sistema de Autenticação ByClick - Documentação

## Sumário das Implementações

Este documento descreve as melhorias implementadas no sistema de login e cadastro do ByClick Marketplace.

### ✅ Funcionalidades Implementadas

#### 1. **Sistema de Toast Global** (`toast.js`)
- Pop-ups estilizados para notificações de sucesso, erro, info e aviso
- Posicionamento bottom-right da tela
- Auto-desaparição após 3 segundos
- Ícones visuais para cada tipo de notificação
- Funciona em todas as páginas de formulários e login

#### 2. **Validações Melhoradas no Frontend**
- **Email**: Validação de formato
- **Telefone**: Validação de número angolano (9 ou 12 dígitos)
- **Senha**: Mínimo 8 caracteres
- **Confirmação de Senha**: Validação de correspondência
- **Campos Obrigatórios**: Verificação completa

#### 3. **Conexão com API Backend**
- Integração com endpoints REST do FastAPI
- Autenticação JWT com access_token e refresh_token
- Tratamento de erros específicos:
  - Email já registado
  - Nome de utilizador já existe
  - Telefone já registado
  - Credenciais inválidas no login
  - Conta desativada

#### 4. **Melhorias de UX**
- Loading overlay durante requisições
- Mensagens de erro específicas e amigáveis
- Desativação de botões durante envio
- Feedback visual com mudança de texto do botão
- Limpeza de erros ao editar campos

### 📝 Como Usar

#### Login
1. Aceda a `/login/`
2. Preencha email ou telefone
3. Insira a senha
4. Clique em "Iniciar Sessão"
5. Toast confirmará sucesso ou erro

#### Cadastro - Comprador
1. Aceda a `/cadastro/cadastro_comprador/`
2. Preencha os dados pessoais (3 etapas):
   - Etapa 1: Dados pessoais e endereço
   - Etapa 2: Foto de perfil
   - Etapa 3: Senha
3. Clique em "Enviar Cadastro"
4. Toast mostrará o resultado

#### Cadastro - Vendedor
1. Aceda a `/cadastro/cadastro_vendedor/`
2. Preencha os dados em 5 etapas

#### Cadastro - Empresa
1. Aceda a `/cadastro/cadastro_empresa/`
2. Preencha os dados em 6 etapas

### 🔧 Arquivos Modificados

#### Frontend
- `front-end/public/js/api.js` - Melhor tratamento de erros na API
- `front-end/public/js/login.js` - Validações e Toast integrados
- `front-end/public/js/script.js` - Sistema de validação e Toast
- `front-end/public/js/toast.js` - **NOVO**: Sistema global de Toast
- `front-end/public/login/index.html` - Scripts adicionados
- `front-end/public/cadastro/cadastro_comprador/index.html` - Scripts adicionados
- `front-end/public/cadastro/cadastro_vendedor/index.html` - Scripts adicionados
- `front-end/public/cadastro/cadastro_empresa/index.html` - Scripts adicionados

#### Backend
- Sem alterações - Sistema já está funcionando

### 🌐 Validações de Backend

O backend valida automaticamente via Pydantic:
- Confirmação de senhas (ambas devem ser iguais)
- Senha mínimo 8 caracteres
- Email em formato válido
- Campos obrigatórios

### 🔐 Segurança

- **Senhas**: Hash com bcrypt
- **Tokens**: JWT HS256 com expiração
- **Access Token**: 30 minutos
- **Refresh Token**: 7 dias
- **CORS**: Configurado para permitir frontend

### 📊 Fluxo de Autenticação

```
REGISTRO
↓
Validação Frontend (email, telefone, senha)
↓
Envio para API: POST /api/v1/auth/registar
↓
Validação Backend (Pydantic)
↓
Verificação de duplicatas (email, telefone, username)
↓
Hash de senha com bcrypt
↓
Criação do utilizador
↓
Geração de código OTP (não enviado por email por enquanto)
↓
Toast de sucesso → Redirecionamento para login

LOGIN
↓
Validação Frontend (email/telefone, senha)
↓
Envio para API: POST /api/v1/auth/login
↓
Busca de utilizador por email OU telefone
↓
Verificação de senha
↓
Verificação se conta está ativa
↓
Geração de JWT tokens
↓
Armazenamento em localStorage
↓
Toast de sucesso → Redirecionamento para home
```

### 🧪 Testando Localmente

1. **Backend**:
   ```bash
   cd back-end
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **Frontend**:
   - Servir arquivo estático na pasta `front-end/public/`
   - Abrir em navegador: `http://localhost:8000` (ou outra porta)

3. **Testar Fluxos**:
   - Cadastro: Preencher formulário e submeter
   - Login: Usar dados cadastrados
   - Erros: Tentar usar email/telefone duplicados

### 📍 Pontos de Integração

- **API Base URL**: `http://localhost:8000/api/v1`
- **Endpoints utilizados**:
  - `POST /auth/registar` - Registro de novo utilizador
  - `POST /auth/login` - Login
  - `GET /auth/me` - Obter dados do utilizador autenticado

### ⚠️ Próximos Passos (Futuro)

- [ ] Envio de email com código de verificação
- [ ] Endpoint de verificação de código OTP
- [ ] Cadastros de vendedor e empresa com validação completa
- [ ] Recuperação de senha
- [ ] Login social (Google, Facebook)
- [ ] Rate limiting na API

---

**Data de Implementação**: 2026-05-29
**Status**: ✅ Funcional
