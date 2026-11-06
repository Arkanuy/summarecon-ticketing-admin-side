import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: 32 }}>
      <h1 className="page-title">Halaman tidak ditemukan</h1>
      <p className="page-lead">Data yang kamu cari tidak ada di prototipe ini.</p>
      <Link href="/" className="btn btn-outline" style={{ marginTop: 16 }}>
        Kembali ke dashboard
      </Link>
    </div>
  );
}
