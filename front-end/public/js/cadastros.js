// Imagens usadas no painel lateral quando ha troca de tipo de cadastro.
const images = {
  comprador:
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
  vendedor:
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
  empresa:
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop'
};

/**
 * Alterna entre formularios por tipo de usuario.
 * Usado quando a tela tem abas para comprador, vendedor ou empresa.
 */
function showForm(id, button, type) {
  const forms = document.querySelectorAll('.form-box');

  forms.forEach(form => {
    form.classList.remove('active');
  });

  const selectedForm = document.getElementById(id);

  if (selectedForm) {
    selectedForm.classList.add('active');
  }

  const buttons = document.querySelectorAll('.tab-btn');

  buttons.forEach(btn => {
    btn.classList.remove('active');
  });

  button.classList.add('active');

  const leftImage = document.getElementById('leftImage');

  if (leftImage) {
    leftImage.style.backgroundImage = `url(${images[type]})`;
  }
}

/**
 * Avanca para a proxima etapa do formulario ativo.
 * Tambem atualiza os indicadores e encerra a camera quando necessario.
 */
function nextStep(current, next) {
  if (!validarEtapa(current)) {
    return;
  }

  const currentStep = document.getElementById(current);
  const nextStepElement = document.getElementById(next);

  if (currentStep && nextStepElement) {
    currentStep.classList.remove('active');
    nextStepElement.classList.add('active');
    updateStepDots(nextStepElement);
    stopFaceCameraWhenLeaving(current, next);
  }
}

function mostrarErroInput(inputElement, mensagem) {
  inputElement.classList.add('input-error');
  
  const container = inputElement.closest('.input-group') || inputElement.parentElement;
  
  // Remove erro anterior se existir
  let oldError = container.querySelector('.error-message');
  if (oldError) {
    oldError.remove();
  }
  
  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message';
  errorSpan.textContent = mensagem;
  container.appendChild(errorSpan);
}

function limparErroInput(inputElement) {
  inputElement.classList.remove('input-error');
  const container = inputElement.closest('.input-group') || inputElement.parentElement;
  let errorMsg = container.querySelector('.error-message');
  if (errorMsg) {
    errorMsg.remove();
  }
}

document.addEventListener('input', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    limparErroInput(e.target);
  }
});

