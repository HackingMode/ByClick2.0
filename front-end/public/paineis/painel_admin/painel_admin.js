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

  // Preencher dados reais
  obterMeuPerfil().then(res => {
      if(res && res.success && res.data) {
          const u = res.data;
          document.getElementById('editNome').value = u.nome_completo || '';
          document.getElementById('editTelefone').value = u.numero_telefone || '';
          
          const pImg = document.getElementById('previewPerfilAdmin');
          if (pImg) {
              pImg.src = u.foto_perfil_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome_completo)}&background=C84B1F&color=fff`;
          }
      }
  });

  // Preview da Imagem no Admin
  const imgInput = document.getElementById('imgPerfilAdmin');
  const imgPreview = document.getElementById('previewPerfilAdmin');
  if (imgInput && imgPreview) {
      imgInput.addEventListener('change', function() {
          if (this.files && this.files[0]) {
              const reader = new FileReader();
              reader.onload = function(e) { imgPreview.src = e.target.result; };
              reader.readAsDataURL(this.files[0]);
          }
      });
  }

  // Submit Perfil Admin
  const formEditarPerfil = document.getElementById('formEditarPerfil');
  if (formEditarPerfil) {
      formEditarPerfil.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('btnSubmitEditPerfil');
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
              nome_completo: document.getElementById('editNome').value,
              numero_telefone: document.getElementById('editTelefone').value
          };
          if (base64Img) payload.foto_perfil = base64Img;

          try {
              await apiCall('PUT', '/admin/meu-perfil', payload);
              showToast('Perfil atualizado com sucesso!', 'success');
              
              // Atualizar no localStorage
              const u = JSON.parse(localStorage.getItem('usuario') || '{}');
              u.nome_completo = payload.nome_completo;
              if (payload.numero_telefone) u.numero_telefone = payload.numero_telefone;
              if (base64Img) u.foto_perfil_url = base64Img; // Pode n ser exatamente a URL final mas serve pro visual provisório
              localStorage.setItem('usuario', JSON.stringify(u));

              setTimeout(() => window.location.reload(), 1500);
          } catch (error) {
              showToast(error.message || 'Erro ao atualizar perfil', 'error');
              btn.disabled = false;
              btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
          }
      });
  }

  // Submit Segurança Admin
  const formMudarSenha = document.getElementById('formMudarSenha');
  if (formMudarSenha) {
      formMudarSenha.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('btnSubmitMudarSenha');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

          const payload = {
              senha_atual: document.getElementById('senhaAtualAdmin').value,
              nova_senha: document.getElementById('novaSenhaAdmin').value
          };

          try {
              await apiCall('PUT', '/auth/mudar-senha', payload);
              showToast('Palavra-passe alterada!', 'success');
              document.getElementById('modalMudarSenha').classList.remove('active');
              formMudarSenha.reset();
          } catch (error) {
              showToast(error.message || 'Erro ao alterar palavra-passe', 'error');
          } finally {
              btn.disabled = false;
              btn.innerHTML = '<i class="fa-solid fa-key"></i> Atualizar Palavra-passe';
          }
      });
  }

  // Botões de Definições -> Abrir Modais
  const btnEditPerfil = document.querySelector('.btn-edit');
  if (btnEditPerfil) {
      btnEditPerfil.addEventListener('click', () => {
          document.getElementById('modalEditarPerfil').classList.add('active');
      });
  }
  const btnDefSeguranca = document.getElementById('btn-def-seguranca');
  if (btnDefSeguranca) {
      btnDefSeguranca.addEventListener('click', () => {
          document.getElementById('modalMudarSenha').classList.add('active');
      });
  }

  // Lógica dos Avisos
  const btnCriarAviso = document.querySelector('.action-btn.ab-green');
  if (btnCriarAviso) {
      btnCriarAviso.addEventListener('click', () => {
          document.getElementById('modalCriarAviso').classList.add('active');
      });
  }

  const formCriarAviso = document.getElementById('formCriarAviso');
  if (formCriarAviso) {
      formCriarAviso.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('btnSubmitAviso');
          const originalText = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A enviar...';

          // Simular envio de aviso à API
          setTimeout(() => {
              showToast('Aviso enviado com sucesso!', 'success');
              document.getElementById('modalCriarAviso').classList.remove('active');
              formCriarAviso.reset();
              btn.disabled = false;
              btn.innerHTML = originalText;
          }, 1000);
      });
  }

  // Gestão de Utilizadores (Carregar ao clicar na tab)
  const navUtilizadores = document.querySelector('.nav-item[data-tab="utilizadores"]');
  if (navUtilizadores) {
      navUtilizadores.addEventListener('click', carregarUtilizadores);
  }

  // Filtros de Utilizadores
  const inputPesquisa = document.getElementById('pesquisaUtilizadores');
  const selFiltro = document.getElementById('filtroTipoUtilizador');
  
  function filtrarTabela() {
      if(typeof utilizadoresCache === 'undefined') return;
      const q = inputPesquisa ? inputPesquisa.value.toLowerCase() : '';
      const t = selFiltro ? selFiltro.value : '';
      
      const filtered = utilizadoresCache.filter(u => {
          const matchQ = u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
          const matchT = t === '' || u.tipo === t;
          return matchQ && matchT;
      });
      renderizarTabelaUtilizadores(filtered);
  }

  if (inputPesquisa) inputPesquisa.addEventListener('input', filtrarTabela);
  if (selFiltro) selFiltro.addEventListener('change', filtrarTabela);

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

// -------------------------------------------------------------
// LÓGICA DE UTILIZADORES
// -------------------------------------------------------------

let utilizadoresCache = [];

async function carregarUtilizadores() {
    const tbody = document.getElementById('tabelaUtilizadoresAdmin');
    if (!tbody) return;
    
    // Evitar múltiplos carregamentos se já tivermos os dados (num caso real poderíamos forçar o refresh)
    if (utilizadoresCache.length > 0) return;

    try {
        // Simulando chamada à API
        // const res = await apiCall('GET', '/admin/utilizadores');
        // utilizadoresCache = res.data;
        
        // MOCK DE DADOS PARA DEMONSTRAÇÃO
        const mockUsers = [
            { id: 1, nome: "João Silva", email: "joao@exemplo.com", tipo: "comprador", ativo: true },
            { id: 2, nome: "Loja ABC", email: "loja@abc.com", tipo: "vendedor", ativo: true },
            { id: 3, nome: "Maria Inativa", email: "maria@teste.com", tipo: "empresa", ativo: false },
            { id: 4, nome: "Pedro Comprador", email: "pedro@mail.com", tipo: "comprador", ativo: true }
        ];
        
        utilizadoresCache = mockUsers;
        renderizarTabelaUtilizadores(utilizadoresCache);

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--red);">Erro ao carregar utilizadores.</td></tr>`;
    }
}

