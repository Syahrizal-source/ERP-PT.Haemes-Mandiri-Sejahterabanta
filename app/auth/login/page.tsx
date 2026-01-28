"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter(); // ✅ WAJIB

  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =======================
     HANDLERS
  ======================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Login gagal");
      }

      setMessage("Login berhasil, redirecting...");
      router.push("/armada/dashboard"); // ✅ SEKARANG JALAN
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 text-white">
        <h1 className="text-2xl font-semibold text-center mb-1">
          Welcome Back
        </h1>
        <p className="text-sm text-center text-white/60 mb-6">
          Login untuk melanjutkan
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <div>
            <label className="text-sm text-white/70">Password</label>
            <div className="relative mt-1">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 pr-12 outline-none focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 transition py-3 font-medium disabled:opacity-50"
          >
            {loading ? "Processing..." : "Login"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-indigo-300">{message}</p>
        )}
      </div>
    </div>
  );
}

/* =======================
   REUSABLE INPUT
======================= */
type FormInputProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
}: FormInputProps) {
  return (
    <div>
      <label className="text-sm text-white/70">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required
        className="mt-1 w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400"
      />
    </div>
  );
}
