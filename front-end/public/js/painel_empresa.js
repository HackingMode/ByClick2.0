/**
 * Painel Empresarial - Kitanda
 * Carrega dados reais da API e atualiza o dashboard da empresa.
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
}

// ===== UPDATE UI =====
function atualizarPerfilUsuario(usuario) {
  const nomeEl = document.querySelector('[data-user-name]');
  const fotoEl = document.querySelector('[data-user-photo]');
  const greetEl = document.querySelector('[data-greeting]');

  const nome = usuario.nome_completo || usuario.nome_utilizador || 'Administrador';
  const primeiroNome = nome.split(' ')[0];

  const defaultAvatar = "https://ui-avatars.com/api/?name=" + encodeURIComponent(nome) + "&background=C84B1F&color=fff&size=150";
  const avatarSrc = usuario.foto_perfil_url || defaultAvatar;

  if (nomeEl) nomeEl.textContent = nome;
  if (fotoEl) fotoEl.src = avatarSrc;
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
  if (charts.revenue && currentStats) {
    charts.revenue.data.labels = obterUltimos9Dias();
    if (currentStats.grafico_vendas) {
      charts.revenue.data.datasets[0].data = currentStats.grafico_vendas;
    }
    charts.revenue.update();
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

  // ===== LÓGICAS DEFINIÇÕES =====
  // 1. Preview de Imagem
  const imgInput = document.getElementById('imgPerfilDefinicoes');
  const imgPreview = document.getElementById('previewPerfilDefinicoes');
  if (imgInput && imgPreview) {
      imgInput.addEventListener('change', function() {
          if (this.files && this.files[0]) {
              const reader = new FileReader();
              reader.onload = function(e) { imgPreview.src = e.target.result; };
              reader.readAsDataURL(this.files[0]);
          }
      });
  }

  // 2. Preencher form do Representante na carga inicial se estiver em definicoes.html
  if (document.getElementById('formUserEmpresa')) {
      obterMeuPerfil().then(res => {
          if(res && res.success && res.data) {
              const u = res.data;
              document.getElementById('userNome').value = u.nome_completo || '';
              document.getElementById('userEmail').value = u.email || '';
              document.getElementById('userTelefone').value = u.numero_telefone || '';
              if (imgPreview) {
                  imgPreview.src = u.foto_perfil_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome_completo)}&background=C84B1F&color=fff`;
              }
              if (u.perfil_vendedor) {
                  document.getElementById('lojaNome').value = u.perfil_vendedor.nome_loja || '';
                  document.getElementById('lojaDescricao').value = u.perfil_vendedor.descricao_loja || '';
                  document.getElementById('lojaDoc').value = u.perfil_vendedor.documento_identificacao || '';
              }
          }
      });
  }

  // 3. Submit Informações Pessoais (Representante)
  const formUser = document.getElementById('formUserEmpresa');
  if (formUser) {
      formUser.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = formUser.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

          let base64Img = null;
          if (imgInput && imgInput.files.length > 0) {
              base64Img = await new Promise(res => {
                  const r = new FileReader();
                  r.onload = ev => res(ev.target.result);
                  r.readAsDataURL(imgInput.files[0]);
              });
          }

          const payload = {
              nome_completo: document.getElementById('userNome').value,
              numero_telefone: document.getElementById('userTelefone').value
          };
          if (base64Img) payload.foto_perfil = base64Img;

          try {
              await apiCall('PUT', '/empresa/meu-perfil', payload);
              showToast('Perfil do Representante atualizado com sucesso!', 'success');
              setTimeout(() => window.location.reload(), 1500);
          } catch (error) {
              showToast(error.message || 'Erro ao atualizar perfil', 'error');
          } finally {
              btn.disabled = false;
              btn.innerHTML = 'Atualizar Perfil';
          }
      });
  }

  // 4. Submit Loja (Empresa)
  const formLoja = document.getElementById('formLojaEmpresa');
  if (formLoja) {
      formLoja.addEventListener('submit', async (e) => {
          e.preventDefault();
          const payload = {
              nome_loja: document.getElementById('lojaNome').value,
              descricao_loja: document.getElementById('lojaDescricao').value
          };

          try {
              // Reutiliza o endpoint /vendedor/meus-dados (pois ambos partilham PerfilVendedor)
              await apiCall('PUT', '/vendedor/meus-dados', payload);
              showToast('Dados da Empresa atualizados!', 'success');
          } catch (error) {
              showToast('Erro ao atualizar empresa', 'error');
          }
      });
  }

  // 5. Submit Segurança
  const formSeguranca = document.getElementById('formSegurancaEmpresa');
  if (formSeguranca) {
      formSeguranca.addEventListener('submit', async (e) => {
          e.preventDefault();
          const payload = {
              senha_atual: document.getElementById('senhaAtual').value,
              nova_senha: document.getElementById('novaSenha').value
          };

          try {
              await apiCall('PUT', '/auth/mudar-senha', payload);
              showToast('Palavra-passe alterada!', 'success');
              formSeguranca.reset();
          } catch (error) {
              showToast(error.message || 'Erro ao alterar palavra-passe', 'error');
          }
      });
  }
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

  const imgInput = document.getElementById('imgProduto');
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
