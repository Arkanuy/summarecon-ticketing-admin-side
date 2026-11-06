import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginGate } from "@/components/auth/LoginGate";

export const metadata = { title: "Masuk Admin" };

/**
 * Form dirender sebagai Client Component di luar boundary supaya selalu ter-hydrate;
 * boundary hanya menampung pembacaan sesi (redirect kalau sudah login).
 */
export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <LoginGate />
      </Suspense>
      <LoginForm />
    </>
  );
}
