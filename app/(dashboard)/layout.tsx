"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutGrid,
  Truck,
  Building2,
  Leaf,
  Construction,
  Calculator,
  Receipt,
  Menu,
  ChevronLeft,
  ChevronDown,
  UserRound,
  ChevronRight,
  UserCircle,
  LogOut,
  Tractor,
  ShoppingCart,
  House,
  UsersRound,
} from "lucide-react";

import { ToastProvider } from "@/components/ui/toast-context";
import ReminderChecker from "@/components/reminder/ReminderChecker";
import NotificationBell from "@/components/reminder/NotificationBell";
import HutangBell from "@/components/reminder/HutangBell";
import UnifiedBell from "@/components/reminder/UnifiedBell";

interface DashboardLayoutProps {
  children: ReactNode;
}

type UserRole =
  | "ADMIN"
  | "CEO"
  | "ALAT BERAT"
  | "ARMADA"
  | "KEBUN"
  | "PROYEK"
  | "PAYROLL"
  | "ACCOUNTING"
  | "PURCHASING"
  | "PAJAK";

interface NavChild {
  label: string;
  href: string;
}

interface NavSection {
  title: string;
  children: NavChild[];
}

interface NavigationItem {
  label: string;
  icon: ReactNode;
  roles: UserRole[];
  sections?: NavSection[];
}

/* ================= USER ROLE ================= */

const currentUserRole: UserRole = "ADMIN";

/* ================= NAVIGATION ERP ================= */

