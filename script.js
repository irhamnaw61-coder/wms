/* ========================================================================== */
/* WMS PORTFOLIO - FULL FUNCTIONAL LOGIC & DATA INTEGRATION                   */
/* ========================================================================== */

// [1. DATA INIT & STORAGE]
function initData() {
    if (!localStorage.getItem('wms_sku')) {
        localStorage.setItem('wms_sku', JSON.stringify([
            {sku: 'SKU001', name: 'Jersey Persikabo', category: 'Apparel', price: 150000, stock: 100, location: 'Rak A1'}
        ]));
    }
    if (!localStorage.getItem('wms_inbound')) localStorage.setItem('wms_inbound', JSON.stringify([]));
    if (!localStorage.getItem('wms_outbound')) localStorage.setItem('wms_outbound', JSON.stringify([]));
}

// [2. NAVIGASI & SIDEBAR ACTIVE]
function showMenu(menuId) {
    // Sembunyikan semua section menu
    document.querySelectorAll('.menu-section').forEach(sec => sec.classList.add('hidden'));
    // Tampilkan menu yang dipilih
    document.getElementById(`${menuId}-menu`).classList.remove('hidden');
    // Ubah judul header
    document.getElementById('menu-title').innerText = menuId.replace('-', ' ').toUpperCase();
    
    // Pindahkan class 'active' di tombol sidebar
    document.querySelectorAll('#sidebar nav button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${menuId}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Auto load data berdasarkan menu yang dibuka
    if(menuId === 'dashboard') loadDashboard();
    else if(menuId === 'sku') loadSkuTable();
    else if(menuId === 'inbound') loadInboundTable();
    else if(menuId === 'outbound') loadOutboundTable();
    else if(menuId === 'opname') loadOpnameTable();
}

// [3. MODAL CONTROLLER (PERBAIKAN)]
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden'); // Hapus class hidden agar tidak terhalang !important CSS
        modal.style.display = 'flex';     // Paksa tampilkan flex
        
        // Jika modal inbound atau outbound dibuka, update pilihan SKU di dropdown
        if (modalId === 'inbound-modal' || modalId === 'outbound-modal') {
            populateSkuDropdown(modalId === 'inbound-modal' ? 'input-in-sku' : 'input-out-sku');
            // Set tanggal default hari ini
            const today = new Date().toISOString().split('T')[0];
            const dateInput = modalId === 'inbound-modal' ? 'input-in-date' : 'input-out-date';
            if(document.getElementById(dateInput)) document.getElementById(dateInput).value = today;
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');    // Pasang kembali class hidden
        modal.style.display = 'none';     // Sembunyikan
        
        // Reset form jika ada
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

function populateSkuDropdown(selectId) {
    const skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Pilih SKU Barang --</option>' + 
        skus.map(item => `<option value="${item.sku}">${item.sku} - ${item.name} (Stok: ${item.stock})</option>`).join('');
}

// [4. RENDER DASHBOARD]
function loadDashboard() {
    const skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
    const inbound = JSON.parse(localStorage.getItem('wms_inbound')) || [];
    const outbound = JSON.parse(localStorage.getItem('wms_outbound')) || [];
    
    document.getElementById('total-sku').innerText = skus.length;
    document.getElementById('total-stok').innerText = skus.reduce((a, b) => a + parseInt(b.stock), 0) + ' Pcs';

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Hitung transaksi hari ini
    const todayIn = inbound.filter(item => item.date === todayStr).reduce((a, b) => a + parseInt(b.qty), 0);
    const todayOut = outbound.filter(item => item.date === todayStr).reduce((a, b) => a + parseInt(b.qty), 0);
    
    document.getElementById('inbound-today').innerText = todayIn + ' Pcs';
    document.getElementById('outbound-today').innerText = todayOut + ' Pcs';

    // Peringatan Stok Menipis (< 10 unit)
    const lowStockTable = document.getElementById('low-stock-table');
    const lowItems = skus.filter(item => parseInt(item.stock) < 10);
    if (lowStockTable) {
        lowStockTable.innerHTML = lowItems.length === 0 ? 
            '<tr><td style="color:#059669;">Semua stok aman.</td></tr>' :
            lowItems.map(i => `<tr><td>${i.sku} - ${i.name}</td><td style="color:#dc2626; font-weight:bold;">Sisa: ${i.stock}</td></tr>`).join('');
    }

    // Aktivitas Terakhir
    const recentActivity = document.getElementById('recent-activity');
    if (recentActivity) {
        let activities = [
            ...inbound.map(i => ({date: i.date, text: `Masuk: ${i.qty} Pcs (${i.sku}) dari ${i.supplier}`})),
            ...outbound.map(o => ({date: o.date, text: `Keluar: ${o.qty} Pcs (${o.sku}) ke ${o.destination}`}))
        ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        recentActivity.innerHTML = activities.length === 0 ? 
            '<li>Belum ada aktivitas transaksi.</li>' : 
            activities.map(act => `<li style="margin-bottom:6px; font-size:13px; color:#475569;">[${act.date}] ${act.text}</li>`).join('');
    }
}

// [5. MASTER DATA SKU & SEARCH]
function loadSkuTable() {
    const skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
    renderSkuRows(skus);
}

function renderSkuRows(data) {
    const body = document.querySelector('#sku-table tbody');
    if (!body) return;
    body.innerHTML = data.length === 0 ? 
        '<tr><td colspan="7" style="text-align:center; color:#94a3b8;">Belum ada data SKU.</td></tr>' :
        data.map((item, i) => `
            <tr>
                <td>${item.sku}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>Rp ${parseInt(item.price).toLocaleString()}</td>
                <td>${item.stock}</td>
                <td>${item.location}</td>
                <td><button class="action-btn-delete" onclick="deleteSku('${item.sku}')">Hapus</button></td>
            </tr>
        `).join('');
}

function handleSaveSku(e) {
    e.preventDefault();
    let skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
    
    const newSku = {
        sku: document.getElementById('input-sku-code').value.trim(),
        name: document.getElementById('input-sku-name').value.trim(),
        category: document.getElementById('input-sku-cat').value.trim(),
        price: document.getElementById('input-sku-price').value,
        stock: parseInt(document.getElementById('input-sku-stock').value),
        location: document.getElementById('input-sku-loc').value.trim()
    };

    // Validasi duplikat SKU
    if(skus.some(s => s.sku === newSku.sku)) {
        alert('Kode SKU sudah terdaftar!');
        return;
    }

    skus.push(newSku);
    localStorage.setItem('wms_sku', JSON.stringify(skus));
    closeModal('sku-modal');
    loadSkuTable();
}

function deleteSku(skuCode) {
    if (confirm('Yakin ingin menghapus SKU ini?')) {
        let skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
        skus = skus.filter(s => s.sku !== skuCode);
        localStorage.setItem('wms_sku', JSON.stringify(skus));
        loadSkuTable();
    }
}

// Search Filter SKU
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'search-sku') {
        const keyword = e.target.value.toLowerCase();
        const skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
        const filtered = skus.filter(s => s.sku.toLowerCase().includes(keyword) || s.name.toLowerCase().includes(keyword));
        renderSkuRows(filtered);
    }
});

