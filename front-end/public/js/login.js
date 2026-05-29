/**
 * Script da página de login
 */

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  const identificadorInput = document.getElementById('identificador');
  const senhaInput = document.getElementById('senha');
  const lembrarCheckbox = document.getElementById('lembrar');

  // Preencher dados se "manter-me ligado" foi marcado
  if (localStorage.getItem('lembrar_login')) {
    identificadorInput.value = localStorage.getItem('identificador_salvo') || '';
    lembrarCheckbox.checked = true;
  }

  // Limpar erros quando o utilizador começa a escrever
  identificadorInput.addEventListener('input', function() {
    document.getElementById('identificadorError').textContent = '';
  });

  senhaInput.addEventListener('input', function() {
    document.getElementById('senhaError').textContent = '';
  });

  // Event listener para o formulário
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpar erros anteriores
    document.getElementById('identificadorError').textContent = '';
    document.getElementById('senhaError').textContent = '';
    document.getElementById('formError').textContent = '';

    // Validar campos
    let temErros = false;
    const identificador = identificadorInput.value.trim();
    const senha = senhaInput.value;

    if (!identificador) {
      document.getElementById('identificadorError').textContent = 'Email ou telefone são obrigatórios';
      temErros = true;
    } else if (!validarIdentificador(identificador)) {
      document.getElementById('identificadorError').textContent = 'Email ou telefone inválido';
      temErros = true;
    }

    if (!senha) {
      document.getElementById('senhaError').textContent = 'Senha é obrigatória';
      temErros = true;
    }

    if (temErros) {
      mostrarToast('Por favor, corrija os erros no formulário', 'error');
      return;
    }

    // Mostrar loading
    mostrarLoading(true);
    const botao = loginForm.querySelector('.btn-submit');
    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = 'Entrando...';

    try {
      const resultado = await login(identificador, senha);

      if (resultado.success) {
        // Guardar dados se marcou "manter-me ligado"
        if (lembrarCheckbox.checked) {
          localStorage.setItem('lembrar_login', 'true');
          localStorage.setItem('identificador_salvo', identificador);
        } else {
          localStorage.removeItem('lembrar_login');
          localStorage.removeItem('identificador_salvo');
        }

        mostrarToast('Login realizado com sucesso!', 'success');
        mostrarLoading(false);

        // Redirecionar para home após 1 segundo
        setTimeout(() => {
          window.location.href = '../';
        }, 1000);
      } else {
        const mensagem = resultado.error === 'Credenciais inválidas'
          ? 'Email/telefone ou senha incorretos'
          : resultado.error;
        document.getElementById('formError').textContent = mensagem;
        mostrarToast(mensagem, 'error');
        mostrarLoading(false);
      }
    } catch (erro) {
      document.getElementById('formError').textContent = 'Erro ao conectar com o servidor';
      mostrarToast('Erro ao conectar com o servidor', 'error');
      mostrarLoading(false);
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  });
});

// Função para mostrar/esconder senha
function togglePassword() {
  const senhaInput = document.getElementById('senha');
  const toggleBtn = document.querySelector('.toggle-password i');

  if (senhaInput.type === 'password') {
    senhaInput.type = 'text';
    toggleBtn.classList.remove('fa-eye');
    toggleBtn.classList.add('fa-eye-slash');
  } else {
    senhaInput.type = 'password';
    toggleBtn.classList.remove('fa-eye-slash');
    toggleBtn.classList.add('fa-eye');
  }
}

// Função para mostrar toast
function mostrarToast(mensagem, tipo = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = `toast ${tipo} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Função para controlar loading
function mostrarLoading(mostrar) {
  const overlay = document.getElementById('loadingOverlay');
  if (mostrar) {
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}
