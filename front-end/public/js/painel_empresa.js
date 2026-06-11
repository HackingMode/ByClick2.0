/**
 * Painel Empresarial - Kitanda
 * Carrega dados reais da API e atualiza o dashboard da empresa.
 */

let autoRefreshInterval = null;
let charts = {};

// ===== AUTH CHECK =====
function verificarAutenticacao() {
  if (!estaAutenticado()) {
    window.location.href = '../../login/';
    return false;
  }
  return true;
}

// ===== DATA LOADING =====
async function carregarDadosPainel() {
  if (!verificarAutenticacao()) return;

  try {
    const [user, empresa, stats, pedidos] = await Promise.allSettled([
      obterMeuPerfil(),
      obterDadosEmpresa(),
      obterEstatisticas('empresa'),
      obterMeusPedidos('empresa', 10)
    ]);

    if (user.status === 'fulfilled' && user.value.success) {
      atualizarPerfilUsuario(user.value.data);
    }

    if (empresa.status === 'fulfilled' && empresa.value.success) {
      atualizarDadosEmpresa(empresa.value.data);
    }

    if (stats.status === 'fulfilled' && stats.value.success) {
      atualizarEstatisticas(stats.value.data);
    }

    if (pedidos.status === 'fulfilled' && pedidos.value.success) {
      atualizarTabelaPedidos(pedidos.value.data);
    }
  } catch (erro) {
    console.error('Erro ao carregar dados do painel:', erro);
  }

  atualizarData();
}

// ===== UPDATE UI =====
function atualizarPerfilUsuario(usuario) {
  const nomeEl = document.querySelector('[data-user-name]');
  const fotoEl = document.querySelector('[data-user-photo]');
  const greetEl = document.querySelector('[data-greeting]');

  const nome = usuario.nome_completo || usuario.nome_utilizador || 'Administrador';
  const primeiroNome = nome.split(' ')[0];

  if (nomeEl) nomeEl.textContent = nome;
  if (fotoEl && usuario.foto_perfil_url) fotoEl.src = usuario.foto_perfil_url;
  if (greetEl) greetEl.textContent = `Bem-vindo, ${primeiroNome}! 👋`;
}

function atualizarDadosEmpresa(empresa) {
  // The API returns PerfilVendedorResponseSchema — field is nome_loja, not nome_empresa
  const nomeEl = document.querySelector('[data-store-name]');
  const descEl = document.querySelector('[data-store-desc]');
  const logoEl = document.querySelector('[data-store-logo]');
  const verEl = document.querySelector('[data-store-verified]');
  const statusEl = document.querySelector('[data-store-status]');
  const tipoEl = document.querySelector('[data-store-type]');
  const membroEl = document.querySelector('[data-member-since]');

  const nomeEmpresa = empresa.nome_loja || 'Sua Empresa';

  if (nomeEl) nomeEl.textContent = nomeEmpresa;
  if (descEl) descEl.textContent = empresa.descricao_loja || 'Descrição não disponível';
  if (logoEl) logoEl.textContent = nomeEmpresa.substring(0, 3).toUpperCase();

  if (verEl) {
    if (empresa.verificado) {
      verEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Empresa Verificada';
      verEl.style.color = '#16a34a';
    } else {
      verEl.innerHTML = '<i class="fa-solid fa-clock"></i> Aguardando verificação';
      verEl.style.color = '#ea580c';
    }
  }

  if (statusEl) {
    statusEl.textContent = empresa.verificado ? 'Verificada' : 'Pendente';
    statusEl.classList.toggle('green', empresa.verificado);
  }

  const lojaMap = { 'produtos': 'Produtos', 'servicos': 'Serviços', 'ambos': 'Produtos & Serviços' };
  if (tipoEl) tipoEl.textContent = lojaMap[empresa.tipo_loja] || 'Empresa';

  if (membroEl && empresa.criado_em) {
    membroEl.textContent = new Date(empresa.criado_em).toLocaleDateString('pt-AO');
  }
}