function validarEtapa(stepId) {
  let valido = true;
  const step = document.getElementById(stepId);
  if (!step) return false;

  const inputs = step.querySelectorAll('input:not([type="hidden"]):not([type="file"]), select, textarea');
  let camposVazios = false;

  inputs.forEach(input => {
    limparErroInput(input);
    
    // Ignorar campos desativados ou explicitamente opcionais
    if (input.disabled || input.classList.contains('optional')) return;
    
    // Validar campos obrigatórios vazios
    // O NIF é muitas vezes opcional, mas vamos forçar preenchimento ou tratar id="vendNif" como opcional se preferir
    const isOptional = input.id.toLowerCase().includes('nif') || input.id.toLowerCase().includes('website');
    if (!isOptional && input.value.trim() === '') {
      mostrarErroInput(input, 'Este campo é obrigatório');
      camposVazios = true;
      valido = false;
    }
    
    // Validar números em campos de texto (Apenas nomes de pessoas)
    const camposSemNumeros = ['NomeCompleto', 'representativeName'];
    if (camposSemNumeros.some(id => input.id.includes(id))) {
      if (/\d/.test(input.value)) {
        mostrarErroInput(input, 'Não é permitido numeros aqui');
        valido = false;
      }
    }
    
    // Validar Data de Nascimento (18 anos ou 17 e 10 meses)
    if (input.type === 'date' && input.id.toLowerCase().includes('nascimento') && input.value) {
      const dataNasc = new Date(input.value);
      const hoje = new Date();
      let idade = hoje.getFullYear() - dataNasc.getFullYear();
      const m = hoje.getMonth() - dataNasc.getMonth();
      const d = hoje.getDate() - dataNasc.getDate();
      
      if (m < 0 || (m === 0 && d < 0)) {
        idade--;
      }
      
      // Checar se falta 2 meses ou menos para os 18 anos
      let faltamMenosDe2Meses = false;
      if (idade === 17) {
        // Quantos meses faltam para o mes de aniversario?
        let mesAniversario = dataNasc.getMonth();
        let mesAtual = hoje.getMonth();
        if (mesAniversario <= mesAtual) mesAniversario += 12; 
        let mesesPara18 = mesAniversario - mesAtual;
        
        // Ajuste pelos dias
        if (d > 0) {
           mesesPara18--;
        }
        
        if (mesesPara18 <= 2) {
          faltamMenosDe2Meses = true;
        }
      }
      
      if (idade < 18 && !faltamMenosDe2Meses) {
        mostrarErroInput(input, 'Só permitido a maiores de 18');
        valido = false;
      }
    }
    
    // Validacao extra para email
    if (input.type === 'email' && input.value.trim() !== '') {
      if (!validarEmail(input.value)) {
        mostrarErroInput(input, 'Email inválido');
        valido = false;
      }
    }
    
    // Validacao extra para telefone
    if (input.type === 'tel' && input.value.trim() !== '') {
      if (!validarTelefone(input.value)) {
        mostrarErroInput(input, 'Telefone inválido');
        valido = false;
      }
    }
  });

  if (camposVazios) {
    mostrarToast('Preencha todos os campos', 'error');
  } else if (!valido) {
    mostrarToast('Corrija os erros destacados', 'error');
  }

  // Validar campos de ficheiros nas etapas específicas
  if (stepId === 'vstep2') {
    const photo = document.getElementById('biInput');
    if (photo && photo.files.length === 0) { 
      mostrarToast('Foto do BI é obrigatória', 'error'); 
      valido = false; 
    }
  }
  
  if (stepId === 'vstep3') {
    const photoData = document.getElementById('facePhotoData');
    if (photoData && !photoData.value) { 
      mostrarToast('Tire a foto do rosto antes de continuar', 'error'); 
      valido = false; 
    }
  }
  
  return valido;
}

/**
 * Volta para a etapa anterior do formulario ativo.
 * Mantem os indicadores sincronizados com a etapa exibida.
 */
function prevStep(current, prev) {
  const currentStep = document.getElementById(current);
  const prevStepElement = document.getElementById(prev);

  if (currentStep && prevStepElement) {
    currentStep.classList.remove('active');
    prevStepElement.classList.add('active');
    updateStepDots(prevStepElement);
    stopFaceCameraWhenLeaving(current, prev);
  }
}

// Marca o ponto visual correspondente a etapa atualmente aberta.
function updateStepDots(activeStep) {
  const formBox = activeStep.closest('.form-box');

  if (!formBox) {
    return;
  }

  const steps = Array.from(formBox.querySelectorAll('.step'));
  const dots = formBox.querySelectorAll('.dot');
  const activeIndex = steps.indexOf(activeStep);

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === activeIndex);
  });
}

// Guarda o stream da camera para permitir parar a captura com seguranca.
let faceCameraStream = null;

// Inicia a camera frontal para capturar a foto do rosto do vendedor.
async function startFaceCamera() {
  const video = document.getElementById('faceCamera');
  const message = document.getElementById('cameraMessage');

  if (!video) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (message) {
      message.textContent =
        'O seu navegador nao suporta acesso direto a camera.';
    }

    return;
  }

  try {
    faceCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user'
      },
      audio: false
    });

    video.srcObject = faceCameraStream;
    video.classList.add('active');

    if (message) {
      message.textContent =
        'Posicione o rosto no centro e clique em capturar foto.';
    }
  } catch (error) {
    if (message) {
      message.textContent =
        'Nao foi possivel acessar a camera. Verifique a permissao do navegador.';
    }
  }
}