const navigation: NavigationItem[] = [
  {
    label: "CEO",
    icon: <House className="w-4 h-4" />,
    roles: ["ADMIN", "ACCOUNTING"],
    sections: [
      {
        title: "Kesehatan Keuangan",
        children: [
          {
            label: "Health Dashboard",
            href: "/ceo/health",
          },
          { label: "Analisa", href: "/ceo/analytics" },
        ],
      },
    ],
  },

  {
    label: "Armada",
    icon: <Truck className="w-4 h-4" />,
    roles: ["ADMIN", "ARMADA"],
    sections: [
      {
        title: "Dashboard",
        children: [{ label: "Dashboard Armada", href: "/transaksi/armada" }],
      },
      {
        title: "Transaksi",
        children: [
          { label: "Form Armada", href: "/transaksi/armada/form" },
          { label: "Kas Armada", href: "/transaksi/kas-armada" },
          { label: "Form Kas Armada", href: "/transaksi/kas-armada/form" },
        ],
      },
    ],
  },

  {
    label: "Payroll",
    icon: <UserRound className="w-4 h-4" />,
    roles: ["ADMIN", "ACCOUNTING"],
    sections: [
      {
        title: "Payroll",
        children: [
          { label: "Data Payroll", href: "/payroll" },
          { label: "Tambah Payroll", href: "/payroll/form" },
        ],
      },
      {
        title: "Dashboard Gaji",
        children: [{ label: "Dashboard Gaji", href: "/payroll/dashboard" }],
      },
    ],
  },

  {
    label: "Kebun Sawit",
    icon: <Leaf className="w-4 h-4" />,
    roles: ["ADMIN", "KEBUN"],
    sections: [
      {
        title: "Master",
        children: [
          { label: "Master Kebun", href: "/kebun-sawit/master" },
          { label: "Estate", href: "/kebun-sawit/estate" },
          { label: "Division", href: "/kebun-sawit/divisions" },
          { label: "Block", href: "/kebun-sawit/blocks" },
          { label: "Employees", href: "/kebun-sawit/employees" },
        ],
      },
      {
        title: "Operasional",
        children: [
          { label: "Harvest", href: "/kebun-sawit/harvest" },
          { label: "Fertilization", href: "/kebun-sawit/fertilizations" },
          { label: "Pest Control", href: "/kebun-sawit/pest-controls" },
          { label: "Replanting", href: "/kebun-sawit/replantings" },
        ],
      },
      {
        title: "Inventory",
        children: [
          { label: "Items", href: "/kebun-sawit/inventory/items" },
          { label: "Inventory", href: "/kebun-sawit/inventory-transactions" },
          { label: "Work Premium", href: "/kebun-sawit/work-premiums" },
        ],
      },
    ],
  },

  {
    label: "Alat Berat",
    icon: <Tractor className="w-4 h-4" />,
    roles: ["ADMIN", "ALAT BERAT"],
    sections: [
      {
        title: "Dashboard",
        children: [{ label: "Dashboard Alat Berat", href: "/alat-berat" }],
      },
      {
        title: "Master",
        children: [
          { label: "Master Equipment", href: "/alat-berat/master" },
          { label: "Operator", href: "/alat-berat/operator" },
        ],
      },
      {
        title: "Operasional",
        children: [
          { label: "Operation", href: "/alat-berat/operation" },
          { label: "Mutation", href: "/alat-berat/mutation" },
          { label: "Breakdown", href: "/alat-berat/breakdown" },
        ],
      },
      {
        title: "Biaya Operasi",
        children: [
          { label: "Fuel", href: "/alat-berat/fuel" },
          { label: "Maintenance", href: "/alat-berat/maintenance" },
          { label: "Depreciation", href: "/alat-berat/depreciation" },
        ],
      },
      {
        title: "Revenue",
        children: [{ label: "Rental", href: "/alat-berat/rental" }],
      },
    ],
  },

  {
    label: "Purchasing",
    icon: <ShoppingCart className="w-4 h-4" />,
    roles: ["ADMIN", "PURCHASING"],
    sections: [
      {
        title: "Dashboard",
        children: [{ label: "Dashboard Purchasing", href: "/purchasing" }],
      },
      {
        title: "Transaksi",
        children: [
          { label: "Purchase Orders", href: "/purchasing/orders" },
          { label: "Goods Receipts", href: "/purchasing/receipts" },
          { label: "Vendor Payments", href: "/purchasing/payments" },
        ],
      },
    ],
  },

  {
    label: "Proyek",
    icon: <Construction className="w-4 h-4" />,
    roles: ["ADMIN", "PROYEK"],
    sections: [
      {
        title: "Master",
        children: [{ label: "Master Proyek", href: "/proyek" }],
      },
      {
        title: "Operasional",
        children: [
          { label: "RAB", href: "/proyek/rab" },
          { label: "RAP", href: "/proyek/rap" },
          { label: "Progress", href: "/proyek/progress" },
          { label: "Alat Berat", href: "/proyek/alat-berat" },
          { label: "Material", href: "/proyek/material" },
          { label: "Tenaga Kerja", href: "/proyek/tenaga-kerja" },
        ],
      },
      {
        title: "Keuangan",
        children: [
          { label: "Tagihan", href: "/proyek/tagihan" },
          { label: "Penerimaan", href: "/proyek/penerimaan" },
          { label: "Hutang", href: "/proyek/hutang" },
          { label: "Piutang", href: "/proyek/piutang-non-proyek" },
          { label: "Piutang", href: "/proyek/piutang" },
        ],
      },
      {
        title: "Profit",
        children: [{ label: "Profit Global", href: "/proyek/profit" }],
      },
    ],
  },

  {
    label: "Vendor",
    icon: <Building2 className="w-4 h-4" />,
    roles: ["ADMIN", "ACCOUNTING", "PAJAK"],
    sections: [
      {
        title: "Master Vendor",
        children: [
          { label: "Daftar Vendor", href: "/vendors" },
          { label: "Tambah Vendor", href: "/vendors/form" },
        ],
      },
    ],
  },

  {
    label: "CRM",
    icon: <UsersRound className="w-4 h-4" />,
    roles: ["ADMIN", "ACCOUNTING", "PROYEK", "PURCHASING"],
    sections: [
      {
        title: "Customer",
        children: [
          { label: "Customer List", href: "/crm/customer" },
          { label: "Tambah Customer", href: "/crm/customer/form" },
        ],
      },
      {
        title: "Lead",
        children: [
          { label: "Lead List", href: "/crm/lead" },
          { label: "Tambah Lead", href: "/crm/lead/form" },
        ],
      },
      {
        title: "Deal",
        children: [
          { label: "Deal List", href: "/crm/deal" },
          { label: "Tambah Deal", href: "/crm/deal/form" },
        ],
      },
      {
        title: "Activity",
        children: [
          { label: "Activity List", href: "/crm/activity" },
          { label: "Tambah Activity", href: "/crm/activity/form" },
        ],
      },
    ],
  },

  {
    label: "Accounting",
    icon: <Calculator className="w-4 h-4" />,
    roles: ["ADMIN", "ACCOUNTING"],
    sections: [
      {
        title: "Dashboard",
        children: [
          { label: "Master Jurnal", href: "/accounting/jurnal" },
          { label: "Master Aset", href: "/accounting/aset" },
          { label: "Master Administrasi", href: "/accounting/administrasi" },
        ],
      },
      {
        title: "Tagihan",
        children: [
          { label: "Hutang", href: "/accounting/hutang" },
          { label: "Invoice", href: "/accounting/invoice" },
          { label: "Piutang Internal", href: "/accounting/piutang-internal" },
          { label: "Hutang Leasing", href: "/accounting/hutang-leasing" },
        ],
      },
      {
        title: "Biaya",
        children: [
          { label: "Kas Masuk", href: "/accounting/kas-masuk" },
          { label: "Kas Keluar", href: "/accounting/kas-keluar" },
          { label: "Kasbon Direksi", href: "/accounting/kasbon-direksi" },
          { label: "Kasbon Pribadi", href: "/accounting/kasbon-pribadi" },
        ],
      },
      {
        title: "Pendapatan",
        children: [
          { label: "Pendapatan", href: "/accounting/pendapatan" },
          { label: "Pembayaran Hutang", href: "/accounting/pembayaran-hutang" },
          {
            label: "Pembayaran Invoice",
            href: "/accounting/pembayaran-invoice",
          },
        ],
      },
      {
        title: "Pegawai",
        children: [{ label: "Pegawai", href: "/accounting/pegawai" }],
      },
      {
        title: "Jurnal",
        children: [
          { label: "Jurnal Penutup", href: "/accounting/jurnal-penutup" },
          {
            label: "Jurnal Penyesuaian",
            href: "/accounting/jurnal-penyesuaian",
          },
          {
            label: "Jurnal Koreksi",
            href: "/accounting/jurnal-koreksi",
          },
        ],
      },
      {
        title: "Bank",
        children: [
          { label: "Rekening Koran", href: "/accounting/rekening-koran" },
          { label: "Pinjaman Non Bank", href: "/accounting/pinjaman-non-bank" },
        ],
      },
      {
        title: "Laporan Keuangan",
        children: [
          { label: "Report", href: "/accounting/report" },
          { label: "Tutup Buku", href: "/laporan/tutup-buku" },
        ],
      },
    ],
  },

  {
    label: "Pajak",
    icon: <Receipt className="w-4 h-4" />,
    roles: ["ADMIN", "PAJAK"],
    sections: [
      {
        title: "Transaksi Pajak",
        children: [
          { label: "PPH21", href: "/pajak/pph21" },
          { label: "PPH23", href: "/pajak/pph23" },
          { label: "PPH4", href: "/pajak/pph4" },
          { label: "PPH25", href: "/pajak/pph25" },
          { label: "PPN", href: "/pajak/ppn" },
        ],
      },
    ],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <ToastProvider>
      <ReminderChecker />
      <div className="flex min-h-screen bg-gray-100">
        <aside
          className={`${
            collapsed ? "w-20" : "w-72"
          } bg-slate-900 text-white flex flex-col transition-all`}
        >
          <div className="p-4 border-b border-slate-700 flex justify-between">
            {!collapsed && (
              <div className="flex gap-2 font-bold">
                <LayoutGrid className="w-5 h-5" />
                ERP System
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hover:bg-slate-800 p-1 rounded"
            >
              {collapsed ? (
                <Menu className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {navigation
              .filter((n) => n.roles.includes(currentUserRole))
              .map((menu) => {
                const isOpen = openMenu === menu.label;

                return (
                  <div key={menu.label}>
                    <button
                      onClick={() => setOpenMenu(isOpen ? null : menu.label)}
                      className="w-full flex justify-between items-center px-3 py-2 rounded hover:bg-slate-800"
                    >
                      <div className="flex gap-3 items-center">
                        {menu.icon}
                        {!collapsed && menu.label}
                      </div>

                      {!collapsed &&
                        (isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        ))}
                    </button>

                    {!collapsed && isOpen && (
                      <div className="ml-6 mt-2 space-y-3">
                        {menu.sections?.map((section) => (
                          <div key={section.title}>
                            <div className="text-xs text-slate-400 uppercase mb-1">
                              {section.title}
                            </div>

                            {section.children.map((child) => {
                              const active = pathname.startsWith(child.href);

                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`block px-2 py-1 rounded ${
                                    active
                                      ? "bg-blue-600 text-white"
                                      : "text-slate-300 hover:bg-slate-800"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          {!collapsed && (
            <div className="p-4 border-t border-slate-700 text-xs text-center text-slate-400">
              © ERP System Haemes Mandiri Sejahterabanta{" "}
              {new Date().getFullYear()}
            </div>
          )}
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-white border-b flex justify-between items-center px-6">
            <div className="text-lg font-semibold">Dashboard</div>

            <div className="flex gap-4 items-center">
              <HutangBell />
              <UnifiedBell />
              <NotificationBell />
              <div className="flex gap-2 items-center text-sm">
                <UserCircle className="w-5 h-5" />
                {currentUserRole}
              </div>

              <button className="flex gap-1 text-red-500">
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
