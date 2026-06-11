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
          'empresa': 'paineis/painel_empresa/painel_empresa.html'
        };
        painelBtn.href = panelMap[tipo] || panelMap['comprador'];
      } catch (e) {
        painelBtn.href = 'paineis/painel_comprador/painel_comprador.html';
      }
    }
  }
}