// Captura o frame atual do video, salva em base64 e atualiza a imagem de preview.
function captureFacePhoto() {
  const video = document.getElementById('faceCamera');
  const canvas = document.getElementById('faceCanvas');
  const preview = document.getElementById('facePreview');
  const photoData = document.getElementById('facePhotoData');
  const message = document.getElementById('cameraMessage');

  if (!video || !canvas || !preview || !photoData || !faceCameraStream) {
    if (message) {
      message.textContent =
        'Inicie a camera antes de capturar a foto.';
    }

    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL('image/png');

  preview.src = imageData;
  photoData.value = imageData;

  stopFaceCamera();

  if (message) {
    message.textContent =
      'Foto capturada. Se quiser trocar, clique em refazer foto.';
  }
}

// Limpa a foto capturada e reabre a camera para uma nova tentativa.
function retakeFacePhoto() {
  const photoData = document.getElementById('facePhotoData');

  if (photoData) {
    photoData.value = '';
  }

  startFaceCamera();
}

// Encerra todas as faixas do stream para liberar a camera do dispositivo.
function stopFaceCamera() {
  const video = document.getElementById('faceCamera');

  if (faceCameraStream) {
    faceCameraStream.getTracks().forEach(track => {
      track.stop();
    });

    faceCameraStream = null;
  }

  if (video) {
    video.srcObject = null;
    video.classList.remove('active');
  }
}

// Evita que a camera continue ligada quando o usuario sai da etapa de captura.
function stopFaceCameraWhenLeaving(current, next) {
  if (current === 'vstep3' && next !== 'vstep3') {
    stopFaceCamera();
  }
}

// Previews de imagem usados nos cadastros de comprador, vendedor e empresa.
loadPreview('profileInput', 'previewImage');
loadPreview('biInput', 'biPreview');
loadPreview('sellerProfileInput', 'sellerProfilePreview');
loadPreview('companyLogoInput', 'companyLogoPreview');

// Le o arquivo escolhido pelo usuario e mostra a imagem no elemento de preview.
function loadPreview(inputId, imageId) {
  const input = document.getElementById(inputId);
  const image = document.getElementById(imageId);

  if (input && image) {
    input.addEventListener('change', function () {
      const file = this.files[0];

      if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
          image.src = e.target.result;
        };

        reader.readAsDataURL(file);
      }
    });
  }
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateCompanyDescription() {
  const description = document.getElementById('companyDescription');
  const error = document.getElementById('descriptionError');

  if (!description || !error) {
    return true;
  }

  const words = countWords(description.value);

  if (words < 200) {
    error.textContent = `A descricao precisa ter pelo menos 200 palavras. Atualmente: ${words}.`;
    description.focus();
    return false;
  }

  error.textContent = '';
  return true;
}

function validateCompanyPasswords() {
  const password = document.getElementById('companyPassword');
  const confirmPassword = document.getElementById('companyConfirmPassword');

  if (!password || !confirmPassword) {
    return true;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setCustomValidity('As senhas nao conferem.');
    confirmPassword.reportValidity();
    return false;
  }

  confirmPassword.setCustomValidity('');
  return true;
}

const companySubmitBtn = document.getElementById('companySubmitBtn');

// Define a imagem inicial do painel lateral quando a pagina possui esse elemento.
const leftImage = document.getElementById('leftImage');

if (leftImage) {
  leftImage.style.backgroundImage = `url(${images.comprador})`;
}

// Funções de validação para cadastros

// Helper para validar se um valor está vazio (inclui espaços em branco)
function estaVazio(valor) {
  return !valor || typeof valor !== 'string' || valor.trim() === '';
}

// Helper para validar comprimento mínimo
function temComprimentoMinimo(valor, minimo) {
  return typeof valor === 'string' && valor.trim().length >= minimo;
}