function atualizarEstatisticas(stats) {
  const prodEl = document.querySelector('[data-products-count]');
  const servEl = document.querySelector('[data-services-count]');
  const pedidosEl = document.querySelector('[data-orders-count]');
  const receitaEl = document.querySelector('[data-revenue]');
  const ratingEl = document.querySelector('[data-rating]');
  const totalEl = document.querySelector('[data-total-sales]');

  if (prodEl) prodEl.textContent = stats.produtos_count || 0;
  if (servEl) servEl.textContent = stats.servicos_count || 0;
  if (pedidosEl) pedidosEl.textContent = stats.pedidos_mes || 0;
  if (receitaEl) receitaEl.textContent = `${(stats.receita_mes || 0).toLocaleString('pt-AO')} Kz`;
  if (ratingEl) ratingEl.textContent = (stats.avaliacao_media || 0).toFixed(1);
  if (totalEl) totalEl.textContent = stats.total_vendas || 0;
}

function atualizarTabelaPedidos(pedidos) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:2rem;">Nenhum pedido recente</td></tr>';
    return;
  }

  const statusClasses = {
    'pendente': 's-proc', 'confirmado': 's-pago', 'em_processamento': 's-proc',
    'enviado': 's-envio', 'entregue': 's-entregue', 'cancelado': 's-cancel', 'reembolsado': 's-cancel'
  };
  const statusLabels = {
    'pendente': 'Pendente', 'confirmado': 'Confirmado', 'em_processamento': 'Processando',
    'enviado': 'Em envio', 'entregue': 'Entregue', 'cancelado': 'Cancelado', 'reembolsado': 'Reembolsado'
  };

  tbody.innerHTML = pedidos.map(p => {
    let selectOptions = '';
    const statusValidos = ['pendente', 'confirmado', 'em_processamento', 'enviado', 'entregue', 'cancelado', 'reembolsado'];
    statusValidos.forEach(s => {
        selectOptions += `<option value="${s}" ${p.status === s ? 'selected' : ''}>${statusLabels[s]}</option>`;
    });

    const isServico = p.tipo === 'servico';
    const tipoPath = isServico ? 'servicos' : 'produtos';

    return `
    <tr>
        <td style="font-weight: 500;">
          ${p.numero_pedido}
          ${isServico ? '<br><small style="color:var(--purple);font-size:0.75rem;"><i class="fa-solid fa-briefcase"></i> Serviço</small>' : '<br><small style="color:var(--text-light);font-size:0.75rem;"><i class="fa-solid fa-box"></i> Produto</small>'}
        </td>
        <td>${p.cliente_nome}</td>
        <td><b>${(p.valor_total || 0).toLocaleString('pt-AO')} Kz</b></td>
      <td><span class="status ${statusClasses[p.status] || 's-proc'}"><span class="dot"></span>${statusLabels[p.status] || p.status}</span></td>
      <td style="color:var(--text-muted)">${p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-AO') : '—'}</td>
      <td>
        <select onchange="atualizarStatusPedido(${p.id}, '${tipoPath}', this.value)" style="padding:4px; border-radius:4px; border:1px solid var(--border); font-size:0.75rem;">
            ${selectOptions}
        </select>
      </td>
    </tr>
  `}).join('');
}

async function atualizarStatusPedido(id, tipo, novoStatus) {
    try {
        const res = await apiCall('PUT', `/pedidos/${tipo}/${id}/status`, { status: novoStatus });
        if (res) {
            showToast('Status atualizado com sucesso!', 'success');
            carregarDadosPainel(); // Recarregar tabela
        }
    } catch (e) {
        showToast('Erro ao atualizar status.', 'error');
        carregarDadosPainel(); // Reset para o valor original
    }
}

function atualizarData() {
  const dateEl = document.querySelector('[data-current-date]');
  if (!dateEl) return;

  const hoje = new Date();
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dataStr = `${hoje.getDate()} de ${meses[hoje.getMonth()]}, ${hoje.getFullYear()}`;
  const horaStr = hoje.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
  dateEl.textContent = `${dataStr}  |  ${horaStr}`;
}

// ===== CHARTS =====
function obterUltimos9Dias() {
  const dias = [];
  for (let i = 8; i >= 0; i--) {
    const data = new Date();
    data.setDate(data.getDate() - i);
    dias.push(data.toLocaleDateString('pt-AO', { month: '2-digit', day: '2-digit' }));
  }
  return dias;
}

