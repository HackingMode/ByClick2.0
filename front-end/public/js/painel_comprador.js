/**
 * Painel do Comprador - ByClick
 */

let pedidosProdutos = [];
let pedidosServicos = [];

function verificarAutenticacao() {
  if (!estaAutenticado()) {
    window.location.href = '../../login/';
    return false;
  }
  return true;
}

// ===== MODAL PERFIL =====
function setupModalPerfil() {
    const btnEdit = document.querySelector('.btn-edit');
    const modal = document.getElementById('modalEditarPerfil');
    const closeBtn = document.querySelector('#modalEditarPerfil .close-modal');
    const form = document.getElementById('formEditarPerfil');

    if (!btnEdit || !modal) return;

    btnEdit.addEventListener('click', async () => {
        try {
            const user = await obterMeuPerfil();
            if (user) {
                document.getElementById('editNome').value = user.nome_completo || '';
                document.getElementById('editTelefone').value = user.numero_telefone || '';
                if (user.endereco) {
                    document.getElementById('editProvincia').value = user.endereco.provincia || '';
                    document.getElementById('editMunicipio').value = user.endereco.municipio || '';
                    document.getElementById('editBairro').value = user.endereco.bairro || '';
                }
                modal.classList.add('active');
            }
        } catch(e) {
            showToast('Erro ao carregar dados do perfil.', 'error');
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmitEditPerfil');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        const payload = {
            nome_completo: document.getElementById('editNome').value,
            numero_telefone: document.getElementById('editTelefone').value,
            provincia: document.getElementById('editProvincia').value,
            municipio: document.getElementById('editMunicipio').value,
            bairro: document.getElementById('editBairro').value
        };

        try {
            const res = await apiCall('PUT', '/comprador/meu-perfil', payload);
            if (res) {
                showToast('Perfil atualizado com sucesso!', 'success');
                modal.classList.remove('active');
                carregarDadosPainel(); // Recarregar perfil
            }
        } catch (error) {
            showToast('Erro ao atualizar perfil.', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
        }
    });
}

async function carregarDadosPainel() {
  if (!verificarAutenticacao()) return;

  try {
    const [user, reqPedidosProd, reqPedidosServ] = await Promise.allSettled([
      obterMeuPerfil(),
      apiCall('GET', '/comprador/meus-pedidos?limit=10'),
      apiCall('GET', '/comprador/meus-pedidos/servicos?limit=10')
    ]);

    if (user.status === 'fulfilled' && user.value) {
      atualizarPerfilUsuario(user.value);
    }

    if (reqPedidosProd.status === 'fulfilled') {
      pedidosProdutos = reqPedidosProd.value || [];
    }
    
    if (reqPedidosServ.status === 'fulfilled') {
      pedidosServicos = reqPedidosServ.value || [];
    }

    atualizarTabelaPedidos(pedidosProdutos, 'produto');
    atualizarEstatisticasGerais();
  } catch (erro) {
    console.error('Erro ao carregar dados:', erro);
  }
}

function atualizarPerfilUsuario(usuario) {
  const nome = usuario.nome_completo || usuario.nome_utilizador || 'Comprador';
  const primeiroNome = nome.split(' ')[0];

  // Sidebar
  const sideNameEl = document.querySelector('[data-user-name]');
  const sideFotoEl = document.querySelector('[data-user-photo]');
  if (sideNameEl) sideNameEl.textContent = nome;
  if (sideFotoEl && usuario.foto_perfil_url) sideFotoEl.src = usuario.foto_perfil_url;

  // Greeting
  const greetEl = document.querySelector('[data-greeting]');
  if (greetEl) greetEl.textContent = `Olá, ${primeiroNome}! 👋`;

  // Profile card
  const profNameEl = document.querySelector('[data-profile-name]');
  const profEmailEl = document.querySelector('[data-profile-email]');
  const profPhoneEl = document.querySelector('[data-profile-phone]');
  const profFotoEl = document.querySelector('[data-profile-photo]');
  const profVerEl = document.querySelector('[data-profile-verified]');
  const membroEl = document.querySelector('[data-member-since]');

  if (profNameEl) profNameEl.textContent = nome;
  if (profEmailEl) profEmailEl.textContent = usuario.email || '—';
  if (profPhoneEl) profPhoneEl.textContent = usuario.numero_telefone || '—';
  if (profFotoEl && usuario.foto_perfil_url) profFotoEl.src = usuario.foto_perfil_url;
  if (profVerEl) profVerEl.textContent = usuario.email_verificado ? '✓ Verificado' : 'Não verificado';
  if (membroEl && usuario.criado_em) {
    membroEl.textContent = new Date(usuario.criado_em).toLocaleDateString('pt-AO');
  }
}

function atualizarTabelaPedidos(pedidos, tipo) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #999; padding: 2rem;">
            <div class="empty-state">
                <i class="fa-solid fa-bag-shopping"></i>
                <p>Nenhum pedido de ${tipo} encontrado.<br><a href="../../explorar/" style="color: var(--blue); text-decoration: none; font-weight: 600;">Explorar →</a></p>
            </div>
        </td>
      </tr>`;
    return;
  }

  const statusClasses = {
    'pendente': 's-proc', 'confirmado': 's-pago', 'em_processamento': 's-proc',
    'enviado': 's-envio', 'entregue': 's-entregue', 'cancelado': 's-cancel'
  };
  const statusLabels = {
    'pendente': 'Pendente', 'confirmado': 'Confirmado', 'em_processamento': 'Processando',
    'enviado': 'Em envio', 'entregue': 'Entregue', 'cancelado': 'Cancelado'
  };

  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td style="font-weight: 500;">
        ${p.numero_pedido || p.id}
      </td>
      <td>${tipo === 'servico' ? '<span style="color:var(--purple);"><i class="fa-solid fa-briefcase"></i> Serviço</span>' : '<span style="color:var(--text-light);"><i class="fa-solid fa-box"></i> Produto</span>'}</td>
      <td><b>${(p.valor_total || 0).toLocaleString('pt-AO')} Kz</b></td>
      <td><span class="status ${statusClasses[p.status] || 's-proc'}"><span class="dot"></span>${statusLabels[p.status] || p.status}</span></td>
      <td style="color:var(--text-muted)">${p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-AO') : '—'}</td>
    </tr>
  `).join('');
}

