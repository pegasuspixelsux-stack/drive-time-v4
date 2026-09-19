"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { login, friendlyAuthError } from "@/lib/auth";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "El correo electrónico es obligatorio";
    if (!password.trim()) nextErrors.password = "La contraseña es obligatoria";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (error) {
      setErrors({ password: friendlyAuthError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      <Image
        src="https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=2400&q=80"
        alt="A luxury performance sedan in low, dramatic studio light"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/50 lg:hidden" />
      <div className="absolute inset-y-0 left-0 hidden w-1/2 bg-black/30 lg:block" />
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-background/50 lg:block" />

      <div className="relative z-10 hidden w-1/2 flex-col justify-between p-12 lg:flex">
        <motion.span
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="glass w-fit rounded-full px-4 py-1.5 text-[0.8rem] font-medium text-foreground"
        >
          Plataforma de Ventas
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
          className="text-6xl font-semibold tracking-tight text-foreground"
        >
          DriveTime
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[0.85rem] text-muted-2"
        >
          DriveTime v1.0
        </motion.p>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center p-6 lg:w-1/2 lg:bg-surface/40 lg:backdrop-blur-2xl">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          <motion.div variants={fadeUp} className="mb-8 text-center lg:text-left">
            <p className="text-[1.2rem] font-semibold tracking-tight text-foreground">
              DriveTime
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">
              Inicia sesión en tu cuenta
            </h2>
            <p className="mt-2 text-[0.9rem] text-muted">
              Ingresa tus credenciales para acceder al panel de administración.
            </p>
          </motion.div>

          <motion.form variants={fadeUp} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[0.8rem] font-medium text-muted">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@drivetime.com"
                className="h-12 w-full rounded-xl border border-border-strong bg-surface px-4 text-[0.9rem] text-foreground placeholder:text-muted-2 transition-colors duration-200 hover:border-foreground/30 focus-visible:border-foreground/50 focus-visible:outline-none"
              />
              {errors.email && <p className="text-[0.78rem] text-red-400">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[0.8rem] font-medium text-muted">Contraseña</label>
                <Link
                  href="#"
                  className="text-[0.78rem] text-muted underline decoration-border-strong underline-offset-4 hover:text-foreground"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-border-strong bg-surface px-4 text-[0.9rem] text-foreground placeholder:text-muted-2 transition-colors duration-200 hover:border-foreground/30 focus-visible:border-foreground/50 focus-visible:outline-none"
              />
              {errors.password && <p className="text-[0.78rem] text-red-400">{errors.password}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-2 flex h-12 items-center justify-center rounded-xl bg-foreground text-[0.9rem] font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
            </motion.button>
          </motion.form>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <Link
              href="/"
              className="text-[0.85rem] font-medium text-muted underline decoration-border-strong underline-offset-4 hover:text-foreground"
            >
              Volver al sitio
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