// Helper para trim e validar
function trimAndValidate(valor, minLength = 1) {
  const trimmed = typeof valor === 'string' ? valor.trim() : '';
  return trimmed.length >= minLength ? trimmed : '';
}

function textoInputPorTipo(tipo, indice = 0) {
  return trimAndValidate(document.querySelectorAll(`input[type="${tipo}"]`)[indice]?.value);
}

function valorSelect(indice = 0) {
  return document.querySelectorAll('select')[indice]?.value?.trim() || '';
}

function normalizarGenero(valor) {
  const genero = valor?.toLowerCase();

  if (genero === 'masculino' || genero === 'feminino' || genero === 'outro') {
    return genero;
  }

  return null;
}

function tipoLojaPorCategoria(categoria) {
  const valor = categoria?.toLowerCase() || '';

  if (valor.includes('serv')) {
    return 'servicos';
  }

  if (valor.includes('outros')) {
    return 'ambos';
  }

  return 'produtos';
}

function mostrarErrosCadastro(erros) {
  erros.forEach(erro => mostrarToast(erro, 'error'));
}

function validarSenhasBasicas(senha, confirmarSenha, erros) {
  if (!senha) {
    erros.push('Senha e obrigatoria');
  } else if (senha.length < 8) {
    erros.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!confirmarSenha) {
    erros.push('Confirmacao de senha e obrigatoria');
  } else if (senha !== confirmarSenha) {
    erros.push('As senhas nao coincidem');
  }
}

function getBase64FromImage(imageId) {
  const img = document.getElementById(imageId);
  if (img && img.src && img.src.startsWith('data:image/')) {
    return img.src;
  }
  return null;
}

function coletarDadosComprador() {
  return {
    nome_completo: valorPorId('compNomeCompleto'),
    nome_utilizador: valorPorId('compNomeUtilizador'),
    email: valorPorId('compEmail'),
    numero_telefone: valorPorId('compTelefone'),
    genero: normalizarGenero(valorPorId('compGenero')),
    data_nascimento: valorPorId('compDataNascimento') || null,
    provincia: valorPorId('compProvincia') || null,
    municipio: valorPorId('compMunicipio') || null,
    bairro: valorPorId('compBairro') || null,
    endereco_completo: valorPorId('compRua') || null,
    senha: valorPorId('compSenha'),
    confirmar_senha: valorPorId('compConfirmarSenha'),
    foto_perfil: getBase64FromImage('previewImage')
  };
}

function coletarDadosVendedor() {
  return {
    nome_completo: valorPorId('vendNomeCompleto'),
    nome_utilizador: valorPorId('vendNomeUtilizador'),
    email: valorPorId('vendEmail'),
    numero_telefone: valorPorId('vendTelefone'),
    genero: normalizarGenero(valorPorId('vendGenero')),
    data_nascimento: valorPorId('vendDataNascimento') || null,
    provincia: valorPorId('vendProvincia') || null,
    municipio: valorPorId('vendMunicipio') || null,
    bairro: valorPorId('vendBairro') || null,
    endereco_completo: valorPorId('vendRua') || null,
    numero_bi: valorPorId('vendBi'),
    nif: valorPorId('vendNif') || null,
    data_emissao: valorPorId('vendDataEmissao'),
    data_validade: valorPorId('vendDataValidade'),
    nome_loja: valorPorId('vendNomeUtilizador'), // Fallback to username for now
    senha: valorPorId('vendSenha'),
    confirmar_senha: valorPorId('vendConfirmarSenha'),
    tipo_loja: 'produtos',
    foto_perfil: getBase64FromImage('sellerProfilePreview')
  };
}

function valorPorId(id) {
  return trimAndValidate(document.getElementById(id)?.value);
}

