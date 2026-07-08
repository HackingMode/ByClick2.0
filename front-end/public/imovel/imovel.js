document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const imovelId = urlParams.get('id');

  if (!imovelId) {
    window.location.href = '../imoveis/';
    return;
  }

  const imovel = await obterImovel(imovelId);
  
  if (imovel.erro) {
    if (typeof showToast === 'function') showToast('Imóvel não encontrado', 'error');
    setTimeout(() => window.location.href = '../imoveis/', 2000);
    return;
  }

  renderizarImovel(imovel);

  document.getElementById('formProposta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('byclick_token');
    
    if (!token) {
      if (typeof showToast === 'function') showToast('Faça login como Comprador para enviar uma proposta', 'error');
      setTimeout(() => window.location.href = '../login/?next=' + encodeURIComponent(window.location.href), 2000);
      return;
    }

    const mensagem = document.getElementById('propMensagem').value;
    const valor_proposto = document.getElementById('propValor').value || null;
    const btn = document.getElementById('btnEnviarProposta');
    const feedback = document.getElementById('propostaFeedback');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A enviar...';

    const resp = await enviarPropostaImovel(imovelId, {
      mensagem,
      valor_proposto: valor_proposto ? parseFloat(valor_proposto) : null
    });

    if (resp.erro) {
      feedback.innerHTML = `<p style="color: red; margin-top: 10px;">${resp.mensagem || 'Erro ao enviar proposta'}</p>`;
      btn.disabled = false;
      btn.innerHTML = 'Enviar Proposta <i class="fa-regular fa-paper-plane"></i>';
    } else {
      feedback.innerHTML = `<p style="color: green; margin-top: 10px;">Proposta enviada com sucesso!</p>`;
      document.getElementById('formProposta').reset();
      btn.innerHTML = 'Enviado <i class="fa-solid fa-check"></i>';
    }
  });
});

function renderizarImovel(imovel) {
  document.getElementById('imovelLoading').style.display = 'none';
  document.getElementById('imovelContent').style.display = 'grid';

  // Textos
  document.getElementById('imovelTitulo').textContent = imovel.titulo;
  document.getElementById('imovelLocalizacao').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${imovel.endereco_completo || imovel.bairro || ''}, ${imovel.municipio || ''}, ${imovel.provincia || ''}`;
  document.getElementById('imovelDescricao').textContent = imovel.descricao || 'Nenhuma descrição fornecida.';
  
  document.getElementById('imovelQuartos').textContent = imovel.quartos || '-';
  document.getElementById('imovelWC').textContent = imovel.casas_de_banho || '-';
  document.getElementById('imovelArea').textContent = imovel.area_m2 ? imovel.area_m2 + ' m²' : '-';
  document.getElementById('imovelTipo').textContent = imovel.tipo_imovel.charAt(0).toUpperCase() + imovel.tipo_imovel.slice(1);
  
  const badge = document.getElementById('badgeFinalidade');
  badge.textContent = imovel.finalidade;
  if (imovel.finalidade === 'aluguer') badge.classList.add('aluguer');

  // Preço e Vendedor
  document.getElementById('imovelPreco').textContent = formatarPreco(imovel.preco);
  document.getElementById('imovelMoeda').textContent = imovel.moeda || 'AOA';
  
  document.getElementById('vendedorNome').textContent = imovel.vendedor_nome || 'Vendedor Anônimo';
  document.getElementById('vendedorTelefone').textContent = imovel.vendedor_telefone || 'Sem contacto';

  // Imagens
  const mainImage = document.getElementById('mainImage');
  const thumbContainer = document.getElementById('thumbnailContainer');
  const defaultImage = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop';
  
  let imagens = imovel.imagens || [];
  if (imagens.length === 0) {
    imagens = [{ url: defaultImage }];
  }

  mainImage.src = imagens[0].url.startsWith('http') ? imagens[0].url : `${API_BASE_URL}/${imagens[0].url}`;

  imagens.forEach((img, idx) => {
    const src = img.url.startsWith('http') ? img.url : `${API_BASE_URL}/${img.url}`;
    const thumb = document.createElement('img');
    thumb.src = src;
    thumb.className = idx === 0 ? 'thumbnail active' : 'thumbnail';
    thumb.addEventListener('click', () => {
      mainImage.src = src;
      document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    thumbContainer.appendChild(thumb);
  });

  // Mapa
  if (imovel.latitude && imovel.longitude) {
    const map = L.map('mapaImovel').setView([imovel.latitude, imovel.longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    L.marker([imovel.latitude, imovel.longitude]).addTo(map)
      .bindPopup(imovel.titulo).openPopup();
  } else {
    document.getElementById('mapaImovel').innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#666;">Localização não definida no mapa.</div>';
  }
}
