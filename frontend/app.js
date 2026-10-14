// FRONTEND: ambil data dari API backend lewat fetch()
const API = '/api';
const rp = n => 'Rp' + Number(n).toLocaleString('id-ID');
const $ = id => document.getElementById(id);
let PRODUCTS = [], cart = {}, cat = 'Semua', view = 'shop';

// ID pembeli anonim, disimpan di browser untuk melihat riwayat pesanan
let customerId = localStorage.getItem('pb_cid');
if (!customerId) { customerId = 'c' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('pb_cid', customerId); }
try { cart = JSON.parse(localStorage.getItem('pb_cart') || '{}'); } catch (e) {}

async function api(path, opts) {
  const r = await fetch(API + path, opts && { method: opts.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opts.body) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 1800); }
function go(v) { view = v; toggleCart(false); render(); scrollTo(0, 0); }

async function init() {
  try { PRODUCTS = await api('/products'); }
  catch (e) { $('app').innerHTML = '<div class="empty">Gagal memuat produk. Pastikan backend jalan.</div>'; return; }
  Object.keys(cart).forEach(id => { if (!PRODUCTS.find(p => p.id == id)) delete cart[id]; });
  render(); renderCart();
}

function render() {
  if (view === 'orders') return renderOrders();
  const cats = ['Semua', ...new Set(PRODUCTS.map(p => p.category))];
  const list = PRODUCTS.filter(p => cat === 'Semua' || p.category === cat);
  $('app').innerHTML = `<section class="hero"><div class="script">Koleksi Coquette</div><p>Pita, renda, dan segala hal manis untuk harimu. 🎀</p></section>
  <div class="filters">${cats.map(c => `<button class="ghost ${c === cat ? 'on' : ''}" onclick="cat='${c}';render()">${c}</button>`).join('')}</div>
  <div class="grid">${list.map(p => `<div class="card">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
    <div class="img" onclick="detail(${p.id})">${p.emoji}</div><h3 onclick="detail(${p.id})">${p.name}</h3>
    <div class="price">${rp(p.price)}</div><button class="btn" style="margin-top:8px" onclick="add(${p.id})">+ Keranjang</button></div>`).join('')}</div>`;
}
function detail(id) {
  const p = PRODUCTS.find(x => x.id == id);
  $('modal').innerHTML = `<button class="x" onclick="closeOv()">✕</button>
  <div class="card" style="box-shadow:none;border:0"><div class="img" style="height:190px;font-size:6rem;cursor:default">${p.emoji}</div></div>
  <h2 class="script title">${p.name}</h2><p>${p.description}</p><p class="price">${rp(p.price)}</p>
  <button class="btn" onclick="add(${p.id});closeOv()">Tambah ke Keranjang</button>`;
  $('ov').classList.add('show');
}
function closeOv() { $('ov').classList.remove('show'); }

function saveCart() { localStorage.setItem('pb_cart', JSON.stringify(cart)); renderCart(); }
function add(id, n = 1) { cart[id] = (cart[id] || 0) + n; if (cart[id] <= 0) delete cart[id]; saveCart(); if (n > 0) toast('Ditambahkan ke keranjang 🎀'); }
function toggleCart(s) { $('drawer').classList.toggle('show', s); }
const cartItems = () => Object.entries(cart).map(([id, q]) => ({ ...PRODUCTS.find(p => p.id == id), q })).filter(i => i.id);
const cartTotal = () => cartItems().reduce((s, i) => s + i.price * i.q, 0);
function renderCart() {
  const it = cartItems();
  $('cnt').textContent = it.reduce((s, i) => s + i.q, 0);
  $('total').textContent = rp(cartTotal());
  $('items').innerHTML = it.length ? it.map(i => `<div class="row"><div class="e">${i.emoji}</div>
    <div class="m"><div>${i.name}</div><div class="price">${rp(i.price)}</div></div>
    <div class="qty"><button onclick="add(${i.id},-1)">−</button> ${i.q} <button onclick="add(${i.id},1)">+</button></div></div>`).join('')
    : '<div class="empty">Keranjangmu masih kosong 🌷</div>';
}

function openCheckout() {
  if (!cartItems().length) { toast('Keranjang masih kosong'); return; }
  toggleCart(false);
  $('modal').innerHTML = `<button class="x" onclick="closeOv()">✕</button><h2 class="script title">Checkout</h2>
  <label>Nama lengkap</label><input id="f_n" placeholder="Nama penerima">
  <label>No. WhatsApp</label><input id="f_t" inputmode="tel" placeholder="08xxxxxxxxxx">
  <label>Alamat lengkap</label><textarea id="f_a" rows="3" placeholder="Jalan, kota, kode pos"></textarea>
  <label>Pengiriman</label><select id="f_s"><option value="reguler">Reguler — Rp15.000</option><option value="express">Express — Rp30.000</option></select>
  <label>Pembayaran</label><select id="f_p"><option>Transfer Bank</option><option>QRIS</option><option>COD</option></select>
  <div class="tot"><span>Subtotal</span><span>${rp(cartTotal())}</span></div>
  <button class="btn" style="width:100%" onclick="placeOrder()">Buat Pesanan 💌</button>`;
  $('ov').classList.add('show');
}
async function placeOrder() {
  try {
    const o = await api('/orders', { method: 'POST', body: {
      customerId, name: $('f_n').value, phone: $('f_t').value, address: $('f_a').value,
      payment: $('f_p').value, shipping: $('f_s').value,
      items: Object.entries(cart).map(([productId, qty]) => ({ productId: +productId, qty }))
    }});
    cart = {}; saveCart();
    $('modal').innerHTML = `<div style="text-align:center"><div style="font-size:4rem">🎀</div>
    <h2 class="script title">Terima kasih!</h2><p>Pesananmu <b>${o.id}</b> berhasil dibuat.<br>Total <b>${rp(o.total)}</b>.</p>
    <button class="btn" onclick="closeOv();go('orders')">Lihat Pesanan</button></div>`;
  } catch (e) { toast(e.message); }
}
async function renderOrders() {
  $('app').innerHTML = `<section class="hero"><div class="script">Pesananku</div></section><div id="ol" class="empty">Memuat…</div>`;
  try {
    const list = await api('/orders?customerId=' + encodeURIComponent(customerId));
    $('ol').className = '';
    $('ol').innerHTML = list.length ? list.map(o => `<div class="order">
      <div style="display:flex;justify-content:space-between"><b>${o.id}</b><span class="price">${o.status}</span></div>
      <small>${o.created_at} · ${o.payment}</small>
      <div>${o.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join('<br>')}</div>
      <div style="margin-top:6px">Total: <b>${rp(o.total)}</b></div></div>`).join('')
      : '<div class="empty">Belum ada pesanan 🌷</div>';
  } catch (e) { $('ol').textContent = e.message; }
}
init();
