document.addEventListener('DOMContentLoaded', () => {
  carregarImoveis();

  document.getElementById('btnSearch').addEventListener('click', () => {
    carregarImoveis();
  });
});

async function carregarImoveis() {
  const container = document.getElementById('imoveisContainer');
  const emptyState = document.getElementById('emptyState');
  
  container.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
  emptyState.style.display = 'none';

  const filtros = {
    tipo_negocio: document.getElementById('filtroFinalidade').value,
    tipo_imovel: document.getElementById('filtroTipo').value
  };

  const imoveis = await listarImoveis(filtros);

  container.innerHTML = '';

  if (!imoveis || imoveis.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  // Ordenação (simulada no frontend para simplificar, mas idealmente seria no backend)
  const ordenar = document.getElementById('ordenar').value;
  if (ordenar === 'preco-asc') {
    imoveis.sort((a, b) => a.preco - b.preco);
  } else if (ordenar === 'preco-desc') {
    imoveis.sort((a, b) => b.preco - a.preco);
  }

  imoveis.forEach(imovel => {
    const defaultImage = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=800&auto=format&fit=crop';
    const imagem = imovel.imagens && imovel.imagens.length > 0 ? (imovel.imagens.find(i => i.principal)?.url || imovel.imagens[0].url) : defaultImage;
    
    // Fallback caso seja URL local sem o prefixo base
    const imageUrl = imagem.startsWith('http') ? imagem : `${API_BASE_URL}/${imagem}`;

    const card = document.createElement('a');
    card.href = `../imovel/index.html?id=${imovel.id}`;
    card.className = 'imovel-card';
    card.style.textDecoration = 'none';

    card.innerHTML = `
      <div class="imovel-image">
        <img src="${imageUrl}" alt="${imovel.titulo}">
        <span class="imovel-badge ${imovel.finalidade}">${imovel.finalidade}</span>
      </div>
      <div class="imovel-content">
        <div class="imovel-price">${formatarPreco(imovel.preco)} ${imovel.finalidade === 'aluguer' ? '/ mês' : ''}</div>
        <h3 class="imovel-title">${imovel.titulo}</h3>
        <div class="imovel-location">
          <i class="fa-solid fa-location-dot"></i> 
          ${imovel.municipio || 'Angola'}, ${imovel.provincia || ''}
        </div>
        <div class="imovel-features">
          <div class="feature">
            <i class="fa-solid fa-bed"></i> ${imovel.quartos || '-'} Quartos
          </div>
          <div class="feature">
            <i class="fa-solid fa-bath"></i> ${imovel.casas_de_banho || '-'} WC
          </div>
          <div class="feature">
            <i class="fa-solid fa-vector-square"></i> ${imovel.area_m2 ? imovel.area_m2 + ' m²' : '-'}
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}
