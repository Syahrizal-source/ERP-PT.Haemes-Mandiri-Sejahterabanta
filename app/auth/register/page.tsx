"use client";

import { useState } from "react";
import { ROLES } from "@/components/constants/roles";
import type { Role } from "@/components/constants/roles";

type Strength = "weak" | "medium" | "strong";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  roleId: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    roleId: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =======================
     PASSWORD STRENGTH
  ======================= */
  const getPasswordStrength = (password: string): Strength => {
    if (
      password.length >= 10 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    ) {
      return "strong";
    }
    if (password.length >= 6) return "medium";
    return "weak";
  };

  const strength = getPasswordStrength(form.password);

  const strengthColor: Record<Strength, string> = {
    weak: "bg-red-500",
    medium: "bg-yellow-400",
    strong: "bg-emerald-500",
  };

  /* =======================
     HANDLERS
  ======================= */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.roleId) {
      setMessage("Divisi wajib dipilih");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role_id: form.roleId,
        }),
      });

      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Register gagal");
      }

      setMessage("Registrasi berhasil, menunggu approval admin");
      setForm({ name: "", email: "", password: "", roleId: "" });
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
          Create Account
        </h1>
        <p className="text-sm text-center text-white/60 mb-6">
          Register untuk mengakses sistem
        </p>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* NAME */}
          <FormInput
            label="Nama"
            name="name"
            value={form.name}
            onChange={handleChange}
          />

          {/* EMAIL */}
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          {/* ROLE */}
          <div>
            <label className="text-sm text-white/70">Divisi</label>
            <select
              name="roleId"
              value={form.roleId}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400"
            >
              <option value="">Pilih Divisi</option>
              {ROLES.map((role: Role) => (
                <option
                  key={role.role_id}
                  value={role.role_id}
                  className="text-black"
                >
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {/* PASSWORD */}
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

            <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${strengthColor[strength]}`}
                style={{
                  width:
                    strength === "weak"
                      ? "33%"
                      : strength === "medium"
                        ? "66%"
                        : "100%",
                }}
              />
            </div>

            <p className="mt-1 text-xs text-white/50 capitalize">
              Password strength: {strength}
            </p>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 transition py-3 font-medium disabled:opacity-50"
          >
            {loading ? "Processing..." : "Register"}
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
  value: string;
  type?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

function FormInput({
  label,
  name,
  value,
  type = "text",
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
