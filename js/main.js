// ========== AUTH & GLOBAL STATE ==========
let currentUser = JSON.parse(sessionStorage.getItem('user')) || null;

function updateUI() {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const userGreeting = document.getElementById('userGreeting');
  const logoutBtn = document.getElementById('logoutBtn');
  if (!loginBtn) return; // not on relevant page
  if (currentUser) {
    if(loginBtn) loginBtn.classList.add('hidden');
    if(signupBtn) signupBtn.classList.add('hidden');
    if(userGreeting) { userGreeting.classList.remove('hidden'); userGreeting.textContent = `Hi, ${currentUser.name}`; }
    if(logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    if(loginBtn) loginBtn.classList.remove('hidden');
    if(signupBtn) signupBtn.classList.remove('hidden');
    if(userGreeting) userGreeting.classList.add('hidden');
    if(logoutBtn) logoutBtn.classList.add('hidden');
  }
  
  updateCartCount();
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

async function signup() {
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const res = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
  if (res.message === 'Account created successfully') {
    alert('Your account has been created!');
    closeModal('signupModal');
    // Clear form
    document.getElementById('signupName').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
  } else {
    alert(res.message || 'Signup failed');
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.user) {
    currentUser = res.user;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    updateUI();
    closeModal('loginModal');
    alert('Login successful!');
    // Reload page-dependent data
    if (window.location.pathname.includes('product.html')) loadProductPage();
    if (window.location.pathname.includes('cart.html')) renderCart();
    if (window.location.pathname.includes('checkout.html')) checkAuthForCheckout();
  } else {
    alert(res.message || 'Login failed');
  }
}

// Special login from checkout page to stay on same page
async function loginFromCheckout() {
  await login();
  checkAuthForCheckout();
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('user');
  updateUI();
  window.location.href = 'index.html';
}

// ========== CART OPERATIONS (localStorage) ==========
function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(product) {
  let cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  }
  saveCart(cart);
  updateCartCount();
  alert('Added to cart!');
}

function updateCartCount() {
  const countEl = document.getElementById('cartCount');
  if (countEl) {
    const cart = getCart();
    countEl.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// ========== INDEX PAGE ==========
async function loadFeatured() {
  if (!document.getElementById('featuredProducts')) return;
  const res = await apiFetch('/products');
  if (Array.isArray(res)) {
    const container = document.getElementById('featuredProducts');
    container.innerHTML = res.map(p => `
      <div class="border rounded-lg p-4 shadow hover:shadow-lg transition">
        <img src="${p.image}" alt="${p.name}" class="w-full h-40 object-cover rounded mb-2" />
        <h3 class="font-bold maroon-text">${p.name}</h3>
        <p class="text-gray-600">$${p.price}</p>
        <a href="product.html?id=${p.id}" class="mt-2 inline-block maroon py-1 px-3 rounded text-sm">View Details</a>
      </div>
    `).join('');
  }
}

function searchProducts() {
  const term = document.getElementById('searchBar').value.toLowerCase();
  window.location.href = `product.html?search=${term}`;
}

// ========== PRODUCT PAGE ==========
async function loadProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const searchTerm = urlParams.get('search');

  const grid = document.getElementById('productGrid');
  const detail = document.getElementById('productDetail');
  const gridTitle = document.getElementById('gridTitle');

  if (productId) {
    // Show single product detail
    grid.classList.add('hidden');
    detail.classList.remove('hidden');
    const res = await apiFetch(`/products/${productId}`);
    if (res && !res.message) {
      document.getElementById('detailImage').src = res.image;
      document.getElementById('detailName').textContent = res.name;
      document.getElementById('detailDesc').textContent = res.description || '';
      document.getElementById('detailPrice').textContent = `$${res.price}`;
      document.getElementById('detailStock').textContent = `Stock: ${res.stock ?? 'N/A'}`;
      window._detailProduct = res; // store for addToCartFromDetail
    }
  } else {
    // Show grid
    grid.classList.remove('hidden');
    detail.classList.add('hidden');
    let fetchUrl = '/products';
    let products = await apiFetch(fetchUrl);
    if (searchTerm) {
      gridTitle.textContent = `Search: "${searchTerm}"`;
      products = products.filter(p => p.name.toLowerCase().includes(searchTerm));
    }
    renderProductGrid(products);
  }
}

function renderProductGrid(products) {
  const container = document.getElementById('productList');
  if (!container) return;
  container.innerHTML = products.map(p => `
    <div class="border rounded-lg p-4 shadow">
      <img src="${p.image}" class="w-full h-40 object-cover rounded mb-2" />
      <h3 class="font-bold maroon-text">${p.name}</h3>
      <p>$${p.price}</p>
      <a href="product.html?id=${p.id}" class="mt-2 inline-block maroon py-1 px-3 rounded text-sm">View</a>
    </div>
  `).join('');
}

function addToCartFromDetail() {
  if (window._detailProduct) addToCart(window._detailProduct);
}

function searchProductPage() {
  const term = document.getElementById('searchBar').value;
  window.location.href = `product.html?search=${term}`;
}

// ========== CART PAGE ==========
function renderCart() {
  const cart = getCart();
  const itemsDiv = document.getElementById('cartItems');
  const emptyDiv = document.getElementById('emptyCart');
  const summaryDiv = document.getElementById('cartSummary');
  const totalSpan = document.getElementById('cartTotal');
  if (!itemsDiv) return;
  if (cart.length === 0) {
    emptyDiv.classList.remove('hidden');
    summaryDiv.classList.add('hidden');
    return;
  }
  emptyDiv.classList.add('hidden');
  summaryDiv.classList.remove('hidden');
  itemsDiv.innerHTML = cart.map(item => `
    <div class="flex items-center justify-between border-b py-2">
      <div class="flex items-center gap-4">
        <img src="${item.image}" class="w-16 h-16 object-cover rounded" />
        <div>
          <p class="font-semibold">${item.name}</p>
          <p class="text-sm text-gray-600">$${item.price} x ${item.quantity}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="changeQuantity('${item.id}', -1)" class="bg-gray-300 px-2 rounded">-</button>
        <span>${item.quantity}</span>
        <button onclick="changeQuantity('${item.id}', 1)" class="bg-gray-300 px-2 rounded">+</button>
        <button onclick="removeItem('${item.id}')" class="text-red-600 ml-2">Remove</button>
      </div>
    </div>
  `).join('');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  totalSpan.textContent = total.toFixed(2);
}

function changeQuantity(productId, delta) {
  let cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => i.id !== productId);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

function removeItem(productId) {
  let cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  renderCart();
  updateCartCount();
}

// ========== CHECKOUT PAGE ==========
function checkAuthForCheckout() {
  const authDiv = document.getElementById('checkoutAuth');
  const formDiv = document.getElementById('checkoutForm');
  if (!authDiv) return;
  if (currentUser) {
    authDiv.classList.add('hidden');
    formDiv.classList.remove('hidden');
  } else {
    authDiv.classList.remove('hidden');
    formDiv.classList.add('hidden');
  }
}

async function placeOrder() {
  if (!currentUser) {
    alert('Please login first');
    return;
  }
  const cart = getCart();
  if (cart.length === 0) {
    alert('Cart is empty');
    return;
  }
  const orderData = {
    userId: currentUser.id,
    items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
    delivery: {
      address: document.getElementById('delAddress').value,
      city: document.getElementById('delCity').value,
      phone: document.getElementById('delPhone').value
    },
    payment: {
      method: document.getElementById('paymentMethod').value,
      status: 'paid'
    }
  };
  const res = await apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
  if (res.order) {
    alert('Order placed successfully!');
    localStorage.removeItem('cart');
    updateCartCount();
    document.getElementById('orderMessage').classList.remove('hidden');
    document.getElementById('orderMessage').textContent = 'Order placed! Your order ID: ' + res.order.id;
    document.getElementById('checkoutForm').classList.add('hidden');
  } else {
    alert(res.message || 'Order failed');
  }
}

// ========== ADMIN PAGE ==========
let activeTab = 'analytics';

async function initAdmin() {
  if (!currentUser || currentUser.role !== 'admin') {
    // Show login prompt, hide dashboard
    document.getElementById('adminLoginRequired').classList.remove('hidden');
    document.getElementById('adminContent').classList.add('hidden');
  } else {
    document.getElementById('adminLoginRequired').classList.add('hidden');
    document.getElementById('adminContent').classList.remove('hidden');
    switchTab('analytics');
  }
}

// Admin login from admin page
async function adminLogin() {
  const email = document.getElementById('adminLoginEmail').value;
  const password = document.getElementById('adminLoginPassword').value;
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.user) {
    currentUser = res.user;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    initAdmin();
  } else {
    document.getElementById('adminLoginError').classList.remove('hidden');
    document.getElementById('adminLoginError').textContent = res.message || 'Invalid credentials';
  }
}
  document.getElementById('adminContent').classList.remove('hidden');
  switchTab('analytics');
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`panel-${tabName}`).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active', 'maroon'));
  document.getElementById(`tab-${tabName}`).classList.add('tab-active', 'maroon');

  if (tabName === 'analytics') loadAnalytics();
  if (tabName === 'users') loadUsers();
  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'orders') loadAdminOrders();
}