function coletarDadosEmpresa() {
  const categoria = valorPorId('companyCategory');

  return {
    nome_empresa: valorPorId('companyName'),
    nif: valorPorId('companyNif'),
    tipo_empresa: valorPorId('companyType'),
    categoria_principal: categoria,
    data_criacao: valorPorId('companyCreationDate') || null,
    provincia: valorPorId('companyProvince'),
    municipio: valorPorId('companyMunicipality'),
    website: valorPorId('companyWebsite') || null,
    telefone: valorPorId('companyPhone'),
    email: valorPorId('companyEmail'),
    whatsapp: valorPorId('companyWhatsapp') || null,
    representante_nome: valorPorId('representativeName'),
    representante_cargo: valorPorId('representativeRole'),
    representante_bi: valorPorId('representativeBi'),
    representante_nif: valorPorId('representativeNif') || null,
    representante_telefone: valorPorId('representativePhone') || null,
    representante_email: valorPorId('representativeEmail') || null,
    descricao: valorPorId('companyDescription') || null,
    iban: valorPorId('iban') || null,
    titular_conta: valorPorId('accountHolder') || null,
    numero_express: valorPorId('expressNumber') || null,
    paypay_entidade: valorPorId('paypalEntity') || null,
    paypay_referencia: valorPorId('paypalReference') || null,
    senha: valorPorId('companyPassword'),
    confirmar_senha: valorPorId('companyConfirmPassword'),
    tipo_loja: tipoLojaPorCategoria(categoria),
    foto_perfil: getBase64FromImage('companyLogoPreview')
  };
}

