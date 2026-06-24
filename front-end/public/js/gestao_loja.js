/**
 * Script de Gestão da Loja (Produtos, Serviços, Pedidos)
 * Lida com o carregamento e as ações destas entidades no Painel de Vendedor.
 */

// ==============================
// PRODUTOS
// ==============================

async function carregarMeusProdutos() {
    const container = document.getElementById('gridProdutos');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar produtos...</div>';
    
    try {
        const produtos = await apiCall('GET', '/vendedor/meus-produtos');
        renderProdutos(produtos);
    } catch (error) {
        container.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar produtos.</div>';
    }
}

function renderProdutos(produtos) {
    const container = document.getElementById('gridProdutos');
    if (!container) return;

    if (!produtos || produtos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 4rem; color: #999; grid-column: 1 / -1;">
                <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; color: #ddd;"></i>
                <h3>Sem Produtos</h3>
                <p>Ainda não adicionou nenhum produto ao seu catálogo.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = produtos.map(p => `
        <div class="product-card">
            <div style="height: 150px; background: #eee; border-radius: 8px; margin-bottom: 10px; overflow: hidden;">
                <img src="${(p.imagens && p.imagens.length > 0) ? p.imagens[0].url : (p.imagem ? p.imagem : 'https://via.placeholder.com/300x150?text=Sem+Imagem')}" style="width: 100%; height: 100%; object-fit: cover;" alt="Capa">
            </div>
            <h4>${p.nome}</h4>
            <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.descricao}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <span style="font-weight: bold; color: var(--primary);">${parseFloat(p.preco).toFixed(2)} Kz</span>
                <span style="font-size: 0.8rem; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">Stock: ${p.stock !== undefined ? p.stock : 0}</span>
            </div>
            <div style="display:flex; gap: 0.5rem;">
                <button class="btn-secondary" style="flex: 1; padding: 0.5rem;" onclick="abrirModalEditarProduto(${p.id})"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn-primary" style="background: var(--red); padding: 0.5rem;" onclick="apagarProduto(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function submeterNovoProduto() {
    const form = document.getElementById('formAddProduto');
    if (!form || !form.reportValidity()) return;

    const btn = document.querySelector('#modalProduto .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A salvar...';

    const payload = {
        nome: form.nome.value,
        descricao: form.descricao.value,
        preco: parseFloat(form.preco.value),
        stock: parseInt(form.estoque.value),
        categoria_id: parseInt(form.categoria_id.value),
        ativo: true
    };

    try {
        await apiCall('POST', '/produtos/', payload);
        showToast('Produto criado com sucesso!', 'success');
        fecharModal('modalProduto');
        form.reset();
        carregarMeusProdutos();
    } catch (error) {
        showToast(error.message || 'Erro ao criar produto', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar Produto';
    }
}

async function apagarProduto(id) {
    if(!confirm("Tem a certeza que deseja remover este produto?")) return;
    
    try {
        await apiCall('DELETE', `/produtos/${id}`);
        showToast('Produto removido.', 'success');
        carregarMeusProdutos();
    } catch(e) {
        showToast('Erro ao remover produto.', 'error');
    }
}

// Funções de Edição para simplificar o plano
function abrirModalEditarProduto(id) {
    window.location.href = `editar_produto.html?id=${id}`;
}

// ==============================
// SERVIÇOS
// ==============================

async function carregarMeusServicos() {
    const container = document.getElementById('gridServicos');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar serviços...</div>';
    
    try {
        const servicos = await apiCall('GET', '/vendedor/meus-servicos');
        renderServicos(servicos);
    } catch (error) {
        container.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar serviços.</div>';
    }
}

function renderServicos(servicos) {
    const container = document.getElementById('gridServicos');
    if (!container) return;

    if (!servicos || servicos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 4rem; color: #999; grid-column: 1 / -1;">
                <i class="fa-solid fa-briefcase" style="font-size: 3rem; margin-bottom: 1rem; color: #ddd;"></i>
                <h3>Sem Serviços</h3>
                <p>Ainda não adicionou nenhum serviço à sua loja.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = servicos.map(s => `
        <div class="product-card">
            <div style="height: 150px; background: #eee; border-radius: 8px; margin-bottom: 10px; overflow: hidden;">
                <img src="${(s.imagens && s.imagens.length > 0) ? s.imagens[0].url : (s.imagem ? s.imagem : 'https://via.placeholder.com/300x150?text=Sem+Imagem')}" style="width: 100%; height: 100%; object-fit: cover;" alt="Capa">
            </div>
            <h4>${s.nome}</h4>
            <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.descricao}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <span style="font-weight: bold; color: var(--primary);">${parseFloat(s.preco_base).toFixed(2)} Kz</span>
                <span style="font-size: 0.8rem; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">Duração: ${s.duracao_estimada || 'N/A'}</span>
            </div>
            <div style="display:flex; gap: 0.5rem;">
                <button class="btn-secondary" style="flex: 1; padding: 0.5rem;" onclick="abrirModalEditarServico(${s.id})"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn-primary" style="background: var(--red); padding: 0.5rem;" onclick="apagarServico(${s.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function submeterNovoServico() {
    const form = document.getElementById('formAddServico');
    if (!form || !form.reportValidity()) return;

    const btn = document.querySelector('#modalServico .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A salvar...';

    const payload = {
        nome: form.nome.value,
        descricao: form.descricao.value,
        preco_base: parseFloat(form.preco_base.value),
        duracao_estimada: form.duracao_estimada.value,
        disponibilidade: form.disponibilidade.value,
        categoria_id: parseInt(form.categoria_id.value),
        ativo: true
    };

    try {
        await apiCall('POST', '/servicos/', payload);
        showToast('Serviço criado com sucesso!', 'success');
        fecharModal('modalServico');
        form.reset();
        carregarMeusServicos();
    } catch (error) {
        showToast(error.message || 'Erro ao criar serviço', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar Serviço';
    }
}

async function apagarServico(id) {
    if(!confirm("Tem a certeza que deseja remover este serviço?")) return;
    
    try {
        await apiCall('DELETE', `/servicos/${id}`);
        showToast('Serviço removido.', 'success');
        carregarMeusServicos();
    } catch(e) {
        showToast('Erro ao remover serviço.', 'error');
    }
}

function abrirModalEditarServico(id) {
    showToast("A funcionalidade de edição detalhada está em desenvolvimento", "info");
}

// ==============================
// MODALS
// ==============================
function abrirModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.add('active');
}
function fecharModal(id) {
    const m = document.getElementById(id);
    if(m) m.classList.remove('active');
}

// ==============================
// PEDIDOS
// ==============================

async function carregarPedidos() {
    const tbody = document.getElementById('tbodyPedidos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar pedidos...</td></tr>';

    try {
        const pedidos = await apiCall('GET', '/vendedor/meus-pedidos/recentes?limit=100');
        renderPedidos(pedidos);
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Erro ao carregar pedidos.</td></tr>';
    }
}

function renderPedidos(pedidos) {
    const tbody = document.getElementById('tbodyPedidos');
    if (!tbody) return;

    if (!pedidos || pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #999;">Sem pedidos recentes.</td></tr>';
        return;
    }

    const mapStatus = {
        'pendente': '<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Pendente</span>',
        'processando': '<span style="background:#e0f2fe; color:#0284c7; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Em Processamento</span>',
        'enviado': '<span style="background:#dcfce7; color:#15803d; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Enviado</span>',
        'entregue': '<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Entregue</span>',
        'cancelado': '<span style="background:#fee2e2; color:#b91c1c; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Cancelado</span>'
    };

    tbody.innerHTML = pedidos.map(p => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 1rem;">#${p.numero_pedido}</td>
            <td style="padding: 1rem;">${p.cliente_nome}</td>
            <td style="padding: 1rem;">
                ${p.tipo === 'produto' && p.itens ? p.itens.map(i => `<div style="font-size: 0.9rem; margin-bottom: 4px;"><strong>${i.nome_produto}</strong><br><span style="color: var(--text-light); font-size: 0.8rem;">Qtd: ${i.quantidade_comprada} | Stock: ${i.stock_atual}</span></div>`).join('') : 'Serviço'}
            </td>
            <td style="padding: 1rem;">${new Date(p.criado_em).toLocaleDateString('pt-AO')}</td>
            <td style="padding: 1rem;">${mapStatus[p.status.toLowerCase()] || p.status}</td>
            <td style="padding: 1rem;">
                <button class="btn-secondary" style="padding: 0.4rem;" onclick="abrirModalStatusPedido(${p.id}, '${p.tipo}', '${p.status}')">Gerir</button>
            </td>
        </tr>
    `).join('');
}

let pedidoSelecionadoParaStatus = null;
let tipoPedidoSelecionado = null;

function abrirModalStatusPedido(id, tipo, statusAtual) {
    pedidoSelecionadoParaStatus = id;
    tipoPedidoSelecionado = tipo;
    
    const select = document.getElementById('selectNovoStatus');
    if(select) select.value = statusAtual.toLowerCase();
    
    abrirModal('modalStatusPedido');
}

async function atualizarStatusPedido() {
    if(!pedidoSelecionadoParaStatus) return;

    const select = document.getElementById('selectNovoStatus');
    const status = select.value;
    const btn = document.querySelector('#modalStatusPedido .btn-primary');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A atualizar...';

    const endpoint = tipoPedidoSelecionado === 'produto' 
        ? `/pedidos/produtos/${pedidoSelecionadoParaStatus}/status`
        : `/pedidos/servicos/${pedidoSelecionadoParaStatus}/status`;

    try {
        await apiCall('PUT', endpoint, { status: status });
        showToast('Status atualizado com sucesso!', 'success');
        fecharModal('modalStatusPedido');
        carregarPedidos();
    } catch(e) {
        showToast(e.message || 'Erro ao atualizar status', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar Alteração';
    }
}

// ==============================
// AVALIAÇÕES
// ==============================

async function carregarAvaliacoes() {
    const list = document.getElementById('listaAvaliacoes');
    if (!list) return;

    list.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar avaliações...</div>';

    try {
        // Precisamos do vendedor_id, podemos buscá-lo do perfil
        const me = await apiCall('GET', '/auth/me');
        if(!me || !me.perfil_vendedor) {
            list.innerHTML = '<div style="text-align:center; color:red;">Sem loja associada.</div>';
            return;
        }

        const avaliacoes = await apiCall('GET', `/avaliacoes/?vendedor_id=${me.perfil_vendedor.id}&limit=50`);
        renderAvaliacoes(avaliacoes);
    } catch(e) {
        list.innerHTML = '<div style="text-align:center; color:red;">Erro ao carregar avaliações.</div>';
    }
}

function renderAvaliacoes(avaliacoes) {
    const list = document.getElementById('listaAvaliacoes');
    if (!list) return;

    if (!avaliacoes || avaliacoes.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 4rem; color: #999;">
                <i class="fa-regular fa-star" style="font-size: 3rem; margin-bottom: 1rem; color: #ddd;"></i>
                <h3>Sem Avaliações</h3>
                <p>Nenhum cliente avaliou os seus produtos ou serviços ainda.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = avaliacoes.map(a => `
        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem; background: #fff;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                <strong>${a.avaliador_nome}</strong>
                <span style="color: #9ca3af; font-size: 0.9rem;">${new Date(a.criado_em).toLocaleDateString('pt-AO')}</span>
            </div>
            <div style="color: #fbbf24; margin-bottom: 0.5rem;">
                ${'<i class="fa-solid fa-star"></i>'.repeat(a.nota)}
                ${'<i class="fa-regular fa-star"></i>'.repeat(5 - a.nota)}
            </div>
            <p style="color: var(--text-dark);">${a.comentario || '<em>Sem comentário escrito.</em>'}</p>
        </div>
    `).join('');
}
