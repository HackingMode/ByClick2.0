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
  const currentStep = document.getElementById(current);
  const nextStepElement = document.getElementById(next);

  if (currentStep && nextStepElement) {
    currentStep.classList.remove('active');
    nextStepElement.classList.add('active');
    updateStepDots(nextStepElement);
    stopFaceCameraWhenLeaving(current, next);
  }
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

// Define a imagem inicial do painel lateral quando a pagina possui esse elemento.
const leftImage = document.getElementById('leftImage');

if (leftImage) {
  leftImage.style.backgroundImage = `url(${images.comprador})`;
}
