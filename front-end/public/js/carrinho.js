/**
 * Carrinho de Compras — ByClick
 * Funcionalidades globais de UI do carrinho (badges, etc).
 * A lógica pesada está agora no js/api.js (getCarrinho, etc).
 */

function getCartCount() {
  const carrinho = getCarrinho();
  return carrinho.itens.reduce((count, item) => count + (item.quantidade || 1), 0);
}

function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartCount();

  badges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}

function updateQuantity(id, tipo, novaQuantidade) {
  const carrinho = getCarrinho();
  const item = carrinho.itens.find(c => String(c.id) === String(id) && c.tipo === tipo);

  if (item) {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(id, tipo);
    } else {
      item.quantidade = novaQuantidade;
      salvarCarrinho(carrinho);
    }
  }
}

function clearCart() {
  localStorage.removeItem('byclick_carrinho');
  window.dispatchEvent(new Event('carrinhoAtualizado'));
}

// Inicializar badge e escutar eventos globais
document.addEventListener('DOMContentLoaded', updateCartBadge);
window.addEventListener('carrinhoAtualizado', updateCartBadge);
