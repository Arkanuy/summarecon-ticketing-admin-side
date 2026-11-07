import QRCode from "qrcode";

/**
 * QR asli untuk kartu e-ticket admin.
 *
 * Sebelumnya kartu hanya menggambar pola kotak-kotak (conic-gradient), bukan QR —
 * jadi petugas tidak bisa memindai apa pun dari dashboard. Token yang dipakai sama
 * dengan yang dicetak ke peserta, sehingga hasil scan identik.
 */
export async function QrImage({ token, size = 120 }: { token: string | null; size?: number }) {
  if (!token) {
    return <div className="qr-box qr-empty" aria-label="QR belum terbit" />;
  }

  const dataUrl = await QRCode.toDataURL(token, {
    width: size * 2,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2A1F2D", light: "#FFFFFF" },
  });

  /* eslint-disable-next-line @next/next/no-img-element */
  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR e-ticket"
      className="qr-real"
    />
  );
}
