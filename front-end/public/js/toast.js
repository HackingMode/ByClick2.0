/**
 * Sistema de Toast globalizado para toda a aplicação
 */

function inicializarToast() {
  // Criar elemento de toast se não existir
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  // Criar overlay de loading se não existir
  if (!document.getElementById('loadingOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);

    // Adicionar CSS do loading se não estiver no arquivo CSS
    if (!document.querySelector('style[data-loading]')) {
      const style = document.createElement('style');
      style.setAttribute('data-loading', 'true');
      style.textContent = `
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 998;
        }
        .loading-overlay.show {
          display: flex;
        }
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
  inicializarToast();

  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  // Cores baseado no tipo
  const cores = {
    success: '#16a34a',
    error: '#dc2626',
    info: '#2563eb',
    warning: '#ea580c'
  };

  toast.style.cssText = `
    background: ${cores[tipo] || cores.info};
    color: white;
    padding: 16px 24px;
    border-radius: 10px;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    word-break: break-word;
    max-width: 400px;
  `;

  // Adicionar ícone
  const iconos = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  toast.innerHTML = `
    <span style="font-size: 18px; flex-shrink: 0;">${iconos[tipo] || '•'}</span>
    <span style="flex: 1;">${mensagem}</span>
  `;

  container.appendChild(toast);

  // Remover após duração
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duracao);
}

function mostrarLoading(mostrar) {
  inicializarToast();
  const overlay = document.getElementById('loadingOverlay');
  if (mostrar) {
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}

// Adicionar animações CSS
function adicionarAnimacoesToast() {
  if (!document.querySelector('style[data-toast]')) {
    const style = document.createElement('style');
    style.setAttribute('data-toast', 'true');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(100px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes slideDown {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(100px);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Inicializar quando documento carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    inicializarToast();
    adicionarAnimacoesToast();
  });
} else {
  inicializarToast();
  adicionarAnimacoesToast();
}
