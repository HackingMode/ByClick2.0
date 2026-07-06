/**
 * Painel do Vendedor - ByClick
 * Carrega dados reais da API e atualiza o dashboard.
 */

let autoRefreshInterval = null;
let charts = {};
let currentStats = null;

// ===== AUTH CHECK =====
function verificarAutenticacao() {
  if (!estaAutenticado()) {
    window.location.href = '../../login/';
    return false;
  }
  return true;
}

function atualizarBadges() {
    const badges = document.querySelectorAll('.topbar-actions .badge');
    if (badges.length >= 2) {
        // Notificações (mock)
        badges[0].textContent = '1';
        // Mensagens/Carrinho (mock/carrinho)
        const carrinho = JSON.parse(localStorage.getItem('byclick_carrinho') || '{"itens":[]}');
        const totalCarrinho = carrinho.itens.reduce((acc, curr) => acc + (curr.quantidade || 1), 0);
        badges[1].textContent = totalCarrinho;
    }
}

// ===== DATA LOADING =====
async function carregarDadosPainel() {
  if (!verificarAutenticacao()) return;

  try {
    const [user, loja, stats, pedidos] = await Promise.allSettled([
      obterMeuPerfil(),
      obterDadosVendedor(),
      obterEstatisticas('vendedor'),
      obterMeusPedidos('vendedor', 10)
    ]);

    if (user.status === 'fulfilled' && user.value.success) {
      atualizarPerfilUsuario(user.value.data);
    }

    if (loja.status === 'fulfilled' && loja.value.success) {
      atualizarDadosLoja(loja.value.data);
      verificarStatusPromocao();
    }

    if (stats.status === 'fulfilled' && stats.value.success) {
      currentStats = stats.value.data;
      atualizarEstatisticas(stats.value.data);
      atualizarGraficos();
    }

    if (pedidos.status === 'fulfilled' && pedidos.value.success) {
      atualizarTabelaPedidos(pedidos.value.data);
    }
  } catch (erro) {
    console.error('Erro ao carregar dados do painel:', erro);
  }

  atualizarData();
  atualizarBadges();
}

// ===== UPDATE UI =====
function atualizarPerfilUsuario(usuario) {
  const nomeEl = document.querySelector('[data-user-name]');
  const fotoEl = document.querySelector('[data-user-photo]');
  const tipoEl = document.querySelector('[data-user-type]');
  const greetEl = document.querySelector('[data-greeting]');

  const nome = usuario.nome_completo || usuario.nome_utilizador || 'Vendedor';
  const primeiroNome = nome.split(' ')[0];

  const defaultAvatar = "https://ui-avatars.com/api/?name=" + encodeURIComponent(nome) + "&background=C84B1F&color=fff&size=150";
  const avatarSrc = usuario.foto_perfil_url || defaultAvatar;

  if (nomeEl) nomeEl.textContent = nome;
  if (fotoEl) fotoEl.src = avatarSrc;
  if (tipoEl) tipoEl.textContent = 'Vendedor Individual';
  if (greetEl) greetEl.textContent = `Olá, ${primeiroNome}! 👋`;
}

