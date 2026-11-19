"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { ArrowLeft, ChevronDown, Plus, Search, Trash2 } from "lucide-react";

import Card from "@/components/ui/Card";

import Button from "@/components/ui/Button";

interface Coa {
  id_coa: number;

  kode: string;

  nama: string;
}

interface DetailInput {
  id_coa: number | null;

  debit: number;

  kredit: number;
}

interface Periode {
  id_periode: number;

  status: "OPEN" | "CLOSED";
}

interface ApiErrorResponse {
  message?: string;

  error?: string;

  issues?: unknown;
}

interface ZodIssue {
  code?: string;

  path?: Array<string | number>;

  message?: string;
}

interface SearchableCoaSelectProps {
  options: Coa[];

  value: number | null;

  onChange: (value: number | null) => void;
}

function SearchableCoaSelect({
  options,

  value,

  onChange,
}: SearchableCoaSelectProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [search, setSearch] = useState<string>("");

  const selectedCoa = options.find((coa) => coa.id_coa === value);

  const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");

  const filteredOptions = options.filter((coa) => {
    const searchableText = `${coa.kode} ${coa.nama}`.toLocaleLowerCase("id-ID");

    return searchableText.includes(normalizedSearch);
  });

  function selectCoa(coaId: number): void {
    onChange(coaId);

    setSearch("");

    setIsOpen(false);
  }

  function closeDropdown(): void {
    setIsOpen(false);

    setSearch("");
  }

  return (
    <div className="relative col-span-6 min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);

          setSearch("");
        }}
        className="flex w-full items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-left text-sm text-gray-800 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <span className="min-w-0 truncate">
          {selectedCoa
            ? `${selectedCoa.kode} - ${selectedCoa.nama}`
            : "Pilih COA"}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[260px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-gray-300 px-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />

              <input
                type="text"
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closeDropdown();
                  }

                  if (event.key === "Enter" && filteredOptions.length > 0) {
                    event.preventDefault();

                    selectCoa(filteredOptions[0].id_coa);
                  }
                }}
                placeholder="Ketik kode atau nama COA..."
                aria-label="Cari COA berdasarkan kode atau nama"
                className="w-full border-0 bg-transparent py-2 text-sm text-gray-800 outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div role="listbox" className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((coa) => (
                <button
                  key={coa.id_coa}
                  type="button"
                  role="option"
                  aria-selected={value === coa.id_coa}
                  onClick={() => selectCoa(coa.id_coa)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                    value === coa.id_coa
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  <span className="block font-medium">{coa.kode}</span>

                  <span className="block break-words text-xs text-gray-500">
                    {coa.nama}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm text-gray-500">
                COA tidak ditemukan.
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
            {filteredOptions.length} dari {options.length} COA
          </div>
        </div>
      )}
    </div>
  );
}

