/**
 * Explorar Produtos — ByClick
 * Carrega produtos da API e gere filtros/pesquisa.
 */

let todosOsProdutos = [];
let produtosFiltrados = [];
let paginaAtual = 1;
const itensPorPagina = 12;
let categoriaAtiva = 'all';
let tipoAtivo = 'all';
let searchTimeout = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function() {
  // Auth state - show/hide buttons
  atualizarNavbarAuth();

  // Category pills
  document.getElementById('categoriesBar')?.addEventListener('click', function(e) {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('#categoriesBar .cat-pill').forEach(p => p.classList.remove('cat-pill--active'));
    pill.classList.add('cat-pill--active');
    categoriaAtiva = pill.dataset.cat;
    carregarProdutos(); // Refetch from API might be better if doing backend filter, but we filter client side for now
  });

  // Type filter pills
  document.getElementById('typeFilterBar')?.addEventListener('click', function(e) {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    document.querySelectorAll('#typeFilterBar .cat-pill').forEach(p => p.classList.remove('cat-pill--active'));
    pill.classList.add('cat-pill--active');
    tipoAtivo = pill.dataset.type;
    carregarProdutos(); // We can pass type directly to the API
  });

  // Search input with debounce
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => aplicarFiltros(), 300);
    });
  }

  // Sort select
  document.getElementById('sortSelect')?.addEventListener('change', () => aplicarFiltros());

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
        'empresa': '../paineis/painel_empresa/painel_empresa.html',
        'admin': '../paineis/painel_admin/painel_admin.html'
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
    const searchTerm = document.getElementById('searchInput')?.value.trim() || '';
    let url = `/explorar/pesquisa?`;
    if (searchTerm) url += `q=${encodeURIComponent(searchTerm)}&`;
    if (tipoAtivo !== 'all') url += `tipo=${tipoAtivo}`;

    const response = await apiCall('GET', url);
    todosOsProdutos = response || [];

    if (loading) loading.style.display = 'none';

    if (todosOsProdutos.length === 0) {
      if (empty) empty.style.display = 'block';
    }

    aplicarFiltros();
  } catch (erro) {
    console.error('Erro ao carregar produtos:', erro);
    if (loading) loading.style.display = 'none';
    if (empty) empty.style.display = 'block';
  }
}

function aplicarFiltros() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const sort = document.getElementById('sortSelect')?.value || 'recentes';

  produtosFiltrados = [...todosOsProdutos];

  // Client-side Type Filter fallback
  if (tipoAtivo !== 'all') {
    produtosFiltrados = produtosFiltrados.filter(p => p.tipo === tipoAtivo);
  }

  // Category filter
  if (categoriaAtiva !== 'all') {
    produtosFiltrados = produtosFiltrados.filter(p =>
      (p.categoria || '').toLowerCase() === categoriaAtiva ||
      (p.tipo_produto || '').toLowerCase() === categoriaAtiva ||
      (p.tipo === 'servico' && categoriaAtiva === 'servicos')
    );
  }

  // Search filter (client side refinement)
  if (searchTerm) {
    produtosFiltrados = produtosFiltrados.filter(p =>
      (p.nome || '').toLowerCase().includes(searchTerm) ||
      (p.descricao || '').toLowerCase().includes(searchTerm) ||
      (p.categoria || '').toLowerCase().includes(searchTerm)
    );
  }

  // Sort
  switch (sort) {
    case 'preco_asc': produtosFiltrados.sort((a, b) => (a.preco || 0) - (b.preco || 0)); break;
    case 'preco_desc': produtosFiltrados.sort((a, b) => (b.preco || 0) - (a.preco || 0)); break;
    case 'avaliacao': produtosFiltrados.sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0)); break;
    default: produtosFiltrados.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
  }

  // Update count
  const countEl = document.getElementById('resultsCount');
  if (countEl) countEl.textContent = produtosFiltrados.length;

  paginaAtual = 1;
  renderizarPagina();
}

function renderizarPagina() {
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const produtosPagina = produtosFiltrados.slice(inicio, fim);
  
  renderizarProdutos(produtosPagina);
  renderizarPaginacao();
}

