document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o user está logado
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login/index.html?redirect=../checkout/index.html';
        return;
    }

    carregarItensCheckout();
    configurarRadios();
    
    document.getElementById('btnFinalizar').addEventListener('click', submeterPedido);
});

function configurarRadios() {
    const radios = document.querySelectorAll('input[name="payment"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
            e.target.closest('.payment-option').classList.add('selected');
        });
    });
}

function carregarItensCheckout() {
    // Nós vamos guardar o que a pessoa clicou em "Comprar Agora" no sessionStorage
    const itemJson = sessionStorage.getItem('checkout_item');
    
    if (!itemJson) {
        showToast('Nenhum item para comprar.', 'error');
        setTimeout(() => window.location.href = '../explorar/index.html', 1500);
        return;
    }

    const item = JSON.parse(itemJson); // { tipo: 'produto'|'servico', id, nome, preco, imagem, quantidade }
    
    const container = document.getElementById('orderItems');
    const taxaEntrega = item.tipo === 'produto' ? 2000 : 0; // Exemplo: produtos têm entrega, serviços não

    container.innerHTML = `
        <div class="item-card">
            <img src="${item.imagem || '../../assets/placeholder.png'}" class="item-img" alt="${item.nome}">
            <div class="item-info">
                <div class="item-title">${item.nome}</div>
                <div class="item-qty">Qtd: ${item.quantidade || 1}</div>
                <div class="item-price">${formatarMoeda(item.preco)}</div>
            </div>
        </div>
    `;

    const subtotal = item.preco * (item.quantidade || 1);
    const grandTotal = subtotal + taxaEntrega;

    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);
    document.getElementById('taxaEntrega').textContent = taxaEntrega > 0 ? formatarMoeda(taxaEntrega) : 'Grátis';
    document.getElementById('grandTotal').textContent = formatarMoeda(grandTotal);
}

async function submeterPedido() {
    const btn = document.getElementById('btnFinalizar');
    
    const prov = document.getElementById('provincia').value;
    const mun = document.getElementById('municipio').value;
    const bairro = document.getElementById('bairro').value;
    const notas = document.getElementById('notas').value;

    const itemJson = sessionStorage.getItem('checkout_item');
    if (!itemJson) return;
    const item = JSON.parse(itemJson);

    if (item.tipo === 'produto' && (!prov || !mun || !bairro)) {
        showToast('Por favor, preencha a morada de entrega completa.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

    try {
        let endpoint = '';
        let payload = {};

        if (item.tipo === 'produto') {
            endpoint = '/pedidos/produtos';
            payload = {
                itens: [{ produto_id: item.id, quantidade: item.quantidade || 1 }],
                endereco_entrega_provincia: prov,
                endereco_entrega_municipio: mun,
                endereco_entrega_bairro: bairro,
                notas: notas
            };
        } else {
            endpoint = '/pedidos/servicos';
            payload = {
                servico_id: item.id,
                descricao_necessidade: notas
            };
        }

        const res = await apiCall('POST', endpoint, payload);
        if (res) {
            showToast('Pedido realizado com sucesso!', 'success');
            sessionStorage.removeItem('checkout_item');
            
            // Redirect to buyer dashboard
            setTimeout(() => {
                window.location.href = '../paineis/painel_comprador/painel_comprador.html';
            }, 2000);
        }
    } catch (e) {
        showToast('Erro ao processar o pedido. Tente novamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Finalizar Encomenda <i class="fa-solid fa-arrow-right"></i>';
    }
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(valor);
}
