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

  // Validação em tempo real para identificador
  identificadorInput.addEventListener('input', function() {
    document.getElementById('identificadorError').textContent = '';
    const identificador = this.value.trim();

    if (identificador) {
      if (identificador.length >= 3) {
        this.style.borderColor = '#16a34a';
      } else {
        this.style.borderColor = '#ef4444';
      }
    } else {
      this.style.borderColor = '#e2e8f0';
    }
  });

  // Validação em tempo real para senha
  senhaInput.addEventListener('input', function() {
    document.getElementById('senhaError').textContent = '';
    if (this.value) {
      this.style.borderColor = '#16a34a';
    } else {
      this.style.borderColor = '#e2e8f0';
    }
  });

  // Event listener para o formulário
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpar erros anteriores
    document.getElementById('identificadorError').textContent = '';
    document.getElementById('senhaError').textContent = '';
    const formErrorDiv = document.getElementById('formError');
    formErrorDiv.textContent = '';
    formErrorDiv.style.display = 'none';

    // Validar campos
    let temErros = false;
    const identificador = identificadorInput.value.trim();
    const senha = senhaInput.value;

    if (!identificador) {
      document.getElementById('identificadorError').textContent = 'Email, telefone ou nome de utilizador são obrigatórios';
      identificadorInput.style.borderColor = '#ef4444';
      temErros = true;
    } else if (identificador.length < 3) {
      document.getElementById('identificadorError').textContent = 'Identificador muito curto';
      identificadorInput.style.borderColor = '#ef4444';
      temErros = true;
    }

    if (!senha) {
      document.getElementById('senhaError').textContent = 'Senha é obrigatória';
      senhaInput.style.borderColor = '#ef4444';
      temErros = true;
    }

    if (temErros) {
      mostrarToast('Por favor, corrija os erros no formulário', 'error');
      return;
    }

    // Mostrar loading
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

        // Obter perfil para determinar tipo de utilizador e redirecionar
        const perfilResult = await obterMeuPerfil();
        let redirecionamento = '../';

        if (perfilResult.success && perfilResult.data) {
          const tipo = perfilResult.data.tipo_utilizador;
          const isEmpresa = tipo === 'empresa' || (tipo === 'vendedor' && perfilResult.data.tipo_vendedor === 'empresa');
          localStorage.setItem('usuario', JSON.stringify(perfilResult.data));
          
          if (isEmpresa) {
            redirecionamento = '../paineis/painel_empresa/painel_empresa.html';
          } else if (tipo === 'vendedor') {
            redirecionamento = '../paineis/painel_vendedor/painel_vendedor.html';
          } else if (tipo === 'comprador') {
            redirecionamento = '../paineis/painel_comprador/painel_comprador.html';
          } else if (tipo === 'admin') {
            redirecionamento = '../paineis/painel_admin/painel_admin.html';
          }
        }

        // Redirecionar após 1 segundo
        setTimeout(() => {
          window.location.href = redirecionamento;
        }, 1000);
      } else {
        const mensagem = resultado.error === 'Credenciais invalidas'
          ? 'Email/telefone ou senha incorretos'
          : resultado.error;
        const formErrorDiv = document.getElementById('formError');
        formErrorDiv.textContent = mensagem;
        formErrorDiv.style.display = 'block';
        mostrarToast(mensagem, 'error');
      }
    } catch (erro) {
      const formErrorDiv = document.getElementById('formError');
      formErrorDiv.textContent = 'Erro ao conectar com o servidor';
      formErrorDiv.style.display = 'block';
      mostrarToast('Erro ao conectar com o servidor', 'error');
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
      identificadorInput.style.borderColor = '#e2e8f0';
      senhaInput.style.borderColor = '#e2e8f0';
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
