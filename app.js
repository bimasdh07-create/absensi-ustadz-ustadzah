const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbykDIE61-i8oIOsmfUCRok9AW0LYEr-NramQ47dfhf-ck_apgtT1kBA_2d4iUvJg4nviQ/exec";
const KOR_SEKOLAH_LAT = -7.15097;  
const KOR_SEKOLAH_LNG = 111.88145; 
const RADIUS_MAKSIMAL_METER = 50;  

// 1. GENERATE TAHUN 2026 - 2036 PADA DROPDOWN FILTER
const selectTahun = document.getElementById('filterTahun');
for (let t = 2026; t <= 2036; t++) {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    selectTahun.appendChild(opt);
}

// Set default filter ke bulan & tahun sekarang secara otomatis
const waktuSekarang = new Date();
const daftarBulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
document.getElementById('filterBulan').value = daftarBulanIndo[waktuSekarang.getMonth()];
selectTahun.value = waktuSekarang.getFullYear();

// Jam Live di Halaman Web
setInterval(() => {
    document.getElementById('liveClock').textContent = "Waktu Saat Ini: " + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}, 1000);

// 2. MASTER DATA GURU ASLI YAYASAN IQRA SUNNAH
const daftarUstadz = [
    "SAIDI, M.Pd", "ADY MUHIBBUDDIN, S.T", "IMAM SYAFI'I, S.Pd", "M. EDI SANTOSO, S.M", "MOCH. SULTON U.B, S.Pd",
    "NURILROCHMATIN, M.Pd", "HETI PUJI LESTARI, S.Pd", "FATHIMAH, S.Pd", "AMILATUR ROFIAH",
    "IKE ROHMAWATI, S.TP", "SITI RODHIYAH, S.Pd", "NURUL FITRIYA R, S.H", "ADINDA ELSA SABILA",
    "HASNA NAJLA HANIFAH", "JANIA PUTRI SALEHA", "JAZILAH", "OKTAVIA NUR R.",
    "IZZATUL UMMAH", "ELSYA NUR HASANAH"
];
const selectNama = document.getElementById('nama');
daftarUstadz.sort().forEach(n => {
    let o = document.createElement('option'); o.value = n; o.textContent = n; selectNama.appendChild(o);
});

// 3. KUNCI DEVICE ID
function getDeviceId() {
    let id = localStorage.getItem('absen_device_id');
    if (!id) {
        id = 'hp-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('absen_device_id', id);
    }
    return id;
}
const DEVICE_ID = getDeviceId();

function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180;
    const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// 4. PROSES SUBMIT ABSEN (MASUK / PULANG)
function prosesAbsen(jenisAbsen) {
    const nama = selectNama.value;
    const status = document.getElementById('status').value;
    if(!nama) { alert("Silakan pilih nama Anda terlebih dahulu."); return; }

    if (!navigator.geolocation) { alert("GPS tidak didukung browser ini."); return; }

    navigator.geolocation.getCurrentPosition(function(pos) {
        const jarak = hitungJarak(pos.coords.latitude, pos.coords.longitude, KOR_SEKOLAH_LAT, KOR_SEKOLAH_LNG);
        if (jarak > RADIUS_MAKSIMAL_METER) {
            alert(`Akses Ditolak! Anda di luar area sekolah (${Math.round(jarak)} meter).`);
            return;
        }

        const sekarang = new Date();
        const tglString = sekarang.toLocaleDateString('id-ID', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\//g, '-');
        const jamString = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const payload = {
            aksi: "absen",
            nama: nama,
            status: status,
            tanggal: tglString,
            jam: jamString,
            tipe: jenisAbsen, 
            deviceId: DEVICE_ID
        };

        fetch(URL_GOOGLE_SCRIPT, { method: 'POST', body: JSON.stringify(payload) })
        .then(r => r.json())
        .then(res => {
            if(res.result === 'success') {
                const box = document.getElementById('pesanSukses');
                box.textContent = `Alhamdulillah, Absen ${jenisAbsen} Berhasil Dicatat!`;
                box.classList.remove('hidden');
                document.getElementById('absensiForm').reset();
                setTimeout(() => box.classList.add('hidden'), 4000);
            } else if(res.result === 'wrong_device') {
                alert("Gagal! Nama Anda sudah terkunci di HP lain.");
            }
        }).catch(() => alert("Gagal terhubung ke database."));
    }, () => alert("Aktifkan GPS Anda!"), { enableHighAccuracy: true });
}

document.getElementById('btnMasuk').addEventListener('click', () => prosesAbsen('Masuk'));
document.getElementById('btnPulang').addEventListener('click', () => prosesAbsen('Pulang'));


// ======================================================
// 5. FITUR AMBIL DATA & DOWNLOAD MS EXCEL (SUDAH DIPERBAIKI)
// ======================================================
let dataAktifTabel = []; 

document.getElementById('btnTampilkan').addEventListener('click', () => {
    const bln = document.getElementById('filterBulan').value;
    const thn = document.getElementById('filterTahun').value;
    const tbody = document.getElementById('isiTabel');
    
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Mengambil data dari Google Sheets...</td></tr>`;

    // Tarik data dari Google Sheets
    fetch(`${URL_GOOGLE_SCRIPT}?bulanTahun=${bln} ${thn}`)
    .then(r => r.json())
    .then(res => {
        tbody.innerHTML = "";
        if(!res || res.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color:#ff0000;">Tidak ada data absensi di bulan ini.</td></tr>`;
            document.getElementById('btnDownload').disabled = true;
            return;
        }
        dataAktifTabel = res; 
        res.forEach(row => {
            let tr = document.createElement('tr');
            // PERBAIKAN: Menggunakan properti huruf kecil sesuai output Google Apps Script (jammasuk & jampulang)
            let jMasuk = row.jammasuk || row.jamMasuk || '-';
            let jPulang = row.jampulang || row.jamPulang || '-';
            
            tr.innerHTML = `<td><strong>${row.nama}</strong></td><td>${row.tanggal}</td><td>${jMasuk}</td><td>${jPulang}</td><td>${row.status}</td>`;
            tbody.appendChild(tr);
        });
        document.getElementById('btnDownload').disabled = false; 
    }).catch(() => {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color:red;">Gagal memuat data. Folder bulan tersebut belum terbentuk di Google Sheet.</td></tr>`;
    });
});

// Aksi Download Excel via SheetJS
document.getElementById('btnDownload').addEventListener('click', () => {
    const bln = document.getElementById('filterBulan').value;
    const thn = document.getElementById('filterTahun').value;
    
    const worksheet = XLSX.utils.json_to_sheet(dataAktifTabel.map(item => ({
        "Nama Pengajar": item.nama,
        "Tanggal": item.tanggal,
        "Jam Masuk": item.jammasuk || item.jamMasuk || '-',
        "Jam Pulang": item.jampulang || item.jamPulang || '-',
        "Status": item.status
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absen");
    XLSX.writeFile(workbook, `Rekap_Absen_${bln}_${thn}.xlsx`);
});