function atualizarGraficos() {
  if (charts.revenue) { charts.revenue.data.labels = obterUltimos9Dias(); charts.revenue.update(); }
  if (charts.orders) charts.orders.update();
  if (charts.categories) charts.categories.update();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  if (!verificarAutenticacao()) return;

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const toggle = document.getElementById('menuToggle');
  const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
  const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
  toggle?.addEventListener('click', () => sidebar.classList.contains('active') ? close() : open());
  overlay?.addEventListener('click', close);

  // Chart tab switching
  document.querySelectorAll('.chart-tab').forEach(t => t.addEventListener('click', function() {
    document.querySelectorAll('.chart-tab').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
  }));

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', function(e) {
    e.preventDefault();
    showConfirmModal('Terminar Sessão', 'Tem certeza que deseja terminar a sua sessão?', logout, 'Terminar Sessão');
  });

  // Load data
  carregarDadosPainel();

  // Auto-refresh
  autoRefreshInterval = setInterval(() => { carregarDadosPainel(); atualizarGraficos(); }, 45000);

  // Manual refresh
  const refreshBtn = document.querySelector('[data-refresh-btn]');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.querySelector('i').style.animation = 'spin 0.5s ease';
      carregarDadosPainel().then(() => {
        setTimeout(() => { refreshBtn.querySelector('i').style.animation = ''; }, 500);
      });
    });
  }

  // ===== REVENUE CHART =====
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    const grad = revenueCtx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(0,200,83,0.35)');
    grad.addColorStop(1, 'rgba(0,200,83,0.01)');
    charts.revenue = new Chart(revenueCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: obterUltimos9Dias(),
        datasets: [{ data: [35000,52000,48000,72000,85000,95000,110000,128000,145000], borderColor: '#00c853', backgroundColor: grad, borderWidth: 2.5, pointBackgroundColor: '#fff', pointBorderColor: '#00c853', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111', titleColor: '#aaa', bodyColor: '#fff', padding: 10, displayColors: false, callbacks: { label: ctx => `Receita: ${ctx.raw.toLocaleString('pt-AO')} Kz` } } }, scales: { x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } }, y: { beginAtZero: true, max: 200000, grid: { color: '#f3f4f6' }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => v >= 1000 ? (v/1000)+'K' : v } } } }
    });
  }

  // ===== ORDERS BAR =====
  const ordCtx = document.getElementById('ordersChart');
  if (ordCtx) {
    charts.orders = new Chart(ordCtx.getContext('2d'), {
      type: 'bar', data: { labels: ['S1','S2','S3','S4','S5','S6','S7'], datasets: [{ data: [2,3,2,4,3,5,4], backgroundColor: 'rgba(59,130,246,0.6)', borderRadius: 4, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } } }
    });
  }

  // ===== CATEGORY DOUGHNUT =====
  const catCtx = document.getElementById('catChart');
  if (catCtx) {
    charts.categories = new Chart(catCtx.getContext('2d'), {
      type: 'doughnut', data: { labels: ['Tecnologia','Serviços','Consultoria','Varejo','Outros'], datasets: [{ data: [28,22,20,18,12], backgroundColor: ['#00c853','#a855f7','#3b82f6','#f59e0b','#ef4444'], borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw}%` } } } }
    });
  }

  window.addEventListener('beforeunload', () => { if (autoRefreshInterval) clearInterval(autoRefreshInterval); });
});

// ===== MODAL LOGIC =====
function abrirModal(id) {
  document.getElementById(id).classList.add('active');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function submeterNovoProduto() {
  const form = document.getElementById('formAddProduto');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const payload = {
    nome: form.nome.value,
    descricao: form.descricao.value,
    preco: parseFloat(form.preco.value),
    estoque: parseInt(form.estoque.value),
    categoria_id: parseInt(form.categoria_id.value)
  };

  try {
    const data = await apiCall('POST', '/produtos/', payload);
    if (data) {
      showToast('Produto adicionado com sucesso!', 'success');
      fecharModal('modalProduto');
      form.reset();
      carregarDadosPainel();
    }
  } catch (e) {
    showToast('Erro ao adicionar produto', 'error');
  }
}

async function submeterNovoServico() {
  const form = document.getElementById('formAddServico');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = {
    nome: form.nome.value,
    descricao: form.descricao.value,
    preco_base: parseFloat(form.preco_base.value),
    duracao_estimada: form.duracao_estimada.value,
    disponibilidade: form.disponibilidade.value,
    categoria_id: parseInt(form.categoria_id.value)
  };

  try {
    const data = await apiCall('POST', '/servicos/', payload);
    if (data) {
      showToast('Serviço adicionado com sucesso!', 'success');
      fecharModal('modalServico');
      form.reset();
      carregarDadosPainel();
    }
  } catch (e) {
    showToast('Erro ao adicionar serviço', 'error');
  }
}
