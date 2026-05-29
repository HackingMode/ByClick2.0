/**
 * API Client para ByClick
 * Funções de integração com os endpoints do backend
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

function normalizarTelefone(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '').replace(/^00/, '');

  if (digitos.length === 9) {
    return `244${digitos}`;
  }

  if (digitos.length === 12 && digitos.startsWith('244')) {
    return digitos;
  }

  throw new Error('Numero de telefone invalido');
}

function extrairMensagemErro(error) {
  if (Array.isArray(error.data?.detail)) {
    return error.data.detail
      .map(item => item.msg || item.message || JSON.stringify(item))
      .join('\n');
  }

  if (error.data?.detail) {
    return error.data.detail;
  }

  if (typeof error.data === 'string') {
    return error.data;
  }

  return error.message;
}

// Função auxiliar para fazer requisições
async function apiCall(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Adicionar token se existir
  const token = localStorage.getItem('access_token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: result.detail || 'Erro na requisição',
        data: result
      };
    }

    return result;
  } catch (error) {
    if (error.status !== undefined) {
      throw error;
    }
    throw {
      status: 0,
      message: 'Erro de conexão com o servidor',
      error: error.message
    };
  }
}

// Registar novo comprador
async function registarComprador(dados) {
  try {
    const payload = {
      nome_completo: dados.nome_completo,
      nome_utilizador: dados.nome_utilizador,
      email: dados.email,
      numero_telefone: normalizarTelefone(dados.numero_telefone),
      senha: dados.senha,
      confirmar_senha: dados.confirmar_senha,
      data_nascimento: dados.data_nascimento || null,
      genero: dados.genero?.toLowerCase() || null,
    };

    const response = await apiCall('POST', '/auth/registar', payload);
    return {
      success: true,
      data: response,
      utilizador_id: response.utilizador_id,
      mensagem: response.mensagem
    };
  } catch (error) {
    // Extrair mensagem de erro mais clara
    const mensagemErro = extrairMensagemErro(error);

    return {
      success: false,
      error: mensagemErro,
      details: error.data,
      status: error.status
    };
  }
}

// Login
async function login(identificador, senha) {
  try {
    const identificadorNormalizado = validarEmail(identificador)
      ? identificador.trim().toLowerCase()
      : normalizarTelefone(identificador);

    const response = await apiCall('POST', '/auth/login', {
      identificador: identificadorNormalizado,
      senha
    });

    // Guardar tokens no localStorage
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('token_type', response.token_type);
      localStorage.setItem('login_timestamp', new Date().getTime());
    }

    return {
      success: true,
      data: response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Verificar código OTP
async function verificarCodigo(utilizadorId, codigo, tipo) {
  try {
    const response = await apiCall('POST', '/auth/verificar-codigo', {
      utilizador_id: utilizadorId,
      codigo,
      tipo
    });

    return {
      success: true,
      data: response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Obter dados do utilizador autenticado
async function obterMeuPerfil() {
  try {
    const response = await apiCall('GET', '/auth/me');
    return {
      success: true,
      data: response
    };
  } catch (error) {
    if (error.status === 401) {
      // Token expirado, limpar localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return {
      success: false,
      error: error.message
    };
  }
}

// Fazer logout
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_type');
  localStorage.removeItem('login_timestamp');
  window.location.href = '../login/';
}

// Verificar se está autenticado
function estaAutenticado() {
  return !!localStorage.getItem('access_token');
}

// Obter token de acesso
function obterToken() {
  return localStorage.getItem('access_token');
}

// Função para validar email
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Função para validar telefone angolano
function validarTelefone(telefone) {
  // Remove espaços e caracteres especiais
  const cleaned = telefone.replace(/\D/g, '');
  // Verifica se tem 9 ou 12 dígitos (com ou sem código de país)
  return cleaned.length === 9 || cleaned.length === 12;
}

// Função para validar identificador (email ou telefone)
function validarIdentificador(identificador) {
  return validarEmail(identificador) || validarTelefone(identificador);
}
