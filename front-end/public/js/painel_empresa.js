let autoRefreshInterval = null;
let charts = {};

async function carregarDadosPainel() {
  const user = await obterMeuPerfil();
  const empresa = await obterDadosEmpresa();
  const produtos = await obterProdutos({ limit: 10 });
  const pedidos = await obterPedidos({ limit: 10, status: 'pendente' });

  if (user.success) {
    atualizarPerfilUsuario(user.data);
  }

  if (empresa.success) {
    atualizarDadosEmpresa(empresa.data);
  }

  if (produtos.success) {
    atualizarProdutos(produtos.data);
  }

  if (pedidos.success) {
    atualizarPedidos(pedidos.data);
  }

  atualizarData();
}

function atualizarPerfilUsuario(usuario) {
  const nomeEl = document.querySelector('[data-user-name]');
  const fotoEl = document.querySelector('[data-user-photo]');

  if (nomeEl) nomeEl.textContent = usuario.nome_completo || usuario.nome_utilizador;
  if (fotoEl) fotoEl.src = usuario.foto_perfil_url || 'https://via.placeholder.com/40';
}

function atualizarDadosEmpresa(empresa) {
  const nomeEl = document.querySelector('[data-store-name]');
  const descEl = document.querySelector('[data-store-desc]');
  const logoEl = document.querySelector('[data-store-logo]');
  const verEl = document.querySelector('[data-store-verified]');
  const nifEl = document.getElementById('companyNif');

  if (nomeEl) nomeEl.textContent = empresa.nome_empresa || 'Sua Empresa';
  if (descEl) descEl.textContent = empresa.descricao_loja || 'Descrição não disponível';
  if (logoEl) logoEl.textContent = (empresa.nome_empresa || 'EMP').substring(0, 3).toUpperCase();
  if (verEl) verEl.textContent = empresa.verificado ? '✓ Empresa Verificada' : 'Aguardando verificação';
  if (nifEl) nifEl.textContent = empresa.nif || '-';
}

function atualizarProdutos(produtos) {
  const countEl = document.querySelector('[data-products-count]');
  if (countEl) countEl.textContent = produtos.length || 0;
}

function atualizarPedidos(pedidos) {
  const countEl = document.querySelector('[data-orders-count]');
  const tbody = document.getElementById('ordersTableBody');

  if (countEl) countEl.textContent = pedidos.length || 0;

  if (tbody && pedidos.length > 0) {
    tbody.innerHTML = pedidos.map(pedido => `
      <tr>
        <td class="order-id">#${pedido.numero_pedido || pedido.id}</td>
        <td>${pedido.cliente_nome || 'Cliente'}</td>
        <td><b>${(pedido.valor_total || 0).toLocaleString('pt-AO')} Kz</b></td>
        <td><span class="status s-${pedido.status || 'proc'}"><span class="dot"></span>${pedido.status || 'Processando'}</span></td>
        <td style="color:var(--text-muted)">${pedido.data_criacao ? new Date(pedido.data_criacao).toLocaleDateString('pt-AO') : '-'}</td>
      </tr>
    `).join('');
  } else if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Nenhum pedido no momento</td></tr>';
  }
}

function atualizarData() {
  const hoje = new Date();
  const dataStr = hoje.toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const horaStr = hoje.toLocaleTimeString('pt-AO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const dateEl = document.getElementById('currentDate');
  const timeEl = document.getElementById('currentTime');

  if (dateEl) dateEl.textContent = dataStr;
  if (timeEl) timeEl.textContent = horaStr;
}

function atualizarGraficos() {
  if (charts.revenue) {
    charts.revenue.data.labels = obterUltimos9Dias();
    charts.revenue.update();
  }

  if (charts.orders) {
    charts.orders.data.labels = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
    charts.orders.update();
  }

  if (charts.categories) {
    charts.categories.update();
  }
}

function obterUltimos9Dias() {
  const dias = [];
  for (let i = 8; i >= 0; i--) {
    const data = new Date();
    data.setDate(data.getDate() - i);
    dias.push(data.toLocaleDateString('pt-AO', { month: '2-digit', day: '2-digit' }));
  }
  return dias;
}

document.addEventListener('DOMContentLoaded', function () {
  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const toggle = document.getElementById('menuToggle');
  const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
  const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
  toggle?.addEventListener('click', () => sidebar.classList.contains('active') ? close() : open());
  overlay?.addEventListener('click', close);

  // Chart tab switching
  const tabs = document.querySelectorAll('.chart-tab');
  tabs.forEach(t => t.addEventListener('click', function() {
    tabs.forEach(x => x.classList.remove('active'));
    this.classList.add('active');
  }));

  // Carregar dados do painel
  carregarDadosPainel();

  // Auto-refresh a cada 45 segundos
  autoRefreshInterval = setInterval(() => {
    carregarDadosPainel();
    atualizarGraficos();
  }, 45000);

  // Botão de refresh manual
  const refreshBtn = document.querySelector('[data-refresh-btn]');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      carregarDadosPainel().then(() => {
        refreshBtn.disabled = false;
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
        datasets: [{
          data: [35000, 52000, 48000, 72000, 85000, 95000, 110000, 128000, 145000],
          borderColor: '#00c853',
          backgroundColor: grad,
          borderWidth: 2.5,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#00c853',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111',
            titleColor: '#aaa',
            bodyColor: '#fff',
            padding: 10,
            displayColors: false,
            callbacks: {
              label: ctx => `Receita: ${ctx.raw.toLocaleString('pt-AO')} Kz`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: {
            beginAtZero: true, max: 200000,
            grid: { color: '#f3f4f6' },
            ticks: {
              color: '#9ca3af', font: { size: 11 },
              callback: v => v >= 1000 ? (v / 1000) + 'K' : v
            }
          }
        }
      }
    });
  }

  // ===== MINI: ORDERS BAR CHART =====
  const ordCtx = document.getElementById('ordersChart');
  if (ordCtx) {
    charts.orders = new Chart(ordCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'],
        datasets: [{
          data: [2, 3, 2, 4, 3, 5, 4],
          backgroundColor: 'rgba(59,130,246,0.6)',
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false, beginAtZero: true }
        }
      }
    });
  }

  // ===== MINI: CATEGORY DOUGHNUT =====
  const catCtx = document.getElementById('catChart');
  if (catCtx) {
    charts.categories = new Chart(catCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Tecnologia', 'Serviços', 'Consultoria', 'Varejo', 'Outros'],
        datasets: [{
          data: [28, 22, 20, 18, 12],
          backgroundColor: ['#00c853', '#a855f7', '#3b82f6', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => `${c.label}: ${c.raw}%` }
          }
        }
      }
    });
  }

  // Cleanup on page leave
  window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  });
});