function atualizarEstatisticasGerais() {
  const todosPedidos = [...pedidosProdutos, ...pedidosServicos];
  
  const ordersEl = document.querySelector('[data-orders-count]');
  const pendingEl = document.querySelector('[data-pending-count]');
  const deliveredEl = document.querySelector('[data-delivered-count]');
  
  if (ordersEl) ordersEl.textContent = todosPedidos.length;
  if (pendingEl) pendingEl.textContent = todosPedidos.filter(p => ['pendente','confirmado','em_processamento','enviado'].includes(p.status)).length;
  if (deliveredEl) deliveredEl.textContent = todosPedidos.filter(p => p.status === 'entregue').length;
}

document.addEventListener('DOMContentLoaded', function() {
  if (!verificarAutenticacao()) return;

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const toggle = document.getElementById('menuToggle');
  const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
  const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
  toggle?.addEventListener('click', () => sidebar.classList.contains('active') ? close() : open());
  overlay?.addEventListener('click', close);

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Tem certeza que deseja terminar a sessão?')) logout();
  });

  // Tabs
  const tabProd = document.getElementById('tabProdutos');
  const tabServ = document.getElementById('tabServicos');
  if (tabProd && tabServ) {
    tabProd.addEventListener('click', () => {
      tabProd.classList.add('active');
      tabServ.classList.remove('active');
      atualizarTabelaPedidos(pedidosProdutos, 'produto');
    });
    tabServ.addEventListener('click', () => {
      tabServ.classList.add('active');
      tabProd.classList.remove('active');
      atualizarTabelaPedidos(pedidosServicos, 'servico');
    });
    }

  setupModalPerfil();
  carregarDadosPainel();
});
