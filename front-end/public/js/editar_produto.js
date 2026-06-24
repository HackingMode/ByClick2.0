/**
 * Script para página de edição de produto
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (!estaAutenticado()) {
        window.location.href = '../../login/';
        return;
    }

    // Setup Sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const toggle = document.getElementById('menuToggle');
    const open = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    const close = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    toggle?.addEventListener('click', () => sidebar.classList.contains('active') ? close() : open());
    overlay?.addEventListener('click', close);

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Carregar user_info
    try {
        const user = await apiCall('GET', '/auth/me');
        if (user) {
            const nomeEl = document.querySelector('[data-user-name]');
            const fotoEl = document.querySelector('[data-user-photo]');
            if(nomeEl) nomeEl.textContent = user.nome_completo;
            if(fotoEl) fotoEl.src = user.foto_perfil_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome_completo)}&background=C84B1F&color=fff`;
        }
    } catch(e) {}

    // Obter ID do produto da URL
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('id');

    if (!produtoId) {
        showToast('ID do produto não fornecido.', 'error');
        setTimeout(() => window.location.href = 'meus_produtos.html', 2000);
        return;
    }

    document.getElementById('produtoId').value = produtoId;

    // Carregar categorias e dados do produto
    await carregarCategorias();
    await carregarDadosProduto(produtoId);

    // Adicionar listener no form
    document.getElementById('formEditarProduto').addEventListener('submit', salvarProduto);
});

async function carregarCategorias() {
    try {
        const select = document.getElementById('categoriaProduto');
        const categorias = await apiCall('GET', '/categorias/?tipo=produto');
        if (categorias && categorias.length > 0) {
            select.innerHTML = '<option value="">Selecione uma categoria</option>' + 
                categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        } else {
            select.innerHTML = '<option value="1">Categoria Geral</option>'; // Fallback
        }
    } catch (e) {
        console.error('Erro ao carregar categorias', e);
        const select = document.getElementById('categoriaProduto');
        select.innerHTML = '<option value="1">Categoria Geral</option>'; // Fallback
    }
}

async function carregarDadosProduto(id) {
    try {
        const produto = await apiCall('GET', `/produtos/${id}`);
        
        if (produto) {
            document.getElementById('nomeProduto').value = produto.nome || '';
            document.getElementById('descricaoProduto').value = produto.descricao || '';
            document.getElementById('precoProduto').value = produto.preco || '';
            document.getElementById('precoPromocionalProduto').value = produto.preco_promocional || '';
            document.getElementById('estoqueProduto').value = produto.stock || 0;
            
            if (produto.categoria_id) {
                document.getElementById('categoriaProduto').value = produto.categoria_id;
            }

            const imgPreview = document.getElementById('imgPreview');
            if (produto.imagens && produto.imagens.length > 0) {
                imgPreview.src = produto.imagens[0].url;
            } else {
                imgPreview.src = 'https://via.placeholder.com/250?text=Sem+Imagem';
            }
        }
    } catch (error) {
        showToast('Erro ao carregar dados do produto.', 'error');
        console.error(error);
    }
}

function previewImagem(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imgPreview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function salvarProduto(e) {
    e.preventDefault();

    const id = document.getElementById('produtoId').value;
    const btn = document.getElementById('btnSalvar');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A salvar...';

    const payload = {
        nome: document.getElementById('nomeProduto').value,
        descricao: document.getElementById('descricaoProduto').value,
        preco: parseFloat(document.getElementById('precoProduto').value),
        stock: parseInt(document.getElementById('estoqueProduto').value),
        categoria_id: parseInt(document.getElementById('categoriaProduto').value),
    };

    const precoPromo = document.getElementById('precoPromocionalProduto').value;
    if (precoPromo) {
        payload.preco_promocional = parseFloat(precoPromo);
    }

    // Imagem Base64
    const fileInput = document.getElementById('imgUpload');
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        try {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            payload.imagem = base64;
        } catch (err) {
            showToast('Erro ao processar imagem.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Alterações';
            return;
        }
    }

    try {
        await apiCall('PUT', `/produtos/${id}`, payload);
        showToast('Produto atualizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'meus_produtos.html';
        }, 1500);
    } catch (error) {
        showToast(error.message || 'Erro ao atualizar produto', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Alterações';
    }
}