function atualizarDadosLoja(loja) {
  const nomeEl = document.querySelector('[data-store-name]');
  const logoEl = document.querySelector('[data-store-logo]');
  const verEl = document.querySelector('[data-store-verified]');
  const statusEl = document.querySelector('[data-store-status]');
  const tipoEl = document.querySelector('[data-store-type]');
  const membroEl = document.querySelector('[data-member-since]');
  const catsEl = document.querySelector('[data-store-categories]');

  if (nomeEl) nomeEl.textContent = loja.nome_loja || 'Minha Loja';
  if (logoEl) logoEl.textContent = (loja.nome_loja || 'ML').substring(0, 2).toUpperCase();

  if (verEl) {
    if (loja.verificado) {
      verEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Loja Verificada';
      verEl.style.color = '#16a34a';
    } else {
      verEl.innerHTML = '<i class="fa-solid fa-clock"></i> Aguardando verificação';
      verEl.style.color = '#ea580c';
    }
  }

  if (statusEl) {
    statusEl.textContent = loja.verificado ? 'Verificada' : 'Pendente';
    statusEl.classList.toggle('green', loja.verificado);
  }

  const tipoMap = { 'individual': 'Vendedor Ind.', 'empresa': 'Empresa' };
  if (tipoEl) tipoEl.textContent = tipoMap[loja.tipo_vendedor] || loja.tipo_vendedor;

  const lojaMap = { 'produtos': 'Produtos', 'servicos': 'Serviços', 'ambos': 'Produtos • Serviços' };
  if (catsEl) catsEl.textContent = lojaMap[loja.tipo_loja] || loja.tipo_loja;

  if (membroEl && loja.criado_em) {
    membroEl.textContent = new Date(loja.criado_em).toLocaleDateString('pt-AO');
  }

  // Preencher modal de edição
  const editNome = document.getElementById('editLojaNome');
  const editDesc = document.getElementById('editLojaDescricao');
  const editIban = document.getElementById('editLojaIban');
  if (editNome && loja.nome_loja) editNome.value = loja.nome_loja;
  if (editDesc && loja.descricao_loja) editDesc.value = loja.descricao_loja;
  if (editIban && loja.iban) editIban.value = loja.iban;

  // Lógica botão inscrição
  const btnInscricao = document.getElementById('btnPedidoInscricao');
  if (btnInscricao) {
      if (loja.verificado) {
          btnInscricao.style.display = 'none';
      } else {
          btnInscricao.style.display = 'inline-block';
      }
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

  const ordPerDayEl = document.querySelector('[data-orders-per-day]');
  const catCountEl = document.querySelector('[data-categories-count]');
  
  if (ordPerDayEl && stats.grafico_pedidos) {
      const avg = (stats.grafico_pedidos.reduce((a, b) => a + b, 0) / 7).toFixed(1);
      ordPerDayEl.textContent = `${avg} / dia`;
  }
  if (catCountEl && stats.grafico_categorias) {
      catCountEl.textContent = `${stats.grafico_categorias.labels.length} Categorias`;
  }
}

function atualizarTabelaPedidos(pedidos) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:2rem;">Nenhum pedido recente</td></tr>';
    return;
  }

  const statusClasses = {
    'pendente': 's-proc',
    'confirmado': 's-pago',
    'em_processamento': 's-proc',
    'enviado': 's-envio',
    'entregue': 's-entregue',
    'cancelado': 's-cancel',
    'reembolsado': 's-cancel'
  };

  const statusLabels = {
    'pendente': 'Pendente',
    'confirmado': 'Confirmado',
    'em_processamento': 'Processando',
    'enviado': 'Em envio',
    'entregue': 'Entregue',
    'cancelado': 'Cancelado',
    'reembolsado': 'Reembolsado'
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
  if (charts.sales && currentStats) {
    charts.sales.data.labels = obterUltimos9Dias();
    if (currentStats.grafico_vendas) {
      charts.sales.data.datasets[0].data = currentStats.grafico_vendas;
    }
    charts.sales.update();
  }
  if (charts.orders && currentStats) {
    if (currentStats.grafico_pedidos) {
      charts.orders.data.datasets[0].data = currentStats.grafico_pedidos;
    }
    charts.orders.update();
  }
  if (charts.categories && currentStats) {
    if (currentStats.grafico_categorias) {
      charts.categories.data.labels = currentStats.grafico_categorias.labels;
      charts.categories.data.datasets[0].data = currentStats.grafico_categorias.data;
    }
    charts.categories.update();
  }
}

