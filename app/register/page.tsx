"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

interface RoleOption {
  id: string;
  role_name: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { id: "AAA", role_name: "AAA" },
  { id: "AAB", role_name: "AAB" },
  { id: "AAP", role_name: "AAP" },
  { id: "AKS", role_name: "AKS" },
  { id: "AAC", role_name: "AAC" },
  { id: "ATX", role_name: "ATX" },
];

interface RegisterResponse {
  message?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(ROLE_OPTIONS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setMessage("");
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role_id: roleId,
        }),
      });

      const result = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        setMessage(result.message ?? "Registrasi gagal");
        return;
      }

      setSuccess(true);
      setMessage(result.message ?? "Registrasi berhasil, silakan login.");

      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setMessage("Tidak dapat terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell auth-shell-register">
      <div className="auth-background-glow auth-background-glow-one" />
      <div className="auth-background-glow auth-background-glow-two" />

      <div className="auth-layout auth-layout-register">
        <section className="auth-intro auth-intro-register">
          <div className="auth-brand-mark">
            <UserPlus className="h-7 w-7" />
          </div>

          <p className="auth-eyebrow">ERP HAEMES · USER MANAGEMENT</p>
          <h1 className="auth-intro-title">
            Mulai akses ruang kerja perusahaan Anda.
          </h1>
          <p className="auth-intro-description">
            Daftarkan akun pengguna dengan identitas dan kode role yang telah
            ditetapkan administrator.
          </p>

          <div className="auth-intro-footer">
            <span className="auth-status-dot" />
            Pendaftaran pengguna
          </div>
        </section>

        <section className="auth-card auth-card-register">
          <div className="mb-7">
            <div className="auth-mobile-brand">
              <div className="auth-mobile-brand-icon">
                <UserPlus className="h-5 w-5" />
              </div>
              <span>ERP HAEMES</span>
            </div>

            <p className="auth-form-eyebrow">USER REGISTRATION</p>
            <h2 className="auth-form-title">Registrasi Pengguna</h2>
            <p className="auth-form-description">
              Lengkapi data berikut untuk membuat akun pengguna.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="auth-label">
                Nama Lengkap
              </label>
              <input
                id="name"
                type="text"
                required
                maxLength={150}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="auth-input auth-input-no-icon"
                placeholder="Nama pengguna"
              />
            </div>

            <div>
              <label htmlFor="email" className="auth-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={150}
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="auth-input auth-input-no-icon"
                placeholder="email@perusahaan.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="auth-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="auth-input auth-input-no-icon"
                placeholder="Minimal 8 karakter"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Gunakan minimal 8 karakter.
              </p>
            </div>

            <div>
              <label htmlFor="role" className="auth-label">
                Kode Role Pengguna
              </label>
              <select
                id="role"
                required
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
                className="auth-input auth-select"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.id}
                  </option>
                ))}
              </select>

              <p className="mt-1.5 text-xs text-slate-500">
                Pilih kode role sesuai penetapan administrator.
              </p>
            </div>

            {message && (
              <div
                role="alert"
                className={
                  success ? "auth-message-success" : "auth-message-error"
                }
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !roleId}
              className="auth-submit"
            >
              {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {submitting ? "Menyimpan..." : "Daftarkan Pengguna"}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => router.replace("/login")}
              className="auth-secondary"
            >
              Kembali ke Login
            </button>
          </form>

          <p className="auth-footer-text mt-6">
            ERP PT Haemes Mandiri Sejahterabanta
          </p>
        </section>
      </div>
    </main>
  );
}