async function loadAnalytics() {
  const data = await apiFetch('/admin/analytics');
  if (!data) return;
  const container = document.getElementById('analyticsData');
  container.innerHTML = `
    <div class="p-4 border rounded"><p class="text-sm">Total Users</p><p class="text-2xl font-bold">${data.totalUsers}</p></div>
    <div class="p-4 border rounded"><p class="text-sm">Total Products</p><p class="text-2xl font-bold">${data.totalProducts}</p></div>
    <div class="p-4 border rounded"><p class="text-sm">Total Orders</p><p class="text-2xl font-bold">${data.totalOrders}</p></div>
    <div class="p-4 border rounded"><p class="text-sm">Revenue</p><p class="text-2xl font-bold">$${data.revenue || 0}</p></div>
  `;
}

async function loadUsers() {
  const users = await apiFetch('/admin/users');
  if (!Array.isArray(users)) return;
  let html = '<table class="w-full text-left"><tr class="bg-gray-100"><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr>';
  users.forEach(u => {
    html += `<tr class="border-b">
      <td>${u.name}</td><td>${u.email}</td><td>${u.role}</td>
      <td><button onclick="deleteUser('${u.id}')" class="text-red-600">Delete</button></td>
    </tr>`;
  });
  html += '</table>';
  document.getElementById('usersTable').innerHTML = html;
}

