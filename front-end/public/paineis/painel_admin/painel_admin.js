/**
 * Painel do Administrador - Kitanda
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!estaAutenticado()) {
    window.location.href = '../../login/';
    return;
  }

  const usuarioStr = localStorage.getItem('usuario');
  if (usuarioStr) {
    try {
      const usuario = JSON.parse(usuarioStr);
      if(usuario.tipo_utilizador !== 'admin') {
          window.location.href = '../../';
          return;
      }
      
      const nomeEls = document.querySelectorAll('[data-user-name]');
      nomeEls.forEach(el => el.textContent = usuario.nome_completo);
      
      const defaultAvatar = "https://ui-avatars.com/api/?name=" + encodeURIComponent(usuario.nome_completo) + "&background=C84B1F&color=fff&size=150";
      const avatarSrc = usuario.foto_perfil_url || defaultAvatar;

      const fotoEls = document.querySelectorAll('[data-user-photo], [data-profile-photo]');
      fotoEls.forEach(el => el.src = avatarSrc);
      
      const emailEls = document.querySelectorAll('[data-profile-email]');
      emailEls.forEach(el => el.textContent = usuario.email);

      // Preencher o input de edição de perfil
      const editNome = document.getElementById('editNome');
      if (editNome) editNome.value = usuario.nome_completo;
    } catch (e) {
      console.error('Erro ao ler utilizador', e);
    }
  }

  configurarNavegacao();
  
  // Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      showConfirmModal('Terminar Sessão', 'Tem certeza que deseja terminar a sua sessão?', logout, 'Terminar Sessão');
    });
  }
});

function configurarNavegacao() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const views = {
    'visao-geral': document.getElementById('view-dashboard'),
    'utilizadores': document.getElementById('tab-utilizadores'),
    'aprovacoes': document.getElementById('tab-aprovacoes'),
    'denuncias': document.getElementById('tab-denuncias'),
    'definicoes': document.getElementById('view-definicoes')
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      if (!tabId || !views[tabId]) return;

      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      Object.values(views).forEach(v => { if(v) v.style.display = 'none'; });
      views[tabId].style.display = 'block';
      
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (window.innerWidth <= 900) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      }
    });
  });

  // Toggle mobile
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (menuToggle && sidebar) {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
      overlay.classList.add('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
}


