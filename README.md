# Petite Bow — Toko Coquette

Struktur:
- backend/   -> Node.js + Express (REST API) + SQLite (database, file toko.db otomatis dibuat)
- frontend/  -> HTML, CSS, JavaScript (dilayani oleh backend)

Cara jalan (butuh Node.js 18+):
    cd backend
    npm install
    npm start
Buka http://localhost:3000

Endpoint API:
    GET  /api/products[?category=Fashion]
    GET  /api/products/:id
    POST /api/orders         (checkout)
    GET  /api/orders?customerId=...