// [6. INBOUND (MASUK) & AUTO STOCK INCREMENT]
function loadInboundTable() {
    const inbound = JSON.parse(localStorage.getItem('wms_inbound')) || [];
    const body = document.querySelector('#inbound-table tbody');
    if (!body) return;
    body.innerHTML = inbound.length === 0 ? 
        '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada riwayat inbound.</td></tr>' :
        inbound.map(item => `
            <tr><td>${item.date}</td><td>${item.po}</td><td>${item.supplier}</td><td>${item.sku}</td><td>${item.qty}</td><td><span style="color:#059669; font-weight:600;">Selesai</span></td></tr>
        `).join('');
}

function handleSaveInbound(e) {
    e.preventDefault();
    let inbound = JSON.parse(localStorage.getItem('wms_inbound')) || [];
    let skus = JSON.parse(localStorage.getItem('wms_sku')) || [];

    const selectedSkuCode = document.getElementById('input-in-sku').value;
    const qtyMasuk = parseInt(document.getElementById('input-in-qty').value);

    // Cari SKU dan update stoknya
    let targetSku = skus.find(s => s.sku === selectedSkuCode);
    if (targetSku) {
        targetSku.stock = parseInt(targetSku.stock) + qtyMasuk;
    }

    const newInbound = {
        date: document.getElementById('input-in-date').value,
        po: document.getElementById('input-in-po').value.trim(),
        supplier: document.getElementById('input-in-supplier').value.trim(),
        sku: selectedSkuCode,
        qty: qtyMasuk
    };

    inbound.push(newInbound);
    localStorage.setItem('wms_inbound', JSON.stringify(inbound));
    localStorage.setItem('wms_sku', JSON.stringify(skus));

    closeModal('inbound-modal');
    loadInboundTable();
}

