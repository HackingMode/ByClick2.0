const images = {

  comprador:
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',

  vendedor:
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',

  empresa:
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop'

};

function showForm(id, button, type){

  const forms =
  document.querySelectorAll('.form-box');

  forms.forEach(form => {
    form.classList.remove('active');
  });

  const selectedForm =
  document.getElementById(id);

  if(selectedForm){
    selectedForm.classList.add('active');
  }

  const buttons =
  document.querySelectorAll('.tab-btn');

  buttons.forEach(btn => {
    btn.classList.remove('active');
  });

  button.classList.add('active');

  const leftImage =
  document.getElementById('leftImage');

  if(leftImage){
    leftImage.style.backgroundImage = `url(${images[type]})`;
  }

}

function nextStep(current, next){

  const currentStep =
  document.getElementById(current);

  const nextStep =
  document.getElementById(next);

  if(currentStep && nextStep){
    currentStep.classList.remove('active');
    nextStep.classList.add('active');
    updateStepDots(nextStep);
    stopFaceCameraWhenLeaving(current, next);
  }

}

function prevStep(current, prev){

  const currentStep =
  document.getElementById(current);

  const prevStep =
  document.getElementById(prev);

  if(currentStep && prevStep){
    currentStep.classList.remove('active');
    prevStep.classList.add('active');
    updateStepDots(prevStep);
    stopFaceCameraWhenLeaving(current, prev);
  }

}

function updateStepDots(activeStep){

  const formBox =
  activeStep.closest('.form-box');

  if(!formBox){
    return;
  }

  const steps =
  Array.from(formBox.querySelectorAll('.step'));

  const dots =
  formBox.querySelectorAll('.dot');

  const activeIndex =
  steps.indexOf(activeStep);

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === activeIndex);
  });

}

let faceCameraStream = null;

async function startFaceCamera(){

  const video =
  document.getElementById('faceCamera');

  const message =
  document.getElementById('cameraMessage');

  if(!video){
    return;
  }

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    if(message){
      message.textContent =
      'O seu navegador nao suporta acesso direto a camera.';
    }

    return;
  }

  try{
    faceCameraStream =
    await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:'user'
      },
      audio:false
    });

    video.srcObject = faceCameraStream;
    video.classList.add('active');

    if(message){
      message.textContent =
      'Posicione o rosto no centro e clique em capturar foto.';
    }
  }
  catch(error){
    if(message){
      message.textContent =
      'Nao foi possivel acessar a camera. Verifique a permissao do navegador.';
    }
  }

}

function captureFacePhoto(){

  const video =
  document.getElementById('faceCamera');

  const canvas =
  document.getElementById('faceCanvas');

  const preview =
  document.getElementById('facePreview');

  const photoData =
  document.getElementById('facePhotoData');

  const message =
  document.getElementById('cameraMessage');

  if(!video || !canvas || !preview || !photoData || !faceCameraStream){
    if(message){
      message.textContent =
      'Inicie a camera antes de capturar a foto.';
    }

    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context =
  canvas.getContext('2d');

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData =
  canvas.toDataURL('image/png');

  preview.src = imageData;
  photoData.value = imageData;

  stopFaceCamera();

  if(message){
    message.textContent =
    'Foto capturada. Se quiser trocar, clique em refazer foto.';
  }

}

function retakeFacePhoto(){

  const photoData =
  document.getElementById('facePhotoData');

  if(photoData){
    photoData.value = '';
  }

  startFaceCamera();

}

function stopFaceCamera(){

  const video =
  document.getElementById('faceCamera');

  if(faceCameraStream){
    faceCameraStream.getTracks().forEach(track => {
      track.stop();
    });

    faceCameraStream = null;
  }

  if(video){
    video.srcObject = null;
    video.classList.remove('active');
  }

}

function stopFaceCameraWhenLeaving(current, next){

  if(current === 'vstep3' && next !== 'vstep3'){
    stopFaceCamera();
  }

}

// FOTO PERFIL COMPRADOR
loadPreview('profileInput', 'previewImage');

// FOTO BI
loadPreview('biInput', 'biPreview');

// FOTO PERFIL VENDEDOR
loadPreview(
  'sellerProfileInput',
  'sellerProfilePreview'
);

// LOGOTIPO EMPRESA
loadPreview(
  'companyLogoInput',
  'companyLogoPreview'
);

function loadPreview(inputId, imageId){

  const input =
  document.getElementById(inputId);

  const image =
  document.getElementById(imageId);

  if(input && image){

    input.addEventListener('change', function(){

      const file = this.files[0];

      if(file){

        const reader = new FileReader();

        reader.onload = function(e){

          image.src = e.target.result;

        }

        reader.readAsDataURL(file);

      }

    });

  }

}

const leftImage =
document.getElementById('leftImage');

if(leftImage){
  leftImage.style.backgroundImage =
  `url(${images.comprador})`;
}
