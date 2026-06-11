document.addEventListener('DOMContentLoaded', function() {
  const resetForm = document.getElementById('resetForm');
  const identificadorSalvo = localStorage.getItem('reset_identificador');

  // Se nao tiver o identificador salvo, redirecionar de volta
  if (!identificadorSalvo) {
    window.location.href = '../recuperar-senha/';
    return;
  }

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const codigo = document.getElementById('codigo').value.trim();
    const nova_senha = document.getElementById('nova_senha').value;
    const confirmar_senha = document.getElementById('confirmar_senha').value;

    // Limpar erros
    document.getElementById('codigoError').textContent = '';
    document.getElementById('novaSenhaError').textContent = '';
    document.getElementById('confirmarSenhaError').textContent = '';
    const formErrorDiv = document.getElementById('formError');
    formErrorDiv.textContent = '';
    formErrorDiv.style.display = 'none';

    let temErros = false;

    if (!codigo || codigo.length < 4) {
      document.getElementById('codigoError').textContent = 'Código inválido.';
      temErros = true;
    }

    if (nova_senha.length < 8) {
      document.getElementById('novaSenhaError').textContent = 'A senha deve ter pelo menos 8 caracteres.';
      temErros = true;
    }

    if (nova_senha !== confirmar_senha) {
      document.getElementById('confirmarSenhaError').textContent = 'As senhas não coincidem.';
      temErros = true;
    }

    if (temErros) {
      mostrarToast('Por favor, corrija os erros no formulário', 'error');
      return;
    }

    // Mostrar loading
    const botao = resetForm.querySelector('.btn-submit');
    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = 'A redefinir...';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/redefinir-senha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          identificador: identificadorSalvo,
          codigo,
          nova_senha,
          confirmar_senha
        })
      });

      const data = await response.json();

      if (response.ok) {
        mostrarToast('Palavra-passe alterada com sucesso!', 'success');
        
        // Limpar storage
        localStorage.removeItem('reset_identificador');

        // Redirecionar para o login
        setTimeout(() => {
          window.location.href = '../login/';
        }, 1500);
      } else {
        const msgErro = data.detail || 'Erro ao redefinir a palavra-passe.';
        formErrorDiv.textContent = msgErro;
        formErrorDiv.style.display = 'block';
        mostrarToast(msgErro, 'error');
      }
    } catch (error) {
      formErrorDiv.textContent = 'Erro ao conectar com o servidor.';
      formErrorDiv.style.display = 'block';
      mostrarToast('Erro de conexão.', 'error');
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  });
});

// Função para mostrar/esconder senha
function togglePassword(inputId) {
  const senhaInput = document.getElementById(inputId);
  const toggleBtn = senhaInput.nextElementSibling.querySelector('i');

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
