/**
 * Detalhes do Produto — Kitanda
 */

document.addEventListener('DOMContentLoaded', async function() {
  atualizarNavbarAuth();

  const params = new URLSearchParams(window.location.search);
  const servicoId = params.get('id');

  if (!servicoId) {
    mostrarErro('Serviço não encontrado.');
    return;
  }

  await carregarServico(servicoId);
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

async function carregarServico(id) {
  const loading = document.getElementById('loadingState');
  const content = document.getElementById('productContent');

  try {
    const servico = await apiCall('GET', `/servicos/${id}`);
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'grid';
    renderizarServico(servico);
  } catch (erro) {
    console.error('Erro ao carregar serviço:', erro);
    // Fallback demo
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'grid';
    renderizarServicoDemo(id);
  }
}

function renderizarServico(p) {
  // Title
  document.title = `${p.nome} — Kitanda`;
  const titleEl = document.querySelector('[data-service-title]');
  if (titleEl) titleEl.textContent = p.nome || 'Serviço';

  // Breadcrumb
  const breadEl = document.querySelector('[data-service-name]');
  if (breadEl) breadEl.textContent = p.nome || 'Serviço';

  // Price
  const priceEl = document.querySelector('[data-service-price]');
  if (priceEl) priceEl.textContent = `A partir de ${(p.preco_base || p.preco || 0).toLocaleString('pt-AO')} Kz`;

  // Description
  const descEl = document.querySelector('[data-service-desc]');
  if (descEl) descEl.textContent = p.descricao || 'Sem descrição disponível.';

  // Duration
  const durEl = document.querySelector('[data-service-duration]');
  const chipDuracao = document.getElementById('chipDuracao');
  if (p.duracao_estimada) {
    if (durEl) durEl.textContent = p.duracao_estimada;
    if (chipDuracao) chipDuracao.style.display = 'inline-flex';
  } else {
    if (chipDuracao) chipDuracao.style.display = 'none';
  }

  // Modalities
  const chipOnline = document.getElementById('chipOnline');
  const chipPresencial = document.getElementById('chipPresencial');
  if (p.disponivel_online && chipOnline) chipOnline.style.display = 'inline-flex';
  if (p.disponivel_presencial && chipPresencial) chipPresencial.style.display = 'inline-flex';

  // Main image
  const mainImg = document.getElementById('mainImage');
  const imgUrl = p.imagem_url || p.imagens?.[0]?.url || `https://placehold.co/600x400/8b5cf6/ffffff?text=Servico`;
  if (mainImg) mainImg.src = imgUrl;

  // Thumbnails
  const thumbsContainer = document.getElementById('galleryThumbs');
  if (thumbsContainer && p.imagens && p.imagens.length > 1) {
    thumbsContainer.innerHTML = p.imagens.map((img, i) => `
      <img src="${img.url}" alt="Imagem ${i+1}" class="${i === 0 ? 'active' : ''}" onclick="trocarImagem(this, '${img.url}')">
    `).join('');
  }

  // Badges
  const badgesEl = document.getElementById('serviceBadges');
  if (badgesEl) {
    let badges = '<span class="badge-item badge-service" style="background:#8b5cf6;">Serviço</span>';
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

  // Modal Agendamento Logic
  const hireBtn = document.getElementById('btnContratar');
  const modalAgendamento = document.getElementById('modalAgendamento');
  const btnCancelarAgendamento = document.getElementById('btnCancelarAgendamento');
  const btnConfirmarAgendamento = document.getElementById('btnConfirmarAgendamento');

  if (hireBtn && modalAgendamento) {
    hireBtn.addEventListener('click', () => {
      modalAgendamento.style.display = 'flex';
      // Definir data mínima como hoje
      const dataInput = document.getElementById('agendarData');
      if (dataInput) dataInput.min = new Date().toISOString().split('T')[0];
    });
  }

  if (btnCancelarAgendamento && modalAgendamento) {
    btnCancelarAgendamento.addEventListener('click', () => {
      modalAgendamento.style.display = 'none';
    });
  }

  if (btnConfirmarAgendamento) {
    btnConfirmarAgendamento.addEventListener('click', () => {
      const data = document.getElementById('agendarData').value;
      const hora = document.getElementById('agendarHora').value;
      const desc = document.getElementById('agendarDesc').value;

      if (!data || !hora) {
        mostrarToast('Por favor, preencha a data e hora desejadas.', 'error');
        return;
      }

      if (typeof adicionarAoCarrinho === 'function') {
        // Guardamos as informações no carrinho para posterior checkout
        adicionarAoCarrinho({
          id: p.id,
          tipo: 'servico',
          nome: p.nome,
          preco: p.preco_promocional || p.preco,
          imagem_url: p.imagem_url || (p.imagens && p.imagens.length > 0 ? p.imagens[0].url : ''),
          vendedor_nome: p.vendedor_nome || 'Vendedor Kitanda',
          vendedor_id: p.vendedor_id,
          // Guardar detalhes do agendamento
          agendamento_data: data,
          agendamento_hora: hora,
          agendamento_desc: desc
        });
        
        modalAgendamento.style.display = 'none';
        
        // Redireciona para o checkout ou login se não estiver logado
        if (estaAutenticado()) {
            window.location.href = '../checkout/';
        } else {
            window.location.href = '../login/?redirect=../checkout/';
        }
      }
    });
  }

  const contactBtn = document.getElementById('btnContactar');
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      if (p.vendedor_telefone) {
        window.open(`https://wa.me/${p.vendedor_telefone}?text=Olá! Tenho interesse no seu serviço "${p.nome}" no Kitanda.`, '_blank');
      } else {
        mostrarToast('Contacto do prestador não disponível.', 'warning');
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

function renderizarServicoDemo(id) {
  const demos = {
    '7': { nome: 'Serviço de Design Gráfico', preco_base: 75000, duracao_estimada: 'Por Projeto', descricao: 'Criação de logótipos, banners e identidade visual para a sua empresa.', disponivel_online: true, disponivel_presencial: false },
    '8': { nome: 'Consultoria Empresarial', preco_base: 150000, duracao_estimada: 'Mensal', descricao: 'Consultoria financeira e planeamento estratégico para PMEs.', disponivel_online: true, disponivel_presencial: true }
  };
  const demo = demos[id] || { nome: 'Serviço Demo', preco_base: 50000, duracao_estimada: '1 hora', descricao: 'Descrição do serviço de demonstração.', disponivel_online: true, disponivel_presencial: true };
  demo.id = id;
  demo.criado_em = new Date().toISOString();
  renderizarServico(demo);
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
