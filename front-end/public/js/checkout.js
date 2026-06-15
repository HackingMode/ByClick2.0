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
        let pedidosCriados = [];

        // Processar Pedidos de Produtos (agrupados todos num só envio para simplificar, ou individual se o backend exigir. Vamos enviar todos)
        if (produtos.length > 0) {
            const payloadProdutos = {
                itens: produtos.map(p => ({ produto_id: p.id, quantidade: p.quantidade || 1 })),
                endereco_entrega_provincia: prov,
                endereco_entrega_municipio: mun,
                endereco_entrega_bairro: bairro,
                notas: notas,
                metodo_pagamento: metodoPagamento
            };

            const reqProd = await fetch(`${API_BASE_URL}/pedidos/produtos`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payloadProdutos)
            });

            if (reqProd.ok) {
                const resProd = await reqProd.json();
                pedidosCriados.push(resProd);
            } else {
                sucessoGlobal = false;
            }
        }

        // Processar Pedidos de Serviços (um a um)
        for (const servico of servicos) {
            const payloadServico = {
                servico_id: servico.id,
                data_agendada: new Date(Date.now() + 86400000 * 2).toISOString(),
                descricao_necessidade: notas,
                metodo_pagamento: metodoPagamento
            };

            const reqServ = await fetch(`${API_BASE_URL}/pedidos/servicos`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(payloadServico)
            });

            if (reqServ.ok) {
                const resServ = await reqServ.json();
                pedidosCriados.push(resServ);
            } else {
                sucessoGlobal = false;
            }
        }

        if (sucessoGlobal) {
            // Limpar o carrinho e sessão
            localStorage.removeItem('kitanda_carrinho');
            window.dispatchEvent(new Event('carrinhoAtualizado'));
            
            if (metodoPagamento === 'multicaixa') {
                mostrarPaginaSucessoIBAN(pedidosCriados);
            } else {
                showToast('Pedido realizado com sucesso!', 'success');
                setTimeout(() => {
                    window.location.href = '../paineis/painel_comprador/painel_comprador.html';
                }, 2000);
            }
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

function mostrarPaginaSucessoIBAN(pedidos) {
    const container = document.querySelector('.checkout-container');
    
    // Coletar todos os IBANs
    let allIbans = [];
    pedidos.forEach(p => {
        if(p.vendedores_ibans) {
            allIbans.push(...p.vendedores_ibans);
        }
    });
    
    // Remover duplicados e limpar undefined
    allIbans = [...new Set(allIbans)].filter(i => i && !i.includes('null'));
    
    let ibansHtml = '';
    if (allIbans.length > 0) {
        ibansHtml = allIbans.map(ibanStr => `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e9ecef;">
                <strong>${ibanStr.split(':')[0]}</strong><br>
                <span style="font-size: 1.1em; color: var(--blue);">${ibanStr.split(':')[1] || 'IBAN não definido'}</span>
            </div>
        `).join('');
    } else {
        ibansHtml = `<p>O vendedor não tem IBAN cadastrado. Entre em contacto direto.</p>`;
    }
    
    const pedidoIds = pedidos.map(p => p.pedido_id);
    const tipo = pedidos[0].numero_pedido.startsWith('S') ? 'servico' : 'produto';

    container.innerHTML = `
        <div class="success-step" style="max-width: 600px; margin: 0 auto; width: 100%; text-align: center; padding: 40px 20px;">
            <i class="fa-solid fa-circle-check" style="font-size: 60px; color: var(--green); margin-bottom: 20px;"></i>
            <h2>Pedido Criado com Sucesso!</h2>
            <p style="margin-bottom: 30px; color: #666;">Para concluir a sua compra via Multicaixa/Transferência, efetue o pagamento para os seguintes IBANs e anexe o comprovativo.</p>
            
            <div style="text-align: left; margin-bottom: 30px;">
                ${ibansHtml}
            </div>
            
            <div style="text-align: left; margin-bottom: 30px;">
                <label style="display: block; font-weight: 600; margin-bottom: 10px;">Anexar Comprovativo de Pagamento</label>
                <input type="file" id="comprovativoFile" accept="image/*" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
            </div>
            
            <button id="btnUploadComprovativo" class="btn-checkout" style="width: 100%;">
                <i class="fa-solid fa-upload"></i> Enviar Comprovativo
            </button>
            <br><br>
            <a href="../paineis/painel_comprador/painel_comprador.html" style="color: var(--blue); text-decoration: none; font-weight: 600;">Ignorar e enviar depois</a>
        </div>
    `;

    document.getElementById('btnUploadComprovativo').addEventListener('click', async (e) => {
        const fileInput = document.getElementById('comprovativoFile');
        if (!fileInput.files || fileInput.files.length === 0) {
            showToast('Por favor, selecione uma imagem.', 'warning');
            return;
        }

        const btn = e.target;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A enviar...';

        try {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result;
                let uploadSuccess = true;
                
                // Upload para todos os pedidos criados
                for(const pedido of pedidos) {
                    const typePath = pedido.numero_pedido.startsWith('S') ? 'servicos' : '';
                    const endpoint = typePath ? `/pedidos/servicos/${pedido.pedido_id}/comprovativo` : `/pedidos/${pedido.pedido_id}/comprovativo`;
                    
                    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                        method: 'POST',
                        headers: authHeaders(),
                        body: JSON.stringify({ imagem_base64: base64 })
                    });
                    if (!res.ok) uploadSuccess = false;
                }
                
                if (uploadSuccess) {
                    showToast('Comprovativo enviado com sucesso!', 'success');
                    setTimeout(() => {
                        window.location.href = '../paineis/painel_comprador/painel_comprador.html';
                    }, 2000);
                } else {
                    showToast('Erro ao enviar comprovativo.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-upload"></i> Enviar Comprovativo';
                }
            };
        } catch (error) {
            console.error(error);
            showToast('Erro ao processar imagem.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-upload"></i> Enviar Comprovativo';
        }
    });
}
