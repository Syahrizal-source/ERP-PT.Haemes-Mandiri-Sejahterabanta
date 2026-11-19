"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        setMessage(result.message ?? "Login gagal");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Tidak dapat terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-background-glow auth-background-glow-one" />
      <div className="auth-background-glow auth-background-glow-two" />

      <div className="auth-layout">
        <section className="auth-intro">
          <div className="auth-brand-mark">
            <LockKeyhole className="h-7 w-7" />
          </div>

          <p className="auth-eyebrow">ENTERPRISE RESOURCE PLANNING</p>
          <h1 className="auth-intro-title">
            Kelola bisnis dalam satu sistem yang terintegrasi.
          </h1>
          <p className="auth-intro-description">
            Akses dashboard ERP untuk memantau aktivitas dan informasi
            perusahaan melalui satu platform.
          </p>

          <div className="auth-intro-footer">
            <span className="auth-status-dot" />
            Sistem ERP HAEMES
          </div>
        </section>

        <section className="auth-card">
          <div className="mb-8">
            <div className="auth-mobile-brand">
              <div className="auth-mobile-brand-icon">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <span>ERP HAEMES</span>
            </div>

            <p className="auth-form-eyebrow">SELAMAT DATANG KEMBALI</p>
            <h2 className="auth-form-title">Login ke akun Anda</h2>
            <p className="auth-form-description">
              Masukkan email dan password untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="auth-label">
                Email
              </label>

              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="auth-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="auth-label">
                Password
              </label>

              <div className="auth-input-wrap">
                <LockKeyhole className="auth-input-icon" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  className="auth-input"
                />
              </div>
            </div>

            {message && (
              <div role="alert" className="auth-message-error">
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="auth-card-divider">
            <span>ERP HAEMES</span>
          </div>

          <p className="auth-footer-text">
            ERP PT Haemes Mandiri Sejahterabanta
          </p>
        </section>
      </div>
    </main>
  );
}
