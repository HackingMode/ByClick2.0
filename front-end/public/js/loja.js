document.addEventListener('DOMContentLoaded', async () => {
  if (estaAutenticado()) {
    document.getElementById('btnLogin').style.display = 'none';
    document.getElementById('btnCadastro').style.display = 'none';
    const conta = document.getElementById('btnPainel');
    conta.style.display = 'inline-flex';
    let user = {}; try { user = JSON.parse(localStorage.getItem('usuario') || '{}'); } catch (_) {}
    conta.href = user.tipo_utilizador === 'vendedor' ? '../paineis/painel_vendedor/painel_vendedor.html' : '../paineis/painel_comprador/painel_comprador.html';
  }
  const search = document.getElementById('landingSearch');
  search?.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = '../explorar/?q=' + encodeURIComponent(search.value.trim()); });
  const grid = document.getElementById('lojaProdutosGrid');
  const id = new URLSearchParams(location.search).get('id');
  if (!/^\d+$/.test(id || '')) { grid.textContent = 'Loja não encontrada.'; return; }
  try {
    const loja = await apiCall('GET', `/vendedor/lojas/${id}`);
    document.getElementById('lojaNome').textContent = loja.nome;
    document.getElementById('lojaLocalizacao').textContent = loja.localizacao || 'Angola';
    grid.replaceChildren();
    if (!loja.ofertas.length) { grid.textContent = 'Esta loja ainda não tem ofertas publicadas.'; return; }
    for (const oferta of loja.ofertas) {
      const card = document.createElement('a');
      card.className = 'prod-card';
      card.href = `../${oferta.tipo === 'servico' ? 'servico' : 'produto'}/?id=${Number(oferta.id)}`;
      const imageBox = document.createElement('div'); imageBox.className = 'prod-card__img';
      if (oferta.imagem_url) { const img = document.createElement('img'); img.src = oferta.imagem_url; img.alt = oferta.nome; img.loading = 'lazy'; imageBox.append(img); }
      const info = document.createElement('div'); info.className = 'prod-card__body';
      const title = document.createElement('h3'); title.textContent = oferta.nome;
      const price = document.createElement('span'); price.className = 'prod-card__price'; price.textContent = `${oferta.tipo === 'servico' ? 'A partir de ' : ''}${Number(oferta.preco).toLocaleString('pt-AO')} Kz`;
      info.append(title, price); card.append(imageBox, info); grid.append(card);
    }
  } catch (erro) { grid.textContent = erro.status === 404 ? 'Loja não encontrada.' : 'Não foi possível carregar a loja.'; }
});