function validarFormularioCadastro(dados) {
  const erros = [];

  const nomCompleto = dados.nome_completo;
  const nomeUtilizador = dados.nome_utilizador;
  const email = dados.email;
  const numeroTelefone = dados.numero_telefone;

  if (estaVazio(nomCompleto)) {
    erros.push('Nome completo é obrigatório');
  }

  if (estaVazio(nomeUtilizador)) {
    erros.push('Nome de utilizador é obrigatório');
  } else if (!temComprimentoMinimo(nomeUtilizador, 3)) {
    erros.push('Nome de utilizador deve ter pelo menos 3 caracteres');
  }

  if (estaVazio(email)) {
    erros.push('Email é obrigatório');
  } else if (!validarEmail(email)) {
    erros.push('Email inválido');
  }

  if (estaVazio(numeroTelefone)) {
    erros.push('Número de telefone é obrigatório');
  } else if (!validarTelefone(numeroTelefone)) {
    erros.push('Número de telefone inválido (deve ter 9 ou 12 dígitos)');
  }

  const senha = dados.senha;
  const confirmarSenha = dados.confirmar_senha;

  if (estaVazio(senha)) {
    erros.push('Senha é obrigatória');
  } else if (!temComprimentoMinimo(senha, 8)) {
    erros.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (estaVazio(confirmarSenha)) {
    erros.push('Confirmação de senha é obrigatória');
  } else if (senha !== confirmarSenha) {
    erros.push('As senhas não coincidem');
  }

  return erros;
}

function validarFormularioVendedor() {
  const dados = coletarDadosVendedor();
  const erros = validarFormularioCadastro(dados);

  if (estaVazio(dados.numero_bi)) {
    erros.push('Numero do BI e obrigatorio');
  }

  if (!dados.data_emissao) {
    erros.push('Data de emissao do BI e obrigatoria');
  }

  if (!dados.data_validade) {
    erros.push('Data de validade do BI e obrigatoria');
  }

  return erros;
}

function validarFormularioEmpresa() {
  const erros = [];
  const dados = coletarDadosEmpresa();

  if (!validateCompanyDescription() || !validateCompanyPasswords()) {
    erros.push('Corrija os dados da empresa antes de enviar');
  }

  const obrigatorios = [
    ['Nome da empresa', dados.nome_empresa],
    ['NIF empresarial', dados.nif],
    ['Tipo de empresa', dados.tipo_empresa],
    ['Categoria principal', dados.categoria_principal],
    ['Data de criacao da empresa', dados.data_criacao],
    ['Provincia', dados.provincia],
    ['Municipio', dados.municipio],
    ['Telefone empresarial', dados.telefone],
    ['Email empresarial', dados.email],
    ['WhatsApp empresarial', dados.whatsapp],
    ['Nome do representante', dados.representante_nome],
    ['Cargo do representante', dados.representante_cargo],
    ['BI do representante', dados.representante_bi],
    ['Telefone do representante', dados.representante_telefone],
    ['Email do representante', dados.representante_email],
  ];

  obrigatorios.forEach(([campo, valor]) => {
    if (estaVazio(valor)) {
      erros.push(`${campo} e obrigatorio`);
    }
  });

  if (!estaVazio(dados.email) && !validarEmail(dados.email)) {
    erros.push('Email empresarial invalido');
  }

  if (!estaVazio(dados.representante_email) && !validarEmail(dados.representante_email)) {
    erros.push('Email do representante invalido');
  }

  if (!estaVazio(dados.telefone) && !validarTelefone(dados.telefone)) {
    erros.push('Telefone empresarial invalido');
  }

  if (!estaVazio(dados.whatsapp) && !validarTelefone(dados.whatsapp)) {
    erros.push('WhatsApp empresarial invalido');
  }

  if (!estaVazio(dados.representante_telefone) && !validarTelefone(dados.representante_telefone)) {
    erros.push('Telefone do representante invalido');
  }

  if (estaVazio(dados.senha)) {
    erros.push('Senha é obrigatória');
  } else if (!temComprimentoMinimo(dados.senha, 8)) {
    erros.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (estaVazio(dados.confirmar_senha)) {
    erros.push('Confirmação de senha é obrigatória');
  } else if (dados.senha !== dados.confirmar_senha) {
    erros.push('As senhas não coincidem');
  }

  return erros;
}

async function submeterCadastro(event, botao, config) {
  event.preventDefault();

  const erros = config.validar();
  if (erros.length > 0) {
    mostrarErrosCadastro(erros);
    return;
  }

  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Registando...';
  mostrarLoading(true);

  try {
    const resultado = await config.registar(config.coletar());

    if (resultado.success) {
      mostrarToast(config.sucesso, 'success');
      setTimeout(() => {
        window.location.href = '../../../login/';
      }, 2000);
      return;
    }

    mostrarToast(resultado.error || 'Erro ao registar', 'error');
  } catch (erro) {
    mostrarToast('Erro ao conectar com o servidor', 'error');
    console.error('Erro:', erro);
  } finally {
    mostrarLoading(false);
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const pathname = window.location.pathname;

  if (pathname.includes('cadastro_vendedor')) {
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn?.addEventListener('click', event => submeterCadastro(event, submitBtn, {
      validar: validarFormularioVendedor,
      coletar: coletarDadosVendedor,
      registar: registarVendedor,
      sucesso: 'Cadastro de vendedor realizado com sucesso!'
    }));
  }

  if (pathname.includes('cadastro_empresa')) {
    companySubmitBtn?.addEventListener('click', event => submeterCadastro(event, companySubmitBtn, {
      validar: validarFormularioEmpresa,
      coletar: coletarDadosEmpresa,
      registar: registarEmpresa,
      sucesso: 'Cadastro de empresa realizado com sucesso!'
    }));
  }
});

// Conectar formulário de cadastro comprador com a API
document.addEventListener('DOMContentLoaded', function() {
  const submitBtn = document.querySelector('.submit-btn');

  if (submitBtn && window.location.pathname.includes('cadastro_comprador')) {
    submitBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      // Coletar dados do formulário
      const dados = coletarDadosComprador();
      
      // Validar formulário
      const erros = validarFormularioCadastro(dados);
      if (erros.length > 0) {
        erros.forEach(erro => mostrarToast(erro, 'error'));
        return;
      }

      submitBtn.disabled = true;
      const textoOriginal = submitBtn.textContent;
      submitBtn.textContent = 'Registando...';
      mostrarLoading(true);

      try {
        const resultado = await registarComprador(dados);

        if (resultado.success) {
          mostrarToast('Cadastro realizado com sucesso!', 'success');
          mostrarLoading(false);
          // Redirecionar para login após 2 segundos
          setTimeout(() => {
            window.location.href = '../../../login/';
          }, 2000);
        } else {
          mostrarLoading(false);
          const mensagem = resultado.error || 'Erro ao registar';
          mostrarToast(mensagem, 'error');

          // Tratar erros específicos da API
          if (resultado.status === 400) {
            if (mensagem.includes('email')) {
              mostrarToast('Este email já está registado', 'error');
            } else if (mensagem.includes('utilizador') || mensagem.includes('username')) {
              mostrarToast('Este nome de utilizador já existe', 'error');
            } else if (mensagem.includes('telefone')) {
              mostrarToast('Este número de telefone já está registado', 'error');
            }
          }
        }
      } catch (erro) {
        mostrarLoading(false);
        mostrarToast('Erro ao conectar com o servidor', 'error');
        console.error('Erro:', erro);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = textoOriginal;
      }
    });
  }
});