// [7. OUTBOUND (KELUAR) & STOCK VALIDATION]
function loadOutboundTable() {
    const outbound = JSON.parse(localStorage.getItem('wms_outbound')) || [];
    const body = document.querySelector('#outbound-table tbody');
    if (!body) return;
    body.innerHTML = outbound.length === 0 ? 
        '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada riwayat outbound.</td></tr>' :
        outbound.map(item => `
            <tr><td>${item.date}</td><td>${item.destination}</td><td>${item.sku}</td><td>${item.qty}</td><td><b>${item.status}</b></td><td>-</td></tr>
        `).join('');
}

function handleSaveOutbound(e) {
    e.preventDefault();
    let outbound = JSON.parse(localStorage.getItem('wms_outbound')) || [];
    let skus = JSON.parse(localStorage.getItem('wms_sku')) || [];

    const selectedSkuCode = document.getElementById('input-out-sku').value;
    const qtyKeluar = parseInt(document.getElementById('input-out-qty').value);

    let targetSku = skus.find(s => s.sku === selectedSkuCode);
    
    // Validasi stok cukup atau tidak
    if (!targetSku || targetSku.stock < qtyKeluar) {
        alert('Stok tidak mencukupi untuk pengiriman ini!');
        return;
    }

    // Kurangi stok
    targetSku.stock = parseInt(targetSku.stock) - qtyKeluar;

    const newOutbound = {
        date: document.getElementById('input-out-date').value,
        destination: document.getElementById('input-out-dest').value.trim(),
        sku: selectedSkuCode,
        qty: qtyKeluar,
        status: document.getElementById('input-out-status').value
    };

    outbound.push(newOutbound);
    localStorage.setItem('wms_outbound', JSON.stringify(outbound));
    localStorage.setItem('wms_sku', JSON.stringify(skus));

    closeModal('outbound-modal');
    loadOutboundTable();
}

// [8. STOCK OPNAME REAL-TIME CALCULATION]
function loadOpnameTable() {
    const skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
    const body = document.querySelector('#opname-table tbody');
    if (!body) return;
    body.innerHTML = skus.map(item => `
        <tr>
            <td>${item.sku}</td>
            <td>${item.name}</td>
            <td class="stok-sistem">${item.stock}</td>
            <td><input type="number" class="fisik-input" data-sku="${item.sku}" value="${item.stock}" style="width:80px; padding:6px; border:1px solid #cbd5e1; border-radius:4px;"></td>
            <td class="selisih" style="font-weight:bold; color:#2563eb;">0</td>
        </tr>
    `).join('');
}

// Event listener untuk hitung selisih real-time saat input fisik diketik
document.addEventListener('input', function(e) {
    if (e.target && e.target.classList.contains('fisik-input')) {
        const row = e.target.closest('tr');
        const sistemStock = parseInt(row.querySelector('.stok-sistem').innerText);
        const fisikStock = parseInt(e.target.value) || 0;
        const selisihCell = row.querySelector('.selisih');
        
        const selisih = fisikStock - sistemStock;
        selisihCell.innerText = (selisih > 0 ? '+' : '') + selisih;
        selisihCell.style.color = selisih === 0 ? '#2563eb' : (selisih > 0 ? '#059669' : '#dc2626');
    }
});

function saveOpname() {
    let skus = JSON.parse(localStorage.getItem('wms_sku')) || [];
    const inputs = document.querySelectorAll('.fisik-input');
    
    inputs.forEach(input => {
        const skuCode = input.getAttribute('data-sku');
        const fisikVal = parseInt(input.value);
        let target = skus.find(s => s.sku === skuCode);
        if (target && !isNaN(fisikVal)) {
            target.stock = fisikVal; // Timpa dengan stok fisik baru
        }
    });

    localStorage.setItem('wms_sku', JSON.stringify(skus));
    alert('Stock opname berhasil disimpan dan stok sistem telah disesuaikan!');
    loadOpnameTable();
}

// [INIT]
document.addEventListener('DOMContentLoaded', () => {
    initData();
    showMenu('dashboard');
});

// [9. SESSION & LOGOUT CONTROLLER]

function checkAuth() {

    const isLoggedIn = localStorage.getItem('wms_logged_in');

    if (!isLoggedIn || isLoggedIn !== 'true') {

        window.location.href = 'login.html'; // Paksa balik ke halaman login kalau belum login

    }

}



function handleLogout() {

    if (confirm('Apakah anda yakin ingin keluar dari sistem?')) {

        localStorage.removeItem('wms_logged_in');

        window.location.href = 'login.html';

    }

}



// Jalankan pengecekan auth saat halaman utama dimuat

document.addEventListener('DOMContentLoaded', () => {

    checkAuth(); // Cek status login dulu

    initData();

    showMenu('dashboard');

});
// Fungsi untuk membuka dan menutup modal Profil & Panduan
function toggleModal() {
    const modal = document.getElementById('infoModal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
    }
}
