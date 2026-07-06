/**
 * Painel do Comprador - ByClick
 */

let pedidosProdutos = [];
let pedidosServicos = [];

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
        // Carrinho
        const carrinho = JSON.parse(localStorage.getItem('byclick_carrinho') || '{"itens":[]}');
        const totalCarrinho = carrinho.itens.reduce((acc, curr) => acc + (curr.quantidade || 1), 0);
        badges[1].textContent = totalCarrinho;
    }
}

// ===== MODAL PERFIL =====
function setupModalPerfil() {
    const btnEdit = document.querySelector('.btn-edit');
    const modal = document.getElementById('modalEditarPerfil');
    const closeBtn = document.querySelector('#modalEditarPerfil .close-modal');
    const form = document.getElementById('formEditarPerfil');

    if (!btnEdit || !modal) return;

    btnEdit.addEventListener('click', async () => {
        try {
            const user = await obterMeuPerfil();
            if (user) {
                document.getElementById('editNome').value = user.nome_completo || '';
                document.getElementById('editTelefone').value = user.numero_telefone || '';
                if (user.endereco) {
                    document.getElementById('editProvincia').value = user.endereco.provincia || '';
                    document.getElementById('editMunicipio').value = user.endereco.municipio || '';
                    document.getElementById('editBairro').value = user.endereco.bairro || '';
                }
                document.getElementById('previewFotoEdit').src = user.foto_perfil_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome_completo || 'User')}&background=0D8ABC&color=fff`;
                document.getElementById('editFotoPerfil').value = '';
                modal.classList.add('active');
            }
        } catch(e) {
            showToast('Erro ao carregar dados do perfil.', 'error');
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    const fileInput = document.getElementById('editFotoPerfil');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('previewFotoEdit').src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmitEditPerfil');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        const payload = {
            nome_completo: document.getElementById('editNome').value,
            numero_telefone: document.getElementById('editTelefone').value,
            provincia: document.getElementById('editProvincia').value,
            municipio: document.getElementById('editMunicipio').value,
            bairro: document.getElementById('editBairro').value
        };

        if (fileInput && fileInput.files.length > 0) {
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(fileInput.files[0]);
                });
                payload.foto_perfil = base64;
            } catch(e) {
                showToast("Erro ao processar a imagem.", "error");
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
                return;
            }
        }

        try {
            const res = await apiCall('PUT', '/comprador/meu-perfil', payload);
            if (res) {
                showToast('Perfil atualizado com sucesso!', 'success');
                modal.classList.remove('active');
                carregarDadosPainel(); // Recarregar perfil
            }
        } catch (error) {
            showToast('Erro ao atualizar perfil.', 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
        }
    });
}

async function carregarDadosPainel() {
  if (!verificarAutenticacao()) return;

  try {
    const [user, reqPedidosProd, reqPedidosServ] = await Promise.allSettled([
      obterMeuPerfil(),
      apiCall('GET', '/comprador/meus-pedidos?limit=10'),
      apiCall('GET', '/comprador/meus-pedidos/servicos?limit=10')
    ]);

    if (user.status === 'fulfilled' && user.value) {
      const userData = user.value.success ? user.value.data : user.value;
      atualizarPerfilUsuario(userData);
    }

    if (reqPedidosProd.status === 'fulfilled') {
      pedidosProdutos = reqPedidosProd.value || [];
    }
    
    if (reqPedidosServ.status === 'fulfilled') {
      pedidosServicos = reqPedidosServ.value || [];
    }

    atualizarTabelaPedidos(pedidosProdutos, 'produto');
    atualizarEstatisticasGerais();
  } catch (erro) {
    console.error('Erro ao carregar dados:', erro);
  }
}

function atualizarPerfilUsuario(usuario) {
  const nome = usuario.nome_completo || usuario.nome_utilizador || 'Comprador';
  const primeiroNome = nome.split(' ')[0];

  // Foto de perfil default
  const defaultAvatar = "https://ui-avatars.com/api/?name=" + encodeURIComponent(nome) + "&background=0D8ABC&color=fff&size=150";
  const avatarSrc = usuario.foto_perfil_url || defaultAvatar;

  // Sidebar
  const sideNameEl = document.querySelector('[data-user-name]');
  const sideFotoEl = document.querySelector('[data-user-photo]');
  if (sideNameEl) sideNameEl.textContent = nome;
  if (sideFotoEl) sideFotoEl.src = avatarSrc;

  // Greeting
  const greetEl = document.querySelector('[data-greeting]');
  if (greetEl) greetEl.textContent = `Olá, ${primeiroNome}! 👋`;

  // Profile card
  const profNameEl = document.querySelector('[data-profile-name]');
  const profEmailEl = document.querySelector('[data-profile-email]');
  const profPhoneEl = document.querySelector('[data-profile-phone]');
  const profFotoEl = document.querySelector('[data-profile-photo]');
  const profVerEl = document.querySelector('[data-profile-verified]');
  const membroEl = document.querySelector('[data-member-since]');

  if (profNameEl) profNameEl.textContent = nome;
  if (profEmailEl) profEmailEl.textContent = usuario.email || '—';
  if (profPhoneEl) profPhoneEl.textContent = usuario.numero_telefone || '—';
  if (profFotoEl) profFotoEl.src = avatarSrc;
  if (profVerEl) profVerEl.textContent = usuario.email_verificado ? '✓ Verificado' : 'Não verificado';
  if (membroEl && usuario.criado_em) {
    membroEl.textContent = new Date(usuario.criado_em).toLocaleDateString('pt-AO');
  }
}

function atualizarTabelaPedidos(pedidos, tipo) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #999; padding: 2rem;">
            <div class="empty-state">
                <i class="fa-solid fa-bag-shopping"></i>
                <p>Nenhum pedido de ${tipo} encontrado.<br><a href="../../explorar/" style="color: var(--blue); text-decoration: none; font-weight: 600;">Explorar →</a></p>
            </div>
        </td>
      </tr>`;
    return;
  }

  const statusClasses = {
    'pendente': 's-proc', 'confirmado': 's-pago', 'em_processamento': 's-proc',
    'enviado': 's-envio', 'entregue': 's-entregue', 'cancelado': 's-cancel'
  };
  const statusLabels = {
    'pendente': 'Pendente', 'confirmado': 'Confirmado', 'em_processamento': 'Processando',
    'enviado': 'Em envio', 'entregue': 'Entregue', 'cancelado': 'Cancelado'
  };

  tbody.innerHTML = pedidos.map(p => `
    <tr>
      <td style="font-weight: 500;">
        ${p.numero_pedido || p.id}
      </td>
      <td>${tipo === 'servico' ? '<span style="color:var(--purple);"><i class="fa-solid fa-briefcase"></i> Serviço</span>' : '<span style="color:var(--text-light);"><i class="fa-solid fa-box"></i> Produto</span>'}</td>
      <td><b>${(p.valor_total || 0).toLocaleString('pt-AO')} Kz</b></td>
      <td><span class="status ${statusClasses[p.status] || 's-proc'}"><span class="dot"></span>${statusLabels[p.status] || p.status}</span></td>
      <td style="color:var(--text-muted)">${p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-AO') : '—'}</td>
    </tr>
  `).join('');
}

function atualizarEstatisticasGerais() {
  const todosPedidos = [...pedidosProdutos, ...pedidosServicos];
  
  const ordersEl = document.querySelector('[data-orders-count]');
  const pendingEl = document.querySelector('[data-pending-count]');
  const deliveredEl = document.querySelector('[data-delivered-count]');
  
  if (ordersEl) ordersEl.textContent = todosPedidos.length;
  if (pendingEl) pendingEl.textContent = todosPedidos.filter(p => ['pendente','confirmado','em_processamento','enviado'].includes(p.status)).length;
  if (deliveredEl) deliveredEl.textContent = todosPedidos.filter(p => p.status === 'entregue').length;
}

document.addEventListener('DOMContentLoaded', function() {
  if (!verificarAutenticacao()) return;

  atualizarBadges();

  // Mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const toggle = document.getElementById('menuToggle');
  const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
  const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
  toggle?.addEventListener('click', () => sidebar.classList.contains('active') ? close() : open());
  overlay?.addEventListener('click', close);

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', function(e) {
    e.preventDefault();
    showConfirmModal('Terminar Sessão', 'Tem certeza que deseja terminar a sua sessão?', logout, 'Terminar Sessão');
  });

  // Tabs
  const tabProd = document.getElementById('tabProdutos');
  const tabServ = document.getElementById('tabServicos');
  if (tabProd && tabServ) {
    tabProd.addEventListener('click', () => {
      tabProd.classList.add('active');
      tabServ.classList.remove('active');
      atualizarTabelaPedidos(pedidosProdutos, 'produto');
    });
    tabServ.addEventListener('click', () => {
      tabServ.classList.add('active');
      tabProd.classList.remove('active');
      atualizarTabelaPedidos(pedidosServicos, 'servico');
    });
  }

  // Sidebar links funcionalidade
  const navItems = document.querySelectorAll('.nav-item');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewDefinicoes = document.getElementById('view-definicoes');
  const viewPedidos = document.getElementById('view-pedidos');
  const viewFavoritos = document.getElementById('view-favoritos');

  function ativarAba(abaNome) {
    navItems.forEach(i => i.classList.remove('active'));
    
    if(viewDashboard) viewDashboard.style.display = 'none';
    if(viewDefinicoes) viewDefinicoes.style.display = 'none';
    if(viewPedidos) viewPedidos.style.display = 'none';
    if(viewFavoritos) viewFavoritos.style.display = 'none';

    if (abaNome === 'Página Inicial') {
      if(viewDashboard) viewDashboard.style.display = 'block';
    } else if (abaNome === 'Definições' || abaNome === 'Meu Perfil') {
      if(viewDefinicoes) viewDefinicoes.style.display = 'block';
    } else if (abaNome === 'Meus Pedidos') {
      if(viewPedidos) viewPedidos.style.display = 'block';
    } else if (abaNome === 'Favoritos') {
      if(viewFavoritos) viewFavoritos.style.display = 'block';
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('nav-logout')) return; // handled separately
      
      const text = item.textContent.trim();
      
      if (text === 'Página Inicial') {
        e.preventDefault();
        ativarAba(text);
        item.classList.add('active');
      } else if (text === 'Meu Perfil') {
        e.preventDefault();
        ativarAba(text);
        if (typeof ativarSubAbaDefinicoes === 'function') ativarSubAbaDefinicoes('perfil');
        // Ativar o item "Definições" visualmente
        const defItem = Array.from(navItems).find(i => i.textContent.trim() === 'Definições');
        if(defItem) defItem.classList.add('active');
      } else if (text === 'Definições') {
        e.preventDefault();
        ativarAba(text);
        item.classList.add('active');
      } else if (text === 'Meus Pedidos') {
        e.preventDefault();
        ativarAba(text);
        item.classList.add('active');
        document.querySelector('#tabProdutos')?.click();
      } else if (text === 'Favoritos') {
        e.preventDefault();
        ativarAba(text);
        item.classList.add('active');
      }
    });
  });

  // Ações Rápidas - botão de Definições
  document.querySelectorAll('.ab-teal').forEach(btn => {
    if (btn.textContent.includes('Definições')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        ativarAba('Definições');
        const defItem = Array.from(navItems).find(i => i.textContent.trim() === 'Definições');
        if(defItem) defItem.classList.add('active');
      });
    }
  });

  // Definições Tabs
  const btnDefPerfil = document.getElementById('btn-def-perfil');
  const btnDefSeguranca = document.getElementById('btn-def-seguranca');
  const btnDefNotificacoes = document.getElementById('btn-def-notificacoes');

  const panelPerfil = document.getElementById('panel-perfil-content');
  const panelSeguranca = document.getElementById('panel-seguranca-content');
  const panelNotificacoes = document.getElementById('panel-notificacoes-content');

  window.ativarSubAbaDefinicoes = function(aba) {
    [btnDefPerfil, btnDefSeguranca, btnDefNotificacoes].forEach(btn => {
      if(btn) {
        btn.classList.remove('ab-blue');
        btn.style.background = 'transparent';
      }
    });
    
    if(panelPerfil) panelPerfil.style.display = 'none';
    if(panelSeguranca) panelSeguranca.style.display = 'none';
    if(panelNotificacoes) panelNotificacoes.style.display = 'none';

    if(aba === 'perfil') {
      if(btnDefPerfil) {
          btnDefPerfil.classList.add('ab-blue');
          btnDefPerfil.style.background = '';
      }
      if(panelPerfil) panelPerfil.style.display = 'block';
    } else if(aba === 'seguranca') {
      if(btnDefSeguranca) {
          btnDefSeguranca.classList.add('ab-blue');
          btnDefSeguranca.style.background = '';
      }
      if(panelSeguranca) panelSeguranca.style.display = 'block';
    } else if(aba === 'notificacoes') {
      if(btnDefNotificacoes) {
          btnDefNotificacoes.classList.add('ab-blue');
          btnDefNotificacoes.style.background = '';
      }
      if(panelNotificacoes) panelNotificacoes.style.display = 'block';
    }
  };

  btnDefPerfil?.addEventListener('click', () => window.ativarSubAbaDefinicoes('perfil'));
  btnDefSeguranca?.addEventListener('click', () => window.ativarSubAbaDefinicoes('seguranca'));
  btnDefNotificacoes?.addEventListener('click', () => window.ativarSubAbaDefinicoes('notificacoes'));

  // Submit Segurança Comprador
  const formSeguranca = document.getElementById('formSeguranca');
  if (formSeguranca) {
      formSeguranca.addEventListener('submit', async (e) => {
          e.preventDefault();
          const inputs = formSeguranca.querySelectorAll('input');
          const senhaAtual = inputs[0].value;
          const novaSenha = inputs[1].value;
          const confirmarSenha = inputs[2].value;

          if(novaSenha !== confirmarSenha) {
              showToast('A nova palavra-passe e a confirmação não coincidem!', 'error');
              return;
          }

          const btn = formSeguranca.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

          try {
              await apiCall('PUT', '/auth/mudar-senha', {
                  senha_atual: senhaAtual,
                  nova_senha: novaSenha
              });
              showToast('Palavra-passe alterada com sucesso!', 'success');
              formSeguranca.reset();
          } catch (error) {
              showToast(error.message || 'Erro ao alterar palavra-passe', 'error');
          } finally {
              btn.disabled = false;
              btn.innerHTML = 'Atualizar Palavra-passe';
          }
      });
  }

  setupModalPerfil();
  carregarDadosPainel();
});