async function deleteUser(id) {
  if (confirm('Delete user?')) {
    await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
    loadUsers();
  }
}

async function loadAdminProducts() {
  const products = await apiFetch('/products');
  if (!Array.isArray(products)) return;
  let html = '<table class="w-full text-left"><tr class="bg-gray-100"><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Action</th></tr>';
  products.forEach(p => {
    html += `<tr class="border-b">
      <td><img src="${p.image}" class="w-12 h-12 object-cover rounded" /></td>
      <td>${p.name}</td><td>$${p.price}</td><td>${p.stock}</td>
      <td><button onclick="deleteProduct('${p.id}')" class="text-red-600">Delete</button></td>
    </tr>`;
  });
  html += '</table>';
  document.getElementById('productsTable').innerHTML = html;
}

function showAddProductForm() {
  document.getElementById('addProductForm').classList.remove('hidden');
}

function hideAddProductForm() {
  document.getElementById('addProductForm').classList.add('hidden');
}

async function addProduct() {
  const product = {
    name: document.getElementById('prodName').value,
    price: document.getElementById('prodPrice').value,
    description: document.getElementById('prodDesc').value,
    image: document.getElementById('prodImage').value,
    stock: document.getElementById('prodStock').value
  };
  await apiFetch('/products', { method: 'POST', body: JSON.stringify(product) });
  alert('Product added');
  hideAddProductForm();
  loadAdminProducts();
}

async function deleteProduct(id) {
  if (confirm('Delete product?')) {
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    loadAdminProducts();
  }
}

async function loadAdminOrders() {
  const orders = await apiFetch('/admin/orders');
  if (!Array.isArray(orders)) return;
  let html = '<table class="w-full text-left"><tr class="bg-gray-100"><th>Order ID</th><th>User ID</th><th>Items</th><th>Delivery</th><th>Payment</th><th>Date</th></tr>';
  orders.forEach(o => {
    html += `<tr class="border-b">
      <td>${o.id}</td><td>${o.userId}</td>
      <td>${o.items.map(i => `${i.productId} x${i.quantity}`).join(', ')}</td>
      <td>${o.delivery.address}, ${o.delivery.city}, ${o.delivery.phone}</td>
      <td>${o.payment.method}</td>
      <td>${new Date(o.date).toLocaleString()}</td>
    </tr>`;
  });
  html += '</table>';
  document.getElementById('ordersTable').innerHTML = html;
}

// ========== PAGE INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  updateUI();

  // Index page
  if (document.getElementById('featuredProducts')) {
    loadFeatured();
  }

  // Product page
  if (window.location.pathname.includes('product.html')) {
    loadProductPage();
  }

  // Cart page
  if (window.location.pathname.includes('cart.html')) {
    renderCart();
  }

  // Checkout page
  if (window.location.pathname.includes('checkout.html')) {
    checkAuthForCheckout();
  }

  // Admin page
  if (window.location.pathname.includes('admin.html')) {
    initAdmin();
  }
});

// Expose functions needed from HTML
window.addToCartFromDetail = addToCartFromDetail;
window.searchProductPage = searchProductPage;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.deleteUser = deleteUser;
window.showAddProductForm = showAddProductForm;
window.hideAddProductForm = hideAddProductForm;
window.loginFromCheckout = loginFromCheckout;