// =========================================================
// CARREGAMENTO DINÂMICO DE PROVÍNCIAS E MUNICÍPIOS
// =========================================================

async function carregarProvincias() {
  try {
    const response = await fetch('http://localhost:8000/api/v1/localidades/provincias');
    const provincias = await response.json();
    return provincias;
  } catch (error) {
    console.error('Erro ao carregar províncias:', error);
    return [];
  }
}

async function carregarMunicipios(provinciaId) {
  try {
    const response = await fetch(`http://localhost:8000/api/v1/localidades/provincias/${provinciaId}/municipios`);
    const municipios = await response.json();
    return municipios;
  } catch (error) {
    console.error('Erro ao carregar municípios:', error);
    return [];
  }
}

function popularSelectProvincias(selectId, municipioSelectId) {
  const select = document.getElementById(selectId);
  const municipioSelect = document.getElementById(municipioSelectId);
  if (!select) return;

  carregarProvincias().then(provincias => {
    select.innerHTML = '<option value="">Selecione uma província</option>';
    provincias.forEach(p => {
      const option = document.createElement('option');
      option.value = p.nome; // Mantemos como string pois a BD espera o nome da província
      option.dataset.id = p.id;
      option.textContent = p.nome;
      select.appendChild(option);
    });
  });

  if (municipioSelect) {
    select.addEventListener('change', function(e) {
      const selectedOption = this.options[this.selectedIndex];
      const provinciaId = selectedOption.dataset.id;
      
      municipioSelect.innerHTML = '<option value="">A carregar...</option>';
      municipioSelect.disabled = true;

      if (!provinciaId) {
        municipioSelect.innerHTML = '<option value="">Selecione uma província primeiro</option>';
        return;
      }

      carregarMunicipios(provinciaId).then(municipios => {
        municipioSelect.innerHTML = '<option value="">Selecione um município</option>';
        municipioSelect.disabled = false;
        municipios.forEach(m => {
          const option = document.createElement('option');
          option.value = m.nome; // Mantemos como string pois a BD espera o nome
          option.textContent = m.nome;
          municipioSelect.appendChild(option);
        });
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const pathname = window.location.pathname;
  if (pathname.includes('cadastro_vendedor')) {
    popularSelectProvincias('vendProvincia', 'vendMunicipio');
  } else if (pathname.includes('cadastro_comprador')) {
    popularSelectProvincias('compProvincia', 'compMunicipio');
  } else if (pathname.includes('cadastro_empresa')) {
    popularSelectProvincias('companyProvince', 'companyMunicipality');
  }
});
