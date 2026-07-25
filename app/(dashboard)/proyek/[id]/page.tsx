"use client";

import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  FileText,
  Truck,
  Users,
  Package,
  Activity,
  Receipt,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  FolderKanban,
  Notebook,
} from "lucide-react";

type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  category: "operasional" | "keuangan";
};

export default function DetailProyekPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const menus: MenuItem[] = [
    {
      label: "RAB VS RAP",
      path: `/proyek/${id}/rab-vs-rap`,
      icon: <Receipt className="w-4 h-4" />,
      category: "keuangan",
    },
    {
      label: "RAP",
      path: `/proyek/${id}/rap`,
      icon: <FolderKanban className="w-4 h-4" />,
      category: "operasional",
    },
    {
      label: "RAB",
      path: `/proyek/${id}/rab`,
      icon: <FileText className="w-4 h-4" />,
      category: "operasional",
    },
    {
      label: "Alat Berat",
      path: `/proyek/${id}/alat-berat`,
      icon: <Truck className="w-4 h-4" />,
      category: "operasional",
    },
    {
      label: "Tenaga Kerja",
      path: `/proyek/${id}/tenaga-kerja`,
      icon: <Users className="w-4 h-4" />,
      category: "operasional",
    },
    {
      label: "Material",
      path: `/proyek/${id}/material`,
      icon: <Package className="w-4 h-4" />,
      category: "operasional",
    },
    {
      label: "Progress",
      path: `/proyek/${id}/progress`,
      icon: <Activity className="w-4 h-4" />,
      category: "operasional",
    },

    {
      label: "Tagihan",
      path: `/proyek/${id}/tagihan`,
      icon: <Receipt className="w-4 h-4" />,
      category: "keuangan",
    },
    {
      label: "Penerimaan",
      path: `/proyek/${id}/penerimaan`,
      icon: <ArrowDownCircle className="w-4 h-4" />,
      category: "keuangan",
    },
    {
      label: "Hutang",
      path: `/proyek/${id}/hutang`,
      icon: <Wallet className="w-4 h-4" />,
      category: "keuangan",
    },
    {
      label: "Piutang Non Proyek",
      path: `/proyek/${id}/piutang-non-proyek`,
      icon: <ArrowUpCircle className="w-4 h-4" />,
      category: "keuangan",
    },
    {
      label: "Piutang ",
      path: `/proyek/${id}/piutang`,
      icon: <Notebook className="w-4 h-4" />,
      category: "keuangan",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <Card title="Detail Proyek">
        {/* ================= BUTTON MENU ================= */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {menus.map((menu) => {
            const colorClass =
              menu.category === "operasional"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700";

            return (
              <button
                key={menu.label}
                onClick={() => router.push(menu.path)}
                className={`${colorClass} text-white px-4 py-3 rounded-lg flex items-center gap-2 justify-center text-sm font-medium transition`}
              >
                {menu.icon}
                {menu.label}
              </button>
            );
          })}
        </div>

        {/* ================= ACTION ================= */}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/proyek")}
            className="w-full sm:w-auto"
          >
            Kembali
          </Button>
        </div>
      </Card>
    </div>
  );
}