function renderizarTabelaUtilizadores(lista) {
    const tbody = document.getElementById('tabelaUtilizadoresAdmin');
    if (!tbody) return;
    
    if(lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum utilizador encontrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(u => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px; color: var(--ink-soft);">#${u.id}</td>
            <td style="padding: 12px; font-weight: 500;">${u.nome}</td>
            <td style="padding: 12px; color: var(--ink-soft);">${u.email}</td>
            <td style="padding: 12px; text-transform: capitalize;">${u.tipo}</td>
            <td style="padding: 12px;">
                <span style="background: ${u.ativo ? 'var(--green-light)' : 'var(--red-light)'}; color: ${u.ativo ? 'var(--green)' : 'var(--red)'}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
                    ${u.ativo ? 'Ativo' : 'Bloqueado'}
                </span>
            </td>
            <td style="padding: 12px;">
                <button onclick="abrirDetalhesUtilizador(${u.id})" class="btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 4px;">Ver</button>
            </td>
        </tr>
    `).join('');
}

window.abrirDetalhesUtilizador = function(id) {
    const u = utilizadoresCache.find(x => x.id === id);
    if (!u) return;

    const modal = document.getElementById('modalDetalhesUtilizador');
    const conteudo = document.getElementById('conteudoDetalhesUtilizador');
    const btnAcao = document.getElementById('btnAcaoUtilizador');

    conteudo.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--blue); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold;">
                ${u.nome.charAt(0).toUpperCase()}
            </div>
            <div>
                <h3 style="margin: 0; font-size: 1.2rem;">${u.nome}</h3>
                <div style="color: var(--ink-soft);">${u.email}</div>
            </div>
        </div>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: var(--ink-soft);">ID do Utilizador:</span>
                <strong>#${u.id}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: var(--ink-soft);">Tipo de Conta:</span>
                <strong style="text-transform: capitalize;">${u.tipo}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--ink-soft);">Estado Atual:</span>
                <strong style="color: ${u.ativo ? 'var(--green)' : 'var(--red)'};">${u.ativo ? 'Ativo' : 'Bloqueado'}</strong>
            </div>
        </div>
    `;

    if (u.ativo) {
        btnAcao.style.background = 'var(--red)';
        btnAcao.textContent = 'Bloquear Utilizador';
        btnAcao.onclick = () => alternarEstadoUtilizador(u.id, false);
    } else {
        btnAcao.style.background = 'var(--green)';
        btnAcao.textContent = 'Desbloquear Utilizador';
        btnAcao.onclick = () => alternarEstadoUtilizador(u.id, true);
    }

    modal.classList.add('active');
};

function alternarEstadoUtilizador(id, novoEstado) {
    // Simulando chamada à API
    // await apiCall('PATCH', '/admin/utilizadores/' + id + '/estado', { ativo: novoEstado });
    
    const u = utilizadoresCache.find(x => x.id === id);
    if(u) {
        u.ativo = novoEstado;
        renderizarTabelaUtilizadores(utilizadoresCache);
        document.getElementById('modalDetalhesUtilizador').classList.remove('active');
        showToast(novoEstado ? 'Utilizador desbloqueado com sucesso.' : 'Utilizador bloqueado por segurança.', 'success');
    }
}
