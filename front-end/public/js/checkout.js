document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o user está logado
    const token = getToken();
    if (!token) {
        window.location.href = '../login/?redirect=../checkout/';
        return;
    }

    carregarItensCheckout();
    configurarRadios();
    
    // Load Provincias and Municipios
    carregarProvincias();
    
    document.getElementById('btnFinalizar').addEventListener('click', submeterPedido);
});

async function carregarProvincias() {
    try {
        const provincias = await apiCall('GET', '/localidades/provincias');
        const selectProv = document.getElementById('provincia');
        selectProv.innerHTML = '<option value="">Selecione a província...</option>';
        
        provincias.forEach(prov => {
            selectProv.innerHTML += `<option value="${prov.id}" data-nome="${prov.nome}">${prov.nome}</option>`;
        });

        selectProv.addEventListener('change', async (e) => {
            const provId = e.target.value;
            const selectMun = document.getElementById('municipio');
            
            if (!provId) {
                selectMun.innerHTML = '<option value="">Selecione a província primeiro</option>';
                selectMun.disabled = true;
                return;
            }

            selectMun.innerHTML = '<option value="">A carregar municípios...</option>';
            selectMun.disabled = true;

            try {
                const municipios = await apiCall('GET', `/localidades/provincias/${provId}/municipios`);
                selectMun.innerHTML = '<option value="">Selecione o município...</option>';
                municipios.forEach(mun => {
                    selectMun.innerHTML += `<option value="${mun.nome}">${mun.nome}</option>`;
                });
                selectMun.disabled = false;
            } catch (err) {
                console.error("Erro ao carregar municípios", err);
                selectMun.innerHTML = '<option value="">Erro ao carregar</option>';
            }
        });
    } catch (error) {
        console.error("Erro ao carregar províncias", error);
        document.getElementById('provincia').innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

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
    const carrinho = getCarrinho();
    
    if (!carrinho || !carrinho.itens || carrinho.itens.length === 0) {
        showToast('O seu carrinho está vazio.', 'error');
        setTimeout(() => window.location.href = '../explorar/', 1500);
        return;
    }

    const container = document.getElementById('orderItems');
    let html = '';
    let temProdutos = false;

    carrinho.itens.forEach(item => {
        if (item.tipo === 'produto') temProdutos = true;
        html += `
            <div class="item-card" style="display:flex; gap:10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <img src="${item.imagem_url || 'https://placehold.co/60'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;" alt="${item.nome}">
                <div>
                    <div style="font-weight:600; font-size:14px;">${item.nome}</div>
                    <div style="font-size:12px; color:#666;">Qtd: ${item.quantidade || 1}</div>
                    <div style="font-weight:700; color:var(--terra);">${formatarPreco(item.preco)}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    const subtotal = totalCarrinho();
    // Exemplo: taxa base se houver produtos, senão 0
    const taxaEntrega = temProdutos ? 2000 : 0; 
    const grandTotal = subtotal + taxaEntrega;

    document.getElementById('subtotal').textContent = formatarPreco(subtotal);
    document.getElementById('taxaEntrega').textContent = taxaEntrega > 0 ? formatarPreco(taxaEntrega) : 'Grátis';
    document.getElementById('grandTotal').textContent = formatarPreco(grandTotal);
}

async function submeterPedido() {
    const btn = document.getElementById('btnFinalizar');
    
    const provSelect = document.getElementById('provincia');
    const provOpt = provSelect.options[provSelect.selectedIndex];
    const prov = provOpt ? provOpt.getAttribute('data-nome') : '';
    const mun = document.getElementById('municipio').value;
    const bairro = document.getElementById('bairro').value;
    const notas = document.getElementById('notas').value;

    const carrinho = getCarrinho();
    if (!carrinho || !carrinho.itens || carrinho.itens.length === 0) return;

    const produtos = carrinho.itens.filter(i => i.tipo === 'produto');
    const servicos = carrinho.itens.filter(i => i.tipo === 'servico');

    if (produtos.length > 0 && (!prov || !mun || !bairro)) {
        showToast('Por favor, preencha a morada de entrega para os produtos físicos.', 'error');
        return;
    }

    const metodoPagamento = document.querySelector('input[name="payment"]:checked').value;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';

    try {
        let sucessoGlobal = true;

        // Processar Pedidos de Produtos (agrupados todos num só envio para simplificar, ou individual se o backend exigir. Vamos enviar todos)
        if (produtos.length > 0) {
            const payloadProdutos = {
                itens: produtos.map(p => ({ produto_id: p.id, quantidade: p.quantidade || 1 })),
                endereco_entrega_provincia: prov,
                endereco_entrega_municipio: mun,
                endereco_entrega_bairro: bairro,
                endereco_entrega_completo: `${prov}, ${mun}, ${bairro}`,
                notas: notas
            };

            const reqProd = await fetch(`${API_BASE_URL}/pedidos/`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payloadProdutos)
            });

            if (reqProd.ok) {
                const resProd = await reqProd.json();
                
                // Pagar e simular confirmação
                await simularPagamento(resProd.id, metodoPagamento, resProd.valor_total, 'produto');
            } else {
                sucessoGlobal = false;
            }
        }

        // Processar Pedidos de Serviços (um a um)
        for (const servico of servicos) {
            const payloadServico = {
                servico_id: servico.id,
                data_agendada: new Date(Date.now() + 86400000 * 2).toISOString(), // Agendamento default para daqui a 2 dias (mock)
                descricao_necessidade: notas
            };

            const reqServ = await fetch(`${API_BASE_URL}/pedidos_servico/`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payloadServico)
            });

            if (reqServ.ok) {
                const resServ = await reqServ.json();
                
                // Simular pagamento do serviço (se o backend já tiver a rota de pagamento de serviço unificada ou separada)
                await simularPagamento(resServ.id, metodoPagamento, servico.preco, 'servico');
            } else {
                sucessoGlobal = false;
            }
        }

        if (sucessoGlobal) {
            showToast('Pedido realizado com sucesso!', 'success');
            
            // Limpar o carrinho e sessão
            localStorage.removeItem('kitanda_carrinho');
            window.dispatchEvent(new Event('carrinhoAtualizado'));
            
            // Redirect to buyer dashboard
            setTimeout(() => {
                window.location.href = '../paineis/painel_comprador/painel_comprador.html';
            }, 2000);
        } else {
            throw new Error("Falha no processamento de um ou mais itens.");
        }
    } catch (e) {
        console.error(e);
        showToast('Erro ao processar o pedido. Tente novamente.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Finalizar Encomenda <i class="fa-solid fa-arrow-right"></i>';
    }
}

async function simularPagamento(pedido_id, metodo, valor, tipoPedido) {
    try {
        // Envia o pagamento
        await fetch(`${API_BASE_URL}/pagamentos/`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                pedido_id: pedido_id,
                metodo: metodo,
                valor: valor,
                moeda: "AOA"
            })
        });

        // Patch do Status do pedido para confirmado
        const rotaPatch = tipoPedido === 'produto' ? `/pedidos/${pedido_id}/status` : `/pedidos_servico/${pedido_id}/status`;
        await fetch(`${API_BASE_URL}${rotaPatch}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ status: "confirmado" })
        });
    } catch (e) {
        console.error("Erro na simulação de pagamento:", e);
    }
}