async function carregarCategoriasSelects() {
  try {
    const produtosSelect = document.getElementById('catProdutoSelect');
    if (produtosSelect) {
      const categoriasProd = await apiCall('GET', '/categorias/?tipo=produto');
      if (categoriasProd) {
        categoriasProd.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.nome;
          produtosSelect.appendChild(opt);
        });
      }
    }

    const servicosSelect = document.getElementById('catServicoSelect');
    if (servicosSelect) {
      const categoriasServ = await apiCall('GET', '/categorias/?tipo=servico');
      if (categoriasServ) {
        categoriasServ.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.nome;
          servicosSelect.appendChild(opt);
        });
      }
    }
  } catch (e) {
    console.error('Erro ao carregar categorias', e);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
  if (!verificarAutenticacao()) return;

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  carregarCategoriasSelects();
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

  // Logout
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showConfirmModal('Terminar Sessão', 'Tem certeza que deseja terminar a sua sessão?', logout, 'Terminar Sessão');
    });
  }

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
      refreshBtn.style.animation = 'spin 0.5s ease';
      refreshBtn.querySelector('i').style.animation = 'spin 0.5s ease';
      carregarDadosPainel().then(() => {
        setTimeout(() => {
          refreshBtn.style.animation = '';
          refreshBtn.querySelector('i').style.animation = '';
        }, 500);
      });
    });
  }

  // Botões de Acão Rápida
  const btnInscricao = document.getElementById('btnPedidoInscricao');
  if (btnInscricao) {
      btnInscricao.addEventListener('click', async () => {
          try {
              btnInscricao.disabled = true;
              btnInscricao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A enviar...';
              const res = await apiCall('POST', '/vendedor/inscricao');
              if (res && res.success) {
                  showToast('Pedido de inscrição enviado!', 'success');
                  btnInscricao.innerHTML = '<i class="fa-solid fa-check"></i> Pedido Enviado';
              }
          } catch (e) {
              showToast(e.message || 'Erro ao enviar pedido.', 'error');
              btnInscricao.innerHTML = '<i class="fa-solid fa-file-signature"></i> Pedidos de Inscrição';
              btnInscricao.disabled = false;
          }
      });
  }

  const btnPromocao = document.getElementById('btnPromocoes');
  if (btnPromocao) {
      btnPromocao.addEventListener('click', async () => {
          try {
              btnPromocao.disabled = true;
              btnPromocao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A processar...';
              const payload = { mensagem_solicitacao: "Desejo promover a minha loja." };
              const res = await apiCall('POST', '/vendedor/promocao', payload);
              if (res) {
                  showToast('Pedido de promoção enviado com sucesso!', 'success');
                  btnPromocao.style.display = 'none';
              }
          } catch (e) {
              showToast(e.message || 'Erro ao pedir promoção.', 'error');
              btnPromocao.innerHTML = '<i class="fa-solid fa-bullhorn"></i> Promoções';
              btnPromocao.disabled = false;
          }
      });
  }

  // ===== MAIN SALES CHART =====
  const salesCtx = document.getElementById('salesChart');
  if (salesCtx) {
    const grad = salesCtx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(0,200,83,0.35)');
    grad.addColorStop(1, 'rgba(0,200,83,0.01)');

    charts.sales = new Chart(salesCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: obterUltimos9Dias(),
        datasets: [{
          data: [18000, 42000, 35000, 65000, 98500, 80000, 120000, 155000, 190000],
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
              label: ctx => `Vendas: ${ctx.raw.toLocaleString('pt-AO')} Kz`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: {
            beginAtZero: true, max: 220000,
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
          data: [1, 2, 1, 3, 2, 4, 3],
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
        labels: ['Audio', 'Wearables', 'Periféricos'],
        datasets: [{
          data: [38, 32, 30],
          backgroundColor: ['#00c853', '#a855f7', '#3b82f6'],
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
    Object.values(charts).forEach(c => c.destroy());
  });
});

async function verificarStatusPromocao() {
    try {
        const res = await apiCall('GET', '/vendedor/promocao/status');
        const btnPromocao = document.getElementById('btnPromocoes');
        if (btnPromocao && res) {
            if (!res.pode_solicitar) {
                btnPromocao.style.display = 'none';
            } else {
                btnPromocao.style.display = 'inline-block';
            }
        }
    } catch(e) {
        console.error("Erro ao verificar status da promoção", e);
    }
}

// ===== MODAL LOGIC =====
function abrirModal(id) {
  document.getElementById(id).classList.add('active');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function submeterNovoProduto() {
  const form = document.getElementById('formAddProduto');
  if (!form.reportValidity()) return;

  const btn = document.querySelector('#modalProduto .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A salvar...';

  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Se houver imagem, processar para base64
    const fileInput = document.getElementById('imgProduto');
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      data.imagem = base64;
    }

    const res = await apiCall('POST', '/produtos/', data);
    if (res) {
      showToast('Produto criado com sucesso!', 'success');
      fecharModal('modalProduto');
      form.reset();
      carregarDadosPainel(); // atualizar stats
    }
  } catch (error) {
    showToast('Erro ao criar produto.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Produto';
  }
}

async function submeterEdicaoLoja() {
  const form = document.getElementById('formEditarLoja');
  if (!form.reportValidity()) return;

  const btn = document.querySelector('#modalEditarLoja .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A salvar...';

  try {
    const nome_loja = document.getElementById('editLojaNome').value;
    const descricao_loja = document.getElementById('editLojaDescricao').value;
    const iban = document.getElementById('editLojaIban').value;
    
    const payload = {
        nome_loja: nome_loja,
        descricao_loja: descricao_loja,
        iban: iban
    };

    const res = await apiCall('PUT', '/vendedor/meu-perfil', payload);
    if (res) {
      showToast('Loja atualizada com sucesso!', 'success');
      fecharModal('modalEditarLoja');
      carregarDadosPainel(); 
    }
  } catch (error) {
    showToast(error.message || 'Erro ao atualizar loja.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Alterações';
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

  const imgInput = document.getElementById('imgServico');
  if (imgInput && imgInput.files.length > 0) {
    const file = imgInput.files[0];
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    payload.imagem = base64;
  }

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
