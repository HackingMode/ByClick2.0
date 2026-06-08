/**
 * API Client para ByClick.
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

function respostaErro(error) {
  return {
    success: false,
    error: extrairMensagemErro(error),
    details: error.data,
    status: error.status
  };
}

async function apiCall(method, endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
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
        message: result.detail || 'Erro na requisicao',
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
      message: 'Erro de conexao com o servidor',
      error: error.message
    };
  }
}

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
      provincia: dados.provincia || null,
      municipio: dados.municipio || null,
      bairro: dados.bairro || null,
      endereco_completo: dados.endereco_completo || null,
      nif: dados.nif || null,
    };

    const response = await apiCall('POST', '/auth/registar-comprador', payload);

    if (typeof showToast === 'function') {
      showToast('Cadastro realizado com sucesso! Redirecionando...', 'success');
    }

    setTimeout(() => {
      window.location.href = '../../login/?novo=true&tipo=comprador';
    }, 2000);

    return {
      success: true,
      data: response,
      utilizador_id: response.utilizador_id,
      mensagem: response.mensagem
    };
  } catch (error) {
    return respostaErro(error);
  }
}

async function registarVendedor(dados) {
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
      provincia: dados.provincia || null,
      municipio: dados.municipio || null,
      bairro: dados.bairro || null,
      endereco_completo: dados.endereco_completo || null,
      nif: dados.nif || null,
      numero_bi: dados.numero_bi,
      data_emissao: dados.data_emissao,
      data_validade: dados.data_validade,
      nome_loja: dados.nome_loja || dados.nome_utilizador,
      descricao_loja: dados.descricao_loja || null,
      tipo_loja: dados.tipo_loja || 'produtos'
    };

    const response = await apiCall('POST', '/auth/registar-vendedor', payload);

    if (typeof showToast === 'function') {
      showToast('Cadastro de vendedor realizado com sucesso! Redirecionando...', 'success');
    }

    setTimeout(() => {
      window.location.href = '../../login/?novo=true&tipo=vendedor';
    }, 2000);

    return {
      success: true,
      data: response,
      utilizador_id: response.utilizador_id,
      mensagem: response.mensagem
    };
  } catch (error) {
    return respostaErro(error);
  }
}

async function registarEmpresa(dados) {
  try {
    const payload = {
      nome_empresa: dados.nome_empresa,
      nif: dados.nif,
      tipo_empresa: dados.tipo_empresa || null,
      categoria_principal: dados.categoria_principal || null,
      data_criacao: dados.data_criacao || null,
      provincia: dados.provincia,
      municipio: dados.municipio,
      website: dados.website || null,
      telefone: normalizarTelefone(dados.telefone),
      email: dados.email,
      whatsapp: dados.whatsapp ? normalizarTelefone(dados.whatsapp) : null,
      representante_nome: dados.representante_nome,
      representante_cargo: dados.representante_cargo,
      representante_bi: dados.representante_bi,
      representante_nif: dados.representante_nif || null,
      representante_telefone: dados.representante_telefone ? normalizarTelefone(dados.representante_telefone) : null,
      representante_email: dados.representante_email || null,
      descricao: dados.descricao || null,
      iban: dados.iban || null,
      titular_conta: dados.titular_conta || null,
      numero_express: dados.numero_express || null,
      paypay_entidade: dados.paypay_entidade || null,
      paypay_referencia: dados.paypay_referencia || null,
      senha: dados.senha,
      confirmar_senha: dados.confirmar_senha,
      nome_utilizador: dados.nome_utilizador || null,
      tipo_loja: dados.tipo_loja || 'ambos'
    };

    const response = await apiCall('POST', '/auth/registar-empresa', payload);

    if (typeof showToast === 'function') {
      showToast('Cadastro de empresa realizado com sucesso! Redirecionando...', 'success');
    }

    setTimeout(() => {
      window.location.href = '../../login/?novo=true&tipo=empresa';
    }, 2000);

    return {
      success: true,
      data: response,
      utilizador_id: response.utilizador_id,
      mensagem: response.mensagem
    };
  } catch (error) {
    return respostaErro(error);
  }
}


async function login(identificador, senha) {
  try {
    const identificadorNormalizado = validarEmail(identificador)
      ? identificador.trim().toLowerCase()
      : normalizarTelefone(identificador);

    const response = await apiCall('POST', '/auth/login', {
      identificador: identificadorNormalizado,
      senha
    });

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

async function obterMeuPerfil() {
  try {
    const response = await apiCall('GET', '/auth/me');
    return {
      success: true,
      data: response
    };
  } catch (error) {
    if (error.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }

    return {
      success: false,
      error: error.message
    };
  }
}

async function obterDadosVendedor() {
  try {
    const response = await apiCall('GET', '/vendedor/minha-loja');
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

async function obterDadosEmpresa() {
  try {
    const response = await apiCall('GET', '/empresa/minha-empresa');
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

async function obterProdutos(filtros = {}) {
  try {
    let endpoint = '/produtos?';
    if (filtros.vendedor_id) endpoint += `vendedor_id=${filtros.vendedor_id}&`;
    if (filtros.categoria_id) endpoint += `categoria_id=${filtros.categoria_id}&`;
    if (filtros.limit) endpoint += `limit=${filtros.limit}&`;

    const response = await apiCall('GET', endpoint.slice(0, -1));
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

async function obterPedidos(filtros = {}) {
  try {
    let endpoint = '/pedidos?';
    if (filtros.vendedor_id) endpoint += `vendedor_id=${filtros.vendedor_id}&`;
    if (filtros.status) endpoint += `status=${filtros.status}&`;
    if (filtros.limit) endpoint += `limit=${filtros.limit}&`;

    const response = await apiCall('GET', endpoint.slice(0, -1));
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

async function obterEstatisticas(tipo = 'vendedor') {
  try {
    const endpoint = tipo === 'empresa'
      ? '/empresa/minhas-estatisticas/dashboard'
      : '/vendedor/minhas-estatisticas/dashboard';

    const response = await apiCall('GET', endpoint);
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

async function obterMeusPedidos(tipo = 'vendedor', limit = 10) {
  try {
    const endpoint = tipo === 'empresa'
      ? `/empresa/meus-pedidos/recentes?limit=${limit}`
      : `/vendedor/meus-pedidos/recentes?limit=${limit}`;

    const response = await apiCall('GET', endpoint);
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

function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token_type');
  localStorage.removeItem('login_timestamp');
  localStorage.removeItem('usuario');
  // Smart redirect: find login path relative to current page
  const path = window.location.pathname;
  if (path.includes('/paineis/')) {
    window.location.href = '../../login/';
  } else if (path.includes('/explorar/') || path.includes('/produto/')) {
    window.location.href = '../login/';
  } else {
    window.location.href = '/login/';
  }
}

function estaAutenticado() {
  return !!localStorage.getItem('access_token');
}

function obterToken() {
  return localStorage.getItem('access_token');
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email || '').trim());
}

function validarTelefone(telefone) {
  try {
    normalizarTelefone(telefone);
    return true;
  } catch (error) {
    return false;
  }
}

function validarIdentificador(identificador) {
  return validarEmail(identificador) || validarTelefone(identificador);
}
