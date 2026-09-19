"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Target,
  Mail,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { logout, type CurrentUser } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventario", href: "/dashboard/inventory", icon: Car },
  { label: "Prospectos", href: "/dashboard/leads", icon: Target },
  { label: "Contacto", href: "/dashboard/contact", icon: Mail },
  { label: "Usuarios", href: "/dashboard/users", icon: Users },
];

export function Sidebar({ currentUser }: { currentUser: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials =
    currentUser.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-shrink-0 flex-col border-r border-slate-200 bg-white lg:w-64">
      <div className="flex h-16 items-center justify-center px-2 lg:justify-start lg:px-6">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-slate-900"
          title="DriveTime"
        >
          <span className="lg:hidden">DT</span>
          <span className="hidden lg:inline">DriveTime</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 lg:px-3">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="hidden lg:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-2 lg:p-4">
        <div className="flex items-center justify-center gap-3 rounded-xl px-2 py-2 lg:justify-start">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initials}
          </span>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium text-slate-900">{currentUser.name}</p>
            <p className="truncate text-xs text-slate-500">{currentUser.role}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1 lg:flex-row">
          <button
            type="button"
            aria-label="Configuración"
            title="Configuración"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center gap-2 rounded-lg text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:w-auto lg:flex-1"
          >
            <Settings size={16} />
            <span className="hidden lg:inline">Configuración</span>
          </button>
          <button
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={handleLogout}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center gap-2 rounded-lg text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 lg:w-auto lg:flex-1"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
