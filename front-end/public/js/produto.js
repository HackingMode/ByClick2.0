/**
 * Detalhes do Produto — Kitanda
 */

document.addEventListener('DOMContentLoaded', async function() {
  atualizarNavbarAuth();

  const params = new URLSearchParams(window.location.search);
  const produtoId = params.get('id');

  if (!produtoId) {
    mostrarErro('Produto não encontrado.');
    return;
  }

  await carregarProduto(produtoId);
});

function atualizarNavbarAuth() {
  const loggedIn = typeof estaAutenticado === 'function' && estaAutenticado();
  const loginBtn = document.getElementById('btnLogin');
  const cadastroBtn = document.getElementById('btnCadastro');
  const painelBtn = document.getElementById('btnPainel');

  if (loggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (cadastroBtn) cadastroBtn.style.display = 'none';
    if (painelBtn) {
      painelBtn.style.display = 'inline-flex';
      const userData = JSON.parse(localStorage.getItem('usuario') || '{}');
      const tipo = userData.tipo_utilizador || 'comprador';
      const panelMap = {
        'comprador': '../paineis/painel_comprador/painel_comprador.html',
        'vendedor': '../paineis/painel_vendedor/painel_vendedor.html',
        'empresa': '../paineis/painel_empresa/painel_empresa.html'
      };
      painelBtn.href = panelMap[tipo] || panelMap['comprador'];
    }
  }
}

async function carregarProduto(id) {
  const loading = document.getElementById('loadingState');
  const content = document.getElementById('productContent');

  try {
    const produto = await apiCall('GET', `/produtos/${id}`);
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'grid';
    renderizarProduto(produto);
  } catch (erro) {
    console.error('Erro ao carregar produto:', erro);
    // Fallback demo
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'grid';
    renderizarProdutoDemo(id);
  }
}

