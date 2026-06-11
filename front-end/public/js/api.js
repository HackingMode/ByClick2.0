/**
 * API Client para Kitanda.
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
    let identificadorNormalizado = identificador.trim();
    if (validarEmail(identificadorNormalizado)) {
      identificadorNormalizado = identificadorNormalizado.toLowerCase();
    } else {
      // Se tiver apenas digitos e '+' entao tenta normalizar como telefone
      if (/^[\+\d\s]+$/.test(identificadorNormalizado)) {
        try {
          identificadorNormalizado = normalizarTelefone(identificadorNormalizado);
        } catch (e) {
          // Ignora erro e envia como nome de utilizador
        }
      }
    }

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


// ─────────────────────── CATEGORIAS ───────────────────────

async function obterCategorias(tipo = null) {
  try {
    let endpoint = '/categorias';
    if (tipo) endpoint += `?tipo=${tipo}`;
    const response = await apiCall('GET', endpoint);
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ─────────────────────── PEDIDOS COMPRADOR ───────────────────────

async function obterMeusPedidosComprador(limit = 20) {
  try {
    const response = await apiCall('GET', `/pedidos/meus-pedidos?limit=${limit}`);
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ─────────────────────── AVALIAÇÕES ───────────────────────

async function criarAvaliacao(dados) {
  try {
    const response = await apiCall('POST', '/avaliacoes', dados);
    return { success: true, data: response };
  } catch (error) {
    return respostaErro(error);
  }
}

async function obterAvaliacoes(filtros = {}) {
  try {
    let endpoint = '/avaliacoes?';
    if (filtros.vendedor_id) endpoint += `vendedor_id=${filtros.vendedor_id}&`;
    if (filtros.produto_id) endpoint += `produto_id=${filtros.produto_id}&`;
    if (filtros.servico_id) endpoint += `servico_id=${filtros.servico_id}&`;
    if (filtros.limit) endpoint += `limit=${filtros.limit}&`;

    const response = await apiCall('GET', endpoint.slice(0, -1));
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ─────────────────────── CRIAR/EDITAR PRODUTOS E SERVIÇOS ───────────────────────

async function criarProduto(dados) {
  try {
    const response = await apiCall('POST', '/produtos/', dados);
    return { success: true, data: response };
  } catch (error) {
    return respostaErro(error);
  }
}

async function editarProduto(produtoId, dados) {
  try {
    const response = await apiCall('PUT', `/produtos/${produtoId}`, dados);
    return { success: true, data: response };
  } catch (error) {
    return respostaErro(error);
  }
}

async function eliminarProduto(produtoId) {
  try {
    await apiCall('DELETE', `/produtos/${produtoId}`);
    return { success: true };
  } catch (error) {
    return respostaErro(error);
  }
}

async function criarServico(dados) {
  try {
    const response = await apiCall('POST', '/servicos/', dados);
    return { success: true, data: response };
  } catch (error) {
    return respostaErro(error);
  }
}

async function editarServico(servicoId, dados) {
  try {
    const response = await apiCall('PUT', `/servicos/${servicoId}`, dados);
    return { success: true, data: response };
  } catch (error) {
    return respostaErro(error);
  }
}

async function eliminarServico(servicoId) {
  try {
    await apiCall('DELETE', `/servicos/${servicoId}`);
    return { success: true };
  } catch (error) {
    return respostaErro(error);
  }
}

// ─────────────────────── UI UTILS ───────────────────────

function showConfirmModal(title, message, onConfirm, btnText = 'Confirmar', iconClass = 'fa-solid fa-arrow-right-from-bracket') {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '99999';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.25s ease';

  const modal = document.createElement('div');
  modal.style.backgroundColor = '#fff';
  modal.style.borderRadius = '24px';
  modal.style.padding = '32px';
  modal.style.width = '90%';
  modal.style.maxWidth = '420px';
  modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
  modal.style.transform = 'scale(0.95) translateY(10px)';
  modal.style.transition = 'transform 0.25s ease';
  modal.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
  modal.style.color = '#1A1208';
  modal.style.textAlign = 'center';

  const iconContainer = document.createElement('div');
  iconContainer.style.width = '64px';
  iconContainer.style.height = '64px';
  iconContainer.style.borderRadius = '50%';
  iconContainer.style.backgroundColor = '#fff0ea';
  iconContainer.style.color = '#C84B1F';
  iconContainer.style.display = 'flex';
  iconContainer.style.alignItems = 'center';
  iconContainer.style.justifyContent = 'center';
  iconContainer.style.margin = '0 auto 20px';
  iconContainer.style.fontSize = '24px';
  iconContainer.innerHTML = `<i class="${iconClass}"></i>`;

  const titleEl = document.createElement('h3');
  titleEl.innerText = title;
  titleEl.style.margin = '0 0 12px 0';
  titleEl.style.fontSize = '1.35rem';
  titleEl.style.fontWeight = '700';
  
  const msgEl = document.createElement('p');
  msgEl.innerText = message;
  msgEl.style.margin = '0 0 28px 0';
  msgEl.style.color = '#5C4E3A';
  msgEl.style.lineHeight = '1.6';
  msgEl.style.fontSize = '0.95rem';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '12px';
  actions.style.justifyContent = 'center';

  const btnCancel = document.createElement('button');
  btnCancel.innerText = 'Cancelar';
  btnCancel.style.padding = '14px 24px';
  btnCancel.style.border = 'none';
  btnCancel.style.borderRadius = '999px';
  btnCancel.style.backgroundColor = '#f4f4f5';
  btnCancel.style.color = '#1A1208';
  btnCancel.style.fontWeight = '600';
  btnCancel.style.cursor = 'pointer';
  btnCancel.style.transition = 'background 0.2s';
  btnCancel.style.flex = '1';
  btnCancel.onmouseover = () => btnCancel.style.backgroundColor = '#e4e4e7';
  btnCancel.onmouseout = () => btnCancel.style.backgroundColor = '#f4f4f5';

  const btnOk = document.createElement('button');
  btnOk.innerText = btnText;
  btnOk.style.padding = '14px 24px';
  btnOk.style.border = 'none';
  btnOk.style.borderRadius = '999px';
  btnOk.style.backgroundColor = '#C84B1F';
  btnOk.style.color = '#fff';
  btnOk.style.fontWeight = '600';
  btnOk.style.cursor = 'pointer';
  btnOk.style.transition = 'background 0.2s';
  btnOk.style.flex = '1';
  btnOk.onmouseover = () => btnOk.style.backgroundColor = '#A03A14';
  btnOk.onmouseout = () => btnOk.style.backgroundColor = '#C84B1F';

  const closeModal = () => {
    overlay.style.opacity = '0';
    modal.style.transform = 'scale(0.95) translateY(10px)';
    setTimeout(() => overlay.remove(), 250);
  };

  btnCancel.onclick = closeModal;
  btnOk.onclick = () => {
    closeModal();
    if(onConfirm) onConfirm();
  };

  actions.appendChild(btnCancel);
  actions.appendChild(btnOk);
  
  modal.appendChild(iconContainer);
  modal.appendChild(titleEl);
  modal.appendChild(msgEl);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1) translateY(0)';
  });
}

// ─────────────────────── NOVO: HEADERS & FORMATOS ───────────────────────

function getToken() {
  return localStorage.getItem('access_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

function publicHeaders() {
  return { 'Content-Type': 'application/json' };
}

function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-AO').format(valor || 0) + ' Kz';
}

// ─────────────────────── NOVO: CARRINHO LOCALSTORAGE ───────────────────────

function getCarrinho() {
  return JSON.parse(localStorage.getItem('kitanda_carrinho') || '{"itens":[]}');
}

function salvarCarrinho(carrinho) {
  localStorage.setItem('kitanda_carrinho', JSON.stringify(carrinho));
  // Dispara evento global para atualizar ícones de carrinho na navbar
  window.dispatchEvent(new Event('carrinhoAtualizado'));
}

function adicionarAoCarrinho(item) {
  const carrinho = getCarrinho();
  const existente = carrinho.itens.find(i => i.id === item.id && i.tipo === item.tipo);
  
  if (existente && item.tipo === 'produto') {
    existente.quantidade += item.quantidade || 1;
  } else {
    carrinho.itens.push({ ...item, quantidade: item.quantidade || 1 });
  }
  salvarCarrinho(carrinho);
}

function removerDoCarrinho(id, tipo) {
  const carrinho = getCarrinho();
  carrinho.itens = carrinho.itens.filter(i => !(String(i.id) === String(id) && i.tipo === tipo));
  salvarCarrinho(carrinho);
}

function totalCarrinho() {
  return getCarrinho().itens.reduce((acc, i) => acc + ((i.preco || 0) * (i.quantidade || 1)), 0);
}

