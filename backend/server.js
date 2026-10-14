// BACKEND: Express REST API + melayani folder frontend
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const SHIPPING = { reguler: 15000, express: 30000 };
const PAYMENTS = ['Transfer Bank', 'QRIS', 'COD'];

// Lihat semua produk (opsional ?category=Fashion)
app.get('/api/products', (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare('SELECT * FROM products WHERE category = ? ORDER BY id').all(category)
    : db.prepare('SELECT * FROM products ORDER BY id').all();
  res.json(rows);
});

// Detail produk
app.get('/api/products/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Produk tidak ditemukan' });
});

// Checkout: harga dihitung ulang di server, bukan dipercaya dari browser
app.post('/api/orders', (req, res) => {
  const { customerId, name, phone, address, payment, shipping, items } = req.body || {};
  if (!customerId || !name?.trim() || !phone?.trim() || !address?.trim())
    return res.status(400).json({ error: 'Data pembeli belum lengkap' });
  if (!PAYMENTS.includes(payment) || !(shipping in SHIPPING))
    return res.status(400).json({ error: 'Metode pembayaran/pengiriman tidak valid' });
  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'Keranjang kosong' });

  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const lines = [];
  let subtotal = 0;
  for (const it of items) {
    const p = getProduct.get(it.productId);
    const qty = Math.floor(Number(it.qty));
    if (!p || !(qty > 0 && qty <= 99))
      return res.status(400).json({ error: 'Item tidak valid' });
    lines.push({ p, qty });
    subtotal += p.price * qty;
  }
  const orderId = 'PB' + Date.now().toString(36).toUpperCase();
  const total = subtotal + SHIPPING[shipping];

  db.transaction(() => {
    db.prepare(`INSERT INTO orders (id,customer_id,name,phone,address,payment,shipping,total)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(orderId, customerId, name.trim(), phone.trim(), address.trim(), payment, SHIPPING[shipping], total);
    const insItem = db.prepare(`INSERT INTO order_items (order_id,product_id,name,emoji,price,qty)
                                VALUES (?,?,?,?,?,?)`);
    lines.forEach(({ p, qty }) => insItem.run(orderId, p.id, p.name, p.emoji, p.price, qty));
  })();

  res.status(201).json({ id: orderId, total, status: 'Menunggu pembayaran' });
});

// Riwayat pesanan milik satu pembeli
app.get('/api/orders', (req, res) => {
  const { customerId } = req.query;
  if (!customerId) return res.status(400).json({ error: 'customerId wajib' });
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(customerId);
  const itemsOf = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  res.json(orders.map(o => ({ ...o, items: itemsOf.all(o.id) })));
});

// FRONTEND: file statis
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Toko Coquette jalan di http://localhost:${PORT}`));
