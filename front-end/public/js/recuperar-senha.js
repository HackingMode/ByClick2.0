document.addEventListener('DOMContentLoaded', function() {
  const recoverForm = document.getElementById('recoverForm');
  const identificadorInput = document.getElementById('identificador');

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

  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpar erros
    document.getElementById('identificadorError').textContent = '';
    const formErrorDiv = document.getElementById('formError');
    formErrorDiv.textContent = '';
    formErrorDiv.style.display = 'none';

    const identificador = identificadorInput.value.trim();

    if (!identificador || identificador.length < 3) {
      document.getElementById('identificadorError').textContent = 'Insira um email ou número de telefone válido.';
      identificadorInput.style.borderColor = '#ef4444';
      mostrarToast('Por favor, verifique os campos.', 'error');
      return;
    }

    // Mostrar loading
    const botao = recoverForm.querySelector('.btn-submit');
    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = 'A enviar...';

    try {
      // Usar a mesma estrutura do api.js para a chamada
      const response = await fetch(`${API_BASE_URL}/auth/recuperar-senha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identificador })
      });

      const data = await response.json();

      if (response.ok) {
        mostrarToast(data.mensagem || 'Código enviado!', 'success');
        
        // Guardar identificador para a proxima pagina
        localStorage.setItem('reset_identificador', identificador);

        // Redirecionar para inserir o código
        setTimeout(() => {
          window.location.href = '../redefinir-senha/';
        }, 1500);
      } else {
        const msgErro = data.detail || 'Erro ao processar o pedido';
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