function renderizarProduto(p) {
  // Title
  document.title = `${p.nome} — Kitanda`;
  const titleEl = document.querySelector('[data-product-title]');
  if (titleEl) titleEl.textContent = p.nome || 'Produto';

  // Breadcrumb
  const breadEl = document.querySelector('[data-product-name]');
  if (breadEl) breadEl.textContent = p.nome || 'Produto';

  // Price
  const priceEl = document.querySelector('[data-product-price]');
  if (priceEl) priceEl.textContent = `${(p.preco || 0).toLocaleString('pt-AO')} Kz`;

  // Description
  const descEl = document.querySelector('[data-product-desc]');
  if (descEl) descEl.textContent = p.descricao || 'Sem descrição disponível.';

  // Location
  const locEl = document.querySelector('[data-product-location]');
  if (locEl) locEl.textContent = p.localizacao || p.provincia || 'Luanda, Angola';

  // Date
  const dateEl = document.querySelector('[data-product-date]');
  if (dateEl) dateEl.textContent = p.criado_em ? `Publicado em ${new Date(p.criado_em).toLocaleDateString('pt-AO')}` : '—';

  // Views
  const viewsEl = document.querySelector('[data-product-views]');
  if (viewsEl) viewsEl.textContent = p.visualizacoes || 0;

  // Main image
  const mainImg = document.getElementById('mainImage');
  const imgUrl = p.imagem_url || p.imagens?.[0]?.url || `https://placehold.co/600x400/e2e8f0/64748b?text=Produto`;
  if (mainImg) mainImg.src = imgUrl;

  // Thumbnails
  const thumbsContainer = document.getElementById('galleryThumbs');
  if (thumbsContainer && p.imagens && p.imagens.length > 1) {
    thumbsContainer.innerHTML = p.imagens.map((img, i) => `
      <img src="${img.url}" alt="Imagem ${i+1}" class="${i === 0 ? 'active' : ''}" onclick="trocarImagem(this, '${img.url}')">
    `).join('');
  }

  // Badges
  const badgesEl = document.getElementById('productBadges');
  if (badgesEl) {
    let badges = '';
    if (p.condicao === 'usado') badges += '<span class="badge-item badge-used">Usado</span>';
    else if (p.tipo === 'servico') badges += '<span class="badge-item badge-service">Serviço</span>';
    else badges += '<span class="badge-item badge-new">Novo</span>';
    badgesEl.innerHTML = badges;
  }

  // Seller
  const sellerNameEl = document.querySelector('[data-seller-name]');
  const sellerMetaEl = document.querySelector('[data-seller-meta]');
  const sellerAvatarEl = document.querySelector('[data-seller-avatar]');
  if (sellerNameEl) sellerNameEl.textContent = p.vendedor_nome || 'Vendedor Kitanda';
  if (sellerMetaEl) sellerMetaEl.textContent = `Membro desde ${p.vendedor_desde ? new Date(p.vendedor_desde).toLocaleDateString('pt-AO') : '—'}`;
  if (sellerAvatarEl) sellerAvatarEl.textContent = (p.vendedor_nome || 'V').charAt(0).toUpperCase();
  const btnVerLoja = document.getElementById('btnVerLoja');
  if (btnVerLoja && p.vendedor_id) {
    btnVerLoja.href = `../loja/?id=${p.vendedor_id}`;
  }

  const buyBtn = document.getElementById('btnComprar');
  const buyNowBtn = document.getElementById('btnComprarAgora');
  
  const adicionarAoCart = () => {
    if (typeof adicionarAoCarrinho === 'function') {
      adicionarAoCarrinho({
        id: p.id,
        tipo: 'produto',
        nome: p.nome,
        preco: p.preco_promocional || p.preco,
        imagem_url: p.imagem_url || (p.imagens && p.imagens.length > 0 ? p.imagens[0].url : ''),
        vendedor_nome: p.vendedor_nome || 'Vendedor Kitanda',
        vendedor_id: p.vendedor_id
      });
      mostrarToast(`"${p.nome}" adicionado ao carrinho!`, 'success');
    } else {
      mostrarToast('Erro ao adicionar ao carrinho.', 'error');
    }
  };

  if (buyBtn) {
    buyBtn.addEventListener('click', adicionarAoCart);
  }

  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
      adicionarAoCart();
      window.location.href = '../checkout/';
    });
  }

  const contactBtn = document.getElementById('btnContactar');
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      if (p.vendedor_telefone) {
        window.open(`https://wa.me/${p.vendedor_telefone}?text=Olá! Tenho interesse no produto "${p.nome}" no Kitanda.`, '_blank');
      } else {
        mostrarToast('Contacto do vendedor não disponível.', 'warning');
      }
    });
  }

  const favBtn = document.getElementById('btnFavorite');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      const icon = favBtn.querySelector('i');
      icon.classList.toggle('fa-regular');
      icon.classList.toggle('fa-solid');
      icon.style.color = icon.classList.contains('fa-solid') ? '#ef4444' : '';
      mostrarToast(icon.classList.contains('fa-solid') ? 'Adicionado aos favoritos!' : 'Removido dos favoritos.', 'info');
    });
  }
}

function renderizarProdutoDemo(id) {
  const demos = {
    '1': { nome: 'iPhone 15 Pro Max 256GB', preco: 850000, descricao: 'iPhone 15 Pro Max em estado impecável, com caixa original e todos os acessórios. Comprado na loja oficial Apple. Cor: Titânio Natural.', provincia: 'Luanda', condicao: 'novo' },
    '2': { nome: 'Samsung Galaxy S24 Ultra', preco: 720000, descricao: 'Samsung Galaxy S24 Ultra com S Pen, 512GB de armazenamento. Câmera AI avançada com 200MP.', provincia: 'Luanda', condicao: 'novo' },
    '3': { nome: 'MacBook Pro M3 14"', preco: 1250000, descricao: 'MacBook Pro com chip M3 Pro, 18GB RAM, 512GB SSD. Ecrã Liquid Retina XDR.', provincia: 'Benguela', condicao: 'novo' }
  };
  const demo = demos[id] || { nome: 'Produto Demo', preco: 50000, descricao: 'Descrição do produto de demonstração.', provincia: 'Luanda', condicao: 'novo' };
  demo.id = id;
  demo.criado_em = new Date().toISOString();
  renderizarProduto(demo);
}

function trocarImagem(el, url) {
  document.getElementById('mainImage').src = url;
  document.querySelectorAll('.gallery-thumbs img').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

function mostrarErro(msg) {
  const loading = document.getElementById('loadingState');
  if (loading) loading.innerHTML = `<p style="color: #ef4444;">${msg}</p><a href="../explorar/" style="color: var(--primary); text-decoration: none; font-weight: 600;">← Voltar para explorar</a>`;
}
