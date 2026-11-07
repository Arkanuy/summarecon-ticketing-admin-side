import { ScanApp } from "@/components/checkin/ScanApp";

export const metadata = {
  title: "Check-in Petugas",
  description: "Pemindai QR e-ticket untuk petugas lapangan.",
};

/* Halaman mandiri: tanpa sidebar admin, tanpa sesi admin. */
export default function ScanPage() {
  return <ScanApp />;
}
