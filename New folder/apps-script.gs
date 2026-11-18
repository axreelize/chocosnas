/**
 * ChocoSnap: terima foto dari web dan simpan ke folder Google Drive.
 * Tempel seluruh kode ini di script.google.com, lalu Deploy sebagai Web app.
 */
const FOLDER_ID = '1FkU4Zc10Pk7NItXycQ6VFN5QhQDOrt3A';
const MAX_BYTES = 10 * 1024 * 1024; // batas 10 MB per foto

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (!/^image\/(png|jpeg)$/.test(p.mime)) return reply({ ok: false, error: 'tipe berkas ditolak' });
    const bytes = Utilities.base64Decode(p.data);
    if (bytes.length > MAX_BYTES) return reply({ ok: false, error: 'berkas terlalu besar' });
    const name = String(p.name || 'chocosnap.jpg').replace(/[^\w.\-]/g, '_').slice(0, 80);
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, p.mime, name));
    return reply({ ok: true, id: file.getId() });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function doGet() {
  return reply({ ok: true, service: 'ChocoSnap' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
