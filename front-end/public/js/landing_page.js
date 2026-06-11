/**
 * Landing Page - Kitanda
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // Esconder loader inicial
  setTimeout(() => {
    const loader = document.querySelector('.loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }, 1000);

  // Verificar autenticação
  atualizarNavbarAuth();

  // Carregar Destaques da API
  carregarDestaques();

  // Funcionalidade da barra de pesquisa
  const searchInput = document.getElementById('landingSearch');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query) {
          window.location.href = `explorar/?q=${encodeURIComponent(query)}`;
        }
      }
    });
  }

  // Animação de scroll suave (opcional, pode expandir depois)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-up');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.cat-pill, .hero__left, .hero__right').forEach(el => {
    el.classList.add('pre-animate');
    observer.observe(el);
  });

  // Funcionalidade de clique nos produtos
  document.querySelectorAll('.prod-card').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.prod-card__favorite')) return;
      window.location.href = 'produto/';
    });
  });

  // Tabs de Como Funciona
  const hiwTabs = document.querySelectorAll('.hiw-tab');
  hiwTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active from all tabs
      hiwTabs.forEach(t => t.classList.remove('active'));
      // Add active to clicked tab
      this.classList.add('active');
      
      // Hide all timelines
      document.querySelectorAll('.how-it-works .timeline').forEach(tl => {
        tl.style.display = 'none';
        tl.classList.remove('active');
      });
      
      // Show target timeline
      const targetId = this.getAttribute('data-target');
      const targetTl = document.getElementById(targetId);
      if (targetTl) {
        targetTl.style.display = 'flex';
        // Pequeno delay para a transicao
        setTimeout(() => targetTl.classList.add('active'), 10);
      }
    });
  });

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
      
      try {
        const userData = JSON.parse(localStorage.getItem('usuario') || '{}');
        const tipo = userData.tipo_utilizador || 'comprador';
        const panelMap = {
          'comprador': 'paineis/painel_comprador/painel_comprador.html',
          'vendedor': 'paineis/painel_vendedor/painel_vendedor.html',
          'empresa': 'paineis/painel_empresa/painel_empresa.html',
          'admin': 'paineis/painel_admin/painel_admin.html'
        };
        painelBtn.href = panelMap[tipo] || panelMap['comprador'];
      } catch (e) {
        painelBtn.href = 'paineis/painel_comprador/painel_comprador.html';
      }
    }
  }
}

async function carregarDestaques() {
  const grid = document.getElementById('destaquesGrid');
  const loading = document.getElementById('destaquesLoading');
  if (!grid || !loading) return;

  try {
    const produtos = await apiCall('GET', '/explorar/pesquisa?limit=4');
    
    loading.style.display = 'none';

    if (!produtos || produtos.length === 0) {
      grid.innerHTML = '<p style="color:var(--ink-soft); grid-column: 1/-1;">Sem produtos em destaque no momento.</p>';
      return;
    }

    // Mostrar apenas os primeiros 4 itens (ou o que quiser)
    const destaques = produtos.slice(0, 4);
    
    grid.innerHTML = destaques.map(p => {
      const img = p.imagem_url || `https://picsum.photos/seed/${p.id}/400/300`;
      const isServico = p.tipo === 'servico';
      const badgeStr = isServico 
        ? '<span style="background:#8b5cf6; color:white; padding: 2px 8px; border-radius: 12px; font-size:12px; font-weight: bold; position:absolute; top: 10px; left: 10px;">Serviço</span>' 
        : '<span style="background:#C84B1F; color:white; padding: 2px 8px; border-radius: 12px; font-size:12px; font-weight: bold; position:absolute; top: 10px; left: 10px;">Novo</span>';
      const url = isServico ? `servico/?id=${p.id}` : `produto/?id=${p.id}`;
      const precoText = isServico ? `A partir de ${(p.preco || 0).toLocaleString('pt-AO')} Kz` : `${(p.preco || 0).toLocaleString('pt-AO')} Kz`;

      return `
        <a href="${url}" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm); text-decoration: none; color: var(--ink); display: flex; flex-direction: column; position: relative; transition: transform 0.2s;">
          ${badgeStr}
          <div style="height: 180px; width: 100%; overflow: hidden;">
            <img src="${img}" alt="${p.nome}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://picsum.photos/seed/${p.id}/400/300'">
          </div>
          <div style="padding: 16px; flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 1.1rem; margin-bottom: 8px;">${p.nome}</h3>
            <div style="margin-top: auto; font-weight: 700; color: var(--terra); font-size: 1.2rem;">${precoText}</div>
            <div style="margin-top: 8px; font-size: 0.9rem; color: var(--ink-soft);"><i class="fa-solid fa-star" style="color: #fbbf24;"></i> ${(p.avaliacao_media || 0).toFixed(1)}</div>
          </div>
        </a>
      `;
    }).join('');

  } catch (error) {
    console.error('Erro ao carregar destaques:', error);
    loading.innerHTML = '<p style="color:var(--terra);"><i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar destaques.</p>';
  }
}