function renderizarPaginacao() {
  const paginacaoEl = document.getElementById('paginationControls');
  if (!paginacaoEl) return;

  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);

  if (totalPaginas <= 1) {
    paginacaoEl.style.display = 'none';
    return;
  }

  paginacaoEl.style.display = 'flex';
  paginacaoEl.style.justifyContent = 'center';
  paginacaoEl.style.gap = '8px';
  paginacaoEl.style.marginTop = '30px';

  let html = '';
  
  html += `<button class="btn btn-ghost btn-sm" ${paginaAtual === 1 ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual - 1})"><i class="fa-solid fa-chevron-left"></i> Anterior</button>`;
  
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button class="btn ${i === paginaAtual ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="mudarPagina(${i})">${i}</button>`;
  }

  html += `<button class="btn btn-ghost btn-sm" ${paginaAtual === totalPaginas ? 'disabled' : ''} onclick="mudarPagina(${paginaAtual + 1})">Próxima <i class="fa-solid fa-chevron-right"></i></button>`;

  paginacaoEl.innerHTML = html;
}

window.mudarPagina = function(novaPagina) {
  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
  if (novaPagina < 1 || novaPagina > totalPaginas) return;
  paginaAtual = novaPagina;
  renderizarPagina();
  document.querySelector('.products').scrollIntoView({ behavior: 'smooth' });
};

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
    const isServico = p.tipo === 'servico';
    const imagemPadrao = isServico ? 'https://placehold.co/400x300/8b5cf6/ffffff?text=Servico' : 'https://placehold.co/400x300/e2e8f0/64748b?text=Produto';
    const img = p.imagem_url || p.imagens?.[0]?.url || imagemPadrao;
    
    // Distinguish Service vs Product
    const badgeStr = isServico 
      ? '<span class="prod-card__badge badge-service" style="background:#8b5cf6;">Serviço</span>' 
      : (p.condicao === 'usado' ? '<span class="prod-card__badge badge-used">Usado</span>' : '<span class="prod-card__badge badge-new">Novo</span>');
    
    const url = isServico ? `../servico/?id=${p.id}` : `../produto/?id=${p.id}`;
    const precoText = isServico ? `A partir de ${(p.preco || 0).toLocaleString('pt-AO')} Kz` : `${(p.preco || 0).toLocaleString('pt-AO')} Kz`;
    const subtext = isServico && p.duracao_estimada ? `<small style="display:block; color:#64748b; font-size:12px; margin-top:4px;">⏱️ ${p.duracao_estimada}</small>` : '';

    const isFav = isFavorito(p.id, isServico ? 'servico' : 'produto');
    const favIconClass = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const favStyle = isFav ? 'color: #C84B1F;' : '';

    return `
      <a href="${url}" class="prod-card">
        <button class="prod-card__favorite" onclick="toggleFavorito(event, this, ${p.id}, '${isServico ? 'servico' : 'produto'}')"><i class="${favIconClass}" style="${favStyle}"></i></button>
        <div class="prod-card__img">
          <img src="${img}" alt="${p.nome || 'Oferta'}" loading="lazy" onerror="this.src='${imagemPadrao}'">
        </div>
        <div class="prod-card__body">
          <div class="prod-card__badges">${badgeStr}</div>
          <h3>${p.nome || 'Oferta sem nome'}</h3>
          <span class="prod-card__price">${precoText}</span>
          ${subtext}
          <div class="prod-card__location" style="margin-top: 10px;">
            <i class="fa-solid fa-star" style="color: #fbbf24;"></i>
            ${(p.avaliacao_media || 0).toFixed(1)}
          </div>
        </div>
      </a>
    `;
  }).join('');
}



function isFavorito(id, tipo) {
  const favoritos = JSON.parse(localStorage.getItem('byclick_favoritos') || '[]');
  return favoritos.some(f => f.id === id && f.tipo === tipo);
}

window.toggleFavorito = function(event, btn, id, tipo) {
  event.preventDefault();
  event.stopPropagation();
  
  let favoritos = JSON.parse(localStorage.getItem('byclick_favoritos') || '[]');
  const favIndex = favoritos.findIndex(f => f.id === id && f.tipo === tipo);
  const icon = btn.querySelector('i');
  
  if (favIndex > -1) {
    favoritos.splice(favIndex, 1);
    icon.className = 'fa-regular fa-heart';
    icon.style.color = '';
  } else {
    favoritos.push({ id, tipo });
    icon.className = 'fa-solid fa-heart';
    icon.style.color = '#C84B1F';
  }
  
  localStorage.setItem('byclick_favoritos', JSON.stringify(favoritos));
};
