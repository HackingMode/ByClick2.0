/**
 * Painel do Comprador - ByClick
 */

function verificarAutenticacao() {
  if (!estaAutenticado()) {
    window.location.href = '../../login/';
    return false;
  }
  return true;
}

async function carregarDadosPainel() {
  if (!verificarAutenticacao()) return;

  try {
    const [user, pedidos] = await Promise.allSettled([
      obterMeuPerfil(),
      apiCall('GET', '/comprador/meus-pedidos?limit=10').then(data => ({ success: true, data })).catch(() => ({ success: false }))
    ]);

    if (user.status === 'fulfilled' && user.value.success) {
      atualizarPerfilUsuario(user.value.data);
    }

    if (pedidos.status === 'fulfilled' && pedidos.value.success) {
      atualizarTabelaPedidos(pedidos.value.data);
    }
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

function atualizarTabelaPedidos(pedidos) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!pedidos || pedidos.length === 0) return; // keep the default empty state

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
      <td class="order-id">#${p.numero_pedido || p.id}</td>
      <td>${p.vendedor_nome || 'Vendedor'}</td>
      <td><b>${(p.valor_total || 0).toLocaleString('pt-AO')} Kz</b></td>
      <td><span class="status ${statusClasses[p.status] || 's-proc'}"><span class="dot"></span>${statusLabels[p.status] || p.status}</span></td>
      <td style="color:var(--text-muted)">${p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-AO') : '—'}</td>
    </tr>
  `).join('');

  // Update counts
  const ordersEl = document.querySelector('[data-orders-count]');
  const pendingEl = document.querySelector('[data-pending-count]');
  const deliveredEl = document.querySelector('[data-delivered-count]');
  if (ordersEl) ordersEl.textContent = pedidos.length;
  if (pendingEl) pendingEl.textContent = pedidos.filter(p => ['pendente','confirmado','em_processamento','enviado'].includes(p.status)).length;
  if (deliveredEl) deliveredEl.textContent = pedidos.filter(p => p.status === 'entregue').length;
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

  carregarDadosPainel();
});
