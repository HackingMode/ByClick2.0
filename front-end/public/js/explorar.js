/**
 * Explorar Produtos — ByClick
 * Carrega produtos da API e gere filtros/pesquisa.
 */

let todosOsProdutos = [];
let categoriaAtiva = 'all';
let searchTimeout = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function() {
  // Auth state - show/hide buttons
  atualizarNavbarAuth();

  // Category pills
  document.getElementById('categoriesBar')?.addEventListener('click', function(e) {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('cat-pill--active'));
    pill.classList.add('cat-pill--active');
    categoriaAtiva = pill.dataset.cat;
    filtrarProdutos();
  });

  // Search input with debounce
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => filtrarProdutos(), 300);
    });
  }

  // Sort select
  document.getElementById('sortSelect')?.addEventListener('change', () => filtrarProdutos());

  // Load products
  await carregarProdutos();
});

function atualizarNavbarAuth() {
  const loggedIn = estaAutenticado();
  const loginBtn = document.getElementById('btnLogin');
  const cadastroBtn = document.getElementById('btnCadastro');
  const painelBtn = document.getElementById('btnPainel');

  if (loggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (cadastroBtn) cadastroBtn.style.display = 'none';
    if (painelBtn) {
      painelBtn.style.display = 'inline-flex';
      // Determine panel link based on user type
      const userData = JSON.parse(localStorage.getItem('usuario') || '{}');
      const tipo = userData.tipo_utilizador || 'comprador';
      const panelMap = {
        'comprador': '../paineis/painel_comprador/painel_comprador.html',
        'vendedor': '../paineis/painel_vendedor/painel_vendedor.html',
        'empresa': '../paineis/painel_empresa/painel_empresa.html'
      };
      painelBtn.href = panelMap[tipo] || panelMap['comprador'];
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (cadastroBtn) cadastroBtn.style.display = 'inline-flex';
    if (painelBtn) painelBtn.style.display = 'none';
  }
}

async function carregarProdutos() {
  const grid = document.getElementById('productsGrid');
  const loading = document.getElementById('loadingState');
  const empty = document.getElementById('emptyState');

  try {
    const response = await apiCall('GET', '/produtos/?skip=0&limit=50');
    todosOsProdutos = response || [];

    if (loading) loading.style.display = 'none';

    if (todosOsProdutos.length === 0) {
      if (empty) empty.style.display = 'block';
      // Show demo products when API returns empty
      todosOsProdutos = gerarProdutosDemo();
    }

    filtrarProdutos();
  } catch (erro) {
    console.error('Erro ao carregar produtos:', erro);
    if (loading) loading.style.display = 'none';

    // Fallback: show demo products
    todosOsProdutos = gerarProdutosDemo();
    filtrarProdutos();
  }
}

function filtrarProdutos() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sort = document.getElementById('sortSelect')?.value || 'recentes';

  let filtrados = [...todosOsProdutos];

  // Category filter
  if (categoriaAtiva !== 'all') {
    filtrados = filtrados.filter(p =>
      (p.categoria || '').toLowerCase() === categoriaAtiva ||
      (p.tipo_produto || '').toLowerCase() === categoriaAtiva
    );
  }

  // Search filter
  if (searchTerm) {
    filtrados = filtrados.filter(p =>
      (p.nome || '').toLowerCase().includes(searchTerm) ||
      (p.descricao || '').toLowerCase().includes(searchTerm) ||
      (p.categoria || '').toLowerCase().includes(searchTerm)
    );
  }

  // Sort
  switch (sort) {
    case 'preco_asc': filtrados.sort((a, b) => (a.preco || 0) - (b.preco || 0)); break;
    case 'preco_desc': filtrados.sort((a, b) => (b.preco || 0) - (a.preco || 0)); break;
    case 'avaliacao': filtrados.sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0)); break;
    default: filtrados.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
  }

  // Update count
  const countEl = document.getElementById('resultsCount');
  if (countEl) countEl.textContent = filtrados.length;

  renderizarProdutos(filtrados);
}

function renderizarProdutos(produtos) {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  if (produtos.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  grid.innerHTML = produtos.map(p => {
    const img = p.imagem_url || p.imagens?.[0]?.url || `https://picsum.photos/seed/${p.id || Math.random()}/400/300`;
    const badge = p.condicao === 'usado' ? '<span class="prod-card__badge badge-used">Usado</span>' :
                  p.tipo === 'servico' ? '<span class="prod-card__badge badge-service">Serviço</span>' :
                  '<span class="prod-card__badge badge-new">Novo</span>';

    return `
      <a href="../produto/?id=${p.id}" class="prod-card">
        <button class="prod-card__favorite" onclick="event.preventDefault();event.stopPropagation();"><i class="fa-regular fa-heart"></i></button>
        <div class="prod-card__img">
          <img src="${img}" alt="${p.nome || 'Produto'}" loading="lazy" onerror="this.src='https://picsum.photos/seed/${p.id || 1}/400/300'">
        </div>
        <div class="prod-card__body">
          <div class="prod-card__badges">${badge}</div>
          <h3>${p.nome || 'Produto sem nome'}</h3>
          <span class="prod-card__price">${(p.preco || 0).toLocaleString('pt-AO')} Kz</span>
          <div class="prod-card__location">
            <i class="fa-solid fa-location-dot"></i>
            ${p.localizacao || p.provincia || 'Luanda, Angola'}
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function gerarProdutosDemo() {
  const nomes = [
    'iPhone 15 Pro Max 256GB', 'Samsung Galaxy S24 Ultra', 'MacBook Pro M3 14"',
    'PlayStation 5 Digital', 'Toyota Hilux 2023', 'Sofá Moderno em L',
    'Serviço de Design Gráfico', 'Consultoria Empresarial', 'HP Pavilion 15',
    'AirPods Pro 2ª Geração', 'Monitor LG UltraWide 34"', 'Câmera Canon EOS R6'
  ];
  const categorias = ['smartphones','smartphones','informatica','consolas','veiculos','moveis','servicos','servicos','informatica','smartphones','informatica','informatica'];
  const precos = [850000, 720000, 1250000, 380000, 9500000, 450000, 75000, 150000, 520000, 180000, 640000, 980000];

  return nomes.map((nome, i) => ({
    id: i + 1,
    nome,
    preco: precos[i],
    categoria: categorias[i],
    condicao: i === 4 ? 'usado' : (i >= 6 && i <= 7 ? 'servico' : 'novo'),
    tipo: i >= 6 && i <= 7 ? 'servico' : 'produto',
    provincia: ['Luanda','Luanda','Benguela','Luanda','Huambo','Luanda','Luanda','Cabinda','Luanda','Luanda','Benguela','Luanda'][i],
    criado_em: new Date(Date.now() - i * 86400000).toISOString()
  }));
}
