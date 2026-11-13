"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, ListTodo, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters for your name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type RegisterValues = z.infer<typeof registerSchema>;
type LoginValues = z.infer<typeof loginSchema>;

export default function AuthForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: RegisterValues | LoginValues) {
    setServerError("");
    setBusy(true);
    try {
      if (isRegister) {
        await api("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
      } else {
        await api("/api/auth/login", { method: "POST", body: JSON.stringify(values) });
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const errors = isRegister
    ? (registerForm.formState.errors as Record<string, { message?: string } | undefined>)
    : (loginForm.formState.errors as Record<string, { message?: string } | undefined>);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-3 text-white"><ListTodo size={25} /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Task Manager</h1>
            <p className="text-sm text-slate-500">Stay focused. Get things done.</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold">{isRegister ? "Create your account" : "Welcome back"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isRegister ? "Enter your details to get started." : "Log in to continue to your tasks."}
        </p>

        {serverError && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        {isRegister ? (
          <form className="mt-6 space-y-4" onSubmit={registerForm.handleSubmit(submit)}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="name">Full name</label>
              <input id="name" autoComplete="name" {...registerForm.register("name")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Your name" />
              {errors.name?.message && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" {...registerForm.register("email")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="you@example.com" />
              {errors.email?.message && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" {...registerForm.register("password")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-12 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="At least 8 characters" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
              {errors.password?.message && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <LoaderCircle className="animate-spin" size={18} />}{busy ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={loginForm.handleSubmit(submit)}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" {...loginForm.register("email")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="you@example.com" />
              {errors.email?.message && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" {...loginForm.register("password")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-12 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Your password" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
              {errors.password?.message && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <LoaderCircle className="animate-spin" size={18} />}{busy ? "Logging in..." : "Log in"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          {isRegister ? "Already have an account? " : "New to Task Manager? "}
          <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create an account"}</Link>
        </p>
      </section>
    </main>
  );
}