export default function JurnalFormPage() {
  const router = useRouter();

  const [tanggal, setTanggal] = useState<string>("");

  const [noBukti, setNoBukti] = useState<string>("");

  const [keterangan, setKeterangan] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);

  const [activePeriodeId, setActivePeriodeId] = useState<number>(0);

  const [coaList, setCoaList] = useState<Coa[]>([]);

  const [details, setDetails] = useState<DetailInput[]>([
    {
      id_coa: null,

      debit: 0,

      kredit: 0,
    },

    {
      id_coa: null,

      debit: 0,

      kredit: 0,
    },
  ]);

  async function fetchCoa(): Promise<void> {
    const res = await fetch("/api/coa");

    if (!res.ok) {
      throw new Error("Gagal mengambil daftar COA.");
    }

    const data: Coa[] = await res.json();

    setCoaList(data);
  }

  async function generateNoBukti(tanggalJurnal: string): Promise<void> {
    if (!tanggalJurnal) {
      setNoBukti("");

      return;
    }

    const res = await fetch(
      `/api/jurnal/next-number?tanggal=${encodeURIComponent(tanggalJurnal)}`,

      { cache: "no-store" },
    );

    const data: {
      next_number?: string;

      message?: string;
    } = await res.json();

    if (!res.ok || !data.next_number) {
      setNoBukti("");

      throw new Error(data.message ?? "Gagal membuat nomor bukti jurnal.");
    }

    setNoBukti(data.next_number);
  }

  async function handleTanggalChange(value: string): Promise<void> {
    setTanggal(value);

    setNoBukti("");

    try {
      await generateNoBukti(value);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal membuat nomor bukti jurnal.";

      await Swal.fire({
        icon: "warning",

        title: "Nomor Bukti Belum Tersedia",

        text: message,

        confirmButtonText: "OK",
      });
    }
  }

  async function fetchActivePeriode(): Promise<void> {
    const res = await fetch("/api/periode");

    if (!res.ok) {
      throw new Error("Gagal mengambil periode akuntansi.");
    }

    const result: Periode[] = await res.json();

    const openPeriode = result.find((item) => item.status === "OPEN");

    if (openPeriode) {
      setActivePeriodeId(openPeriode.id_periode);

      return;
    }

    throw new Error("Tidak ada periode akuntansi yang sedang OPEN.");
  }

  useEffect(() => {
    async function initialize(): Promise<void> {
      try {
        await Promise.all([fetchCoa(), fetchActivePeriode()]);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Gagal memuat form jurnal.";

        await Swal.fire({
          icon: "error",

          title: "Gagal Memuat Form",

          text: message,

          confirmButtonText: "OK",
        });
      }
    }

    void initialize();
  }, []);

  function updateDetail(
    index: number,

    field: keyof DetailInput,

    value: number | null,
  ): void {
    setDetails((currentDetails) => {
      const newDetails = [...currentDetails];

      newDetails[index] = {
        ...newDetails[index],

        [field]: value,
      };

      return newDetails;
    });
  }

  function addRow(): void {
    setDetails((currentDetails) => [
      ...currentDetails,

      {
        id_coa: null,

        debit: 0,

        kredit: 0,
      },
    ]);
  }

  function removeRow(index: number): void {
    if (details.length <= 2) {
      void Swal.fire({
        icon: "info",

        title: "Baris Tidak Dapat Dihapus",

        text: "Jurnal umum minimal memiliki 2 baris detail.",

        confirmButtonText: "OK",
      });

      return;
    }

    setDetails((currentDetails) =>
      currentDetails.filter((_, i) => i !== index),
    );
  }

  function totalDebit(): number {
    return details.reduce((sum, detail) => sum + detail.debit, 0);
  }

  function totalKredit(): number {
    return details.reduce((sum, detail) => sum + detail.kredit, 0);
  }

  function formatRupiah(value: number): string {
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: 0,

      maximumFractionDigits: 2,
    });
  }

  function getCoaLabel(idCoa: number | null): string {
    if (idCoa === null) {
      return "COA belum dipilih";
    }

    const coa = coaList.find((item) => item.id_coa === idCoa);

    if (!coa) {
      return `COA ID ${idCoa}`;
    }

    return `${coa.kode} - ${coa.nama}`;
  }

  function showValidationError(message: string): void {
    void Swal.fire({
      icon: "warning",

      title: "Data Jurnal Belum Lengkap",

      text: message,

      confirmButtonText: "Periksa Data",
    });
  }

  function parseApiIssues(value: unknown): string | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const issues = value as ZodIssue[];

    const messages = issues

      .map((issue) => {
        const path = issue.path ?? [];

        const message = issue.message?.trim();

        if (!message) {
          return null;
        }

        if (path.includes("tanggal")) {
          return "Tanggal jurnal wajib diisi dengan format tanggal yang benar.";
        }

        if (path.includes("no_bukti")) {
          return "Nomor bukti jurnal wajib diisi.";
        }

        if (path.includes("keterangan")) {
          return "Keterangan jurnal wajib diisi.";
        }

        if (path.includes("details")) {
          return `Detail jurnal tidak valid: ${message}`;
        }

        return message;
      })

      .filter((message): message is string => message !== null);

    if (messages.length === 0) {
      return null;
    }

    return [...new Set(messages)].join("\n");
  }

  async function readApiError(res: Response): Promise<string> {
    try {
      const result: ApiErrorResponse = await res.json();

      const issueMessage = parseApiIssues(result.issues);

      if (issueMessage) {
        return issueMessage;
      }

      if (typeof result.message === "string") {
        const trimmedMessage = result.message.trim();

        /*

         * Beberapa endpoint lama mengembalikan

         * error Zod sebagai JSON string.

         * Kita coba parse supaya tidak tampil mentah.

         */

        if (trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]")) {
          try {
            const parsed: unknown = JSON.parse(trimmedMessage);

            const parsedMessage = parseApiIssues(parsed);

            if (parsedMessage) {
              return parsedMessage;
            }
          } catch {
            // Abaikan dan gunakan message asli.
          }
        }

        if (trimmedMessage.length > 0) {
          return trimmedMessage;
        }
      }

      if (typeof result.error === "string") {
        const trimmedError = result.error.trim();

        if (trimmedError.length > 0) {
          return trimmedError;
        }
      }

      return "Gagal menyimpan jurnal.";
    } catch {
      return "Gagal menyimpan jurnal. Silakan coba lagi.";
    }
  }

  function validateForm(): string | null {
    if (!tanggal.trim()) {
      return "Tanggal jurnal wajib diisi.";
    }

    /*

     * Validasi HTML date menghasilkan YYYY-MM-DD.

     * Panjang minimal 10 mengikuti validator backend.

     */

    if (tanggal.length < 10) {
      return "Tanggal jurnal tidak valid.";
    }

    if (!noBukti.trim()) {
      return "Nomor bukti jurnal belum tersedia.";
    }

    if (!keterangan.trim()) {
      return "Keterangan jurnal wajib diisi.";
    }

    if (activePeriodeId <= 0) {
      return "Periode akuntansi OPEN belum tersedia.";
    }

    if (details.length < 2) {
      return "Jurnal minimal memiliki 2 baris detail.";
    }

    for (let index = 0; index < details.length; index += 1) {
      const detail = details[index];

      const rowNumber = index + 1;

      if (detail.id_coa === null) {
        return `COA pada baris ${rowNumber} wajib dipilih.`;
      }

      if (!Number.isInteger(detail.id_coa) || detail.id_coa <= 0) {
        return `COA pada baris ${rowNumber} tidak valid.`;
      }

      if (!Number.isFinite(detail.debit) || detail.debit < 0) {
        return `Nilai debit pada baris ${rowNumber} tidak valid.`;
      }

      if (!Number.isFinite(detail.kredit) || detail.kredit < 0) {
        return `Nilai kredit pada baris ${rowNumber} tidak valid.`;
      }

      if (detail.debit > 0 && detail.kredit > 0) {
        return `Baris ${rowNumber} tidak boleh memiliki Debit dan Kredit sekaligus. Pilih salah satu.`;
      }

      if (detail.debit === 0 && detail.kredit === 0) {
        return `Baris ${rowNumber} belum memiliki nilai Debit atau Kredit.`;
      }

      const coa = coaList.find((item) => item.id_coa === detail.id_coa);

      if (!coa) {
        return `COA pada baris ${rowNumber} tidak ditemukan.`;
      }
    }

    const debit = totalDebit();

    const kredit = totalKredit();

    if (debit <= 0 && kredit <= 0) {
      return "Jurnal belum memiliki nilai transaksi.";
    }

    if (Math.abs(debit - kredit) > 0.01) {
      return (
        `Jurnal belum balance.\n` +
        `Debit: Rp ${formatRupiah(debit)}\n` +
        `Kredit: Rp ${formatRupiah(kredit)}`
      );
    }

    return null;
  }

  async function handleSubmit(): Promise<void> {
    if (loading) {
      return;
    }

    const validationMessage = validateForm();

    if (validationMessage) {
      showValidationError(validationMessage);

      return;
    }

    const confirmResult = await Swal.fire({
      icon: "question",

      title: "Simpan Jurnal?",

      html: `

        <div style="text-align:left">

          <div><strong>No Bukti:</strong> ${noBukti}</div>

          <div><strong>Tanggal:</strong> ${tanggal}</div>

          <div><strong>Debit:</strong> Rp ${formatRupiah(totalDebit())}</div>

          <div><strong>Kredit:</strong> Rp ${formatRupiah(totalKredit())}</div>

        </div>

      `,

      showCancelButton: true,

      confirmButtonText: "Ya, Simpan",

      cancelButtonText: "Batal",

      reverseButtons: true,
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        tanggal,

        no_bukti: noBukti.trim(),

        keterangan: keterangan.trim(),

        sumber: "UMUM",

        id_periode: activePeriodeId,

        is_posted: true,

        details: details.map((detail) => ({
          id_coa: Number(detail.id_coa),

          debit: detail.debit,

          kredit: detail.kredit,
        })),
      };

      const res = await fetch("/api/jurnal", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await readApiError(res);

        await Swal.fire({
          icon: "error",

          title: "Jurnal Gagal Disimpan",

          text: message,

          confirmButtonText: "OK",
        });

        return;
      }

      await Swal.fire({
        icon: "success",

        title: "Jurnal Berhasil Disimpan",

        html: `

          <div style="text-align:center">

            <div>Jurnal umum berhasil diposting.</div>

            <div style="margin-top:8px">

              <strong>No Bukti: ${noBukti}</strong>

            </div>

          </div>

        `,

        confirmButtonText: "OK",
      });

      router.push("/accounting/jurnal");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan jurnal.";

      await Swal.fire({
        icon: "error",

        title: "Terjadi Kesalahan",

        text: message,

        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Card title="Tambah Jurnal Umum">
        {/* HEADER */}

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tanggal" className="text-sm font-medium">
              Tanggal
            </label>

            <input
              id="tanggal"
              type="date"
              className="w-full rounded border px-3 py-2"
              value={tanggal}
              onChange={(e) => void handleTanggalChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="no-bukti" className="text-sm font-medium">
              No Bukti
            </label>

            <input
              id="no-bukti"
              type="text"
              readOnly
              className="w-full rounded border bg-gray-100 px-3 py-2"
              value={noBukti}
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="keterangan" className="text-sm font-medium">
              Keterangan
            </label>

            <input
              id="keterangan"
              type="text"
              className="w-full rounded border px-3 py-2"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Masukkan keterangan jurnal"
            />
          </div>
        </div>

        {/* DETAIL */}

        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-12 gap-2 text-sm font-semibold">
            <div className="col-span-6">COA</div>

            <div className="col-span-2 text-right">Debit</div>

            <div className="col-span-2 text-right">Kredit</div>

            <div className="col-span-2 text-center">Aksi</div>
          </div>

          {details.map((row, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              {/* COA */}

              <SearchableCoaSelect
                options={coaList}
                value={row.id_coa}
                onChange={(value) => updateDetail(index, "id_coa", value)}
              />

              {/* DEBIT */}

              <input
                type="number"
                min="0"
                step="0.01"
                className="col-span-2 rounded border px-2 py-2 text-right"
                value={row.debit}
                onChange={(e) =>
                  updateDetail(index, "debit", Number(e.target.value) || 0)
                }
              />

              {/* KREDIT */}

              <input
                type="number"
                min="0"
                step="0.01"
                className="col-span-2 rounded border px-2 py-2 text-right"
                value={row.kredit}
                onChange={(e) =>
                  updateDetail(index, "kredit", Number(e.target.value) || 0)
                }
              />

              {/* DELETE */}

              <button
                type="button"
                onClick={() => removeRow(index)}
                className="col-span-2 flex items-center justify-center text-red-500 hover:text-red-700"
                title={`Hapus baris ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* TOTAL */}

        <div className="mb-6 flex justify-end gap-6 text-sm font-semibold">
          <div>Debit: Rp {formatRupiah(totalDebit())}</div>

          <div>Kredit: Rp {formatRupiah(totalKredit())}</div>
        </div>

        {/* BALANCE STATUS */}

        <div className="mb-6 rounded border px-4 py-3 text-sm">
          {Math.abs(totalDebit() - totalKredit()) <= 0.01 ? (
            <div className="font-medium text-green-600">
              ✓ Debit dan Kredit sudah balance.
            </div>
          ) : (
            <div className="font-medium text-red-600">
              ✕ Jurnal belum balance.
              <div className="mt-1 font-normal">
                Selisih: Rp{" "}
                {formatRupiah(Math.abs(totalDebit() - totalKredit()))}
              </div>
            </div>
          )}
        </div>

        {/* ACTION */}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push("/accounting/jurnal")}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>

          <Button onClick={addRow} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Baris
          </Button>

          <Button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan Jurnal"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
