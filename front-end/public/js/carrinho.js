/**
 * Carrinho de Compras — ByClick
 * Gestão local (localStorage) dos itens do carrinho.
 */

const CART_KEY = 'byclick_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  // item = { id, tipo, nome, preco, imagem_url, vendedor_nome, vendedor_id }
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id && c.tipo === item.tipo);

  if (existing) {
    existing.quantidade += 1;
  } else {
    cart.push({
      ...item,
      quantidade: 1,
      adicionado_em: new Date().toISOString()
    });
  }

  saveCart(cart);

  if (typeof showToast === 'function') {
    showToast(`"${item.nome}" adicionado ao carrinho!`, 'success');
  }

  return cart;
}

function removeFromCart(id, tipo) {
  let cart = getCart();
  cart = cart.filter(c => !(c.id === id && c.tipo === tipo));
  saveCart(cart);
  return cart;
}

function updateQuantity(id, tipo, quantidade) {
  const cart = getCart();
  const item = cart.find(c => c.id === id && c.tipo === tipo);

  if (item) {
    if (quantidade <= 0) {
      return removeFromCart(id, tipo);
    }
    item.quantidade = quantidade;
    saveCart(cart);
  }

  return cart;
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.preco * item.quantidade), 0);
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantidade, 0);
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

// Formatar preço em Kwanzas
function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor) + ' Kz';
}

// Inicializar badge ao carregar qualquer página
document.addEventListener('DOMContentLoaded', updateCartBadge);
