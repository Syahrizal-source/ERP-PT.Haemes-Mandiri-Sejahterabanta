"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Save,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import Swal from "sweetalert2";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { useToast } from "@/components/ui/toast-context";

import {
  jurnalKoreksiSchema,
  type JurnalKoreksiInput,
  type JurnalKoreksiLineInput,
} from "@/lib/validators/jurnal-koreksi";

/* =========================
   TYPES
========================= */

interface CoaItem {
  id_coa: number;
  kode: string;
  nama: string;
}

interface JurnalPostedItem {
  id_jurnal: number;
  no_bukti: string;
  keterangan: string;
}

/* =========================
   DEFAULT LINE
========================= */

const defaultLine: JurnalKoreksiLineInput =
{
  id_coa: 0,
  debit: 0,
  kredit: 0,
};

/* =========================
   PAGE
========================= */

export default function CreateJurnalKoreksiPage() {
  const router =
    useRouter();

  const { showToast } =
    useToast();

  const [
    loading,
    setLoading,
  ] = useState<boolean>(
    false,
  );

  const [
    coaList,
    setCoaList,
  ] = useState<CoaItem[]>(
    [],
  );

  const [
    jurnalList,
    setJurnalList,
  ] = useState<
    JurnalPostedItem[]
  >([]);

  const [form, setForm] =
    useState<JurnalKoreksiInput>(
      {
        tanggal: "",

        no_bukti: "",

        keterangan: "",

        alasan: "",

        id_jurnal_asal: 0,

        lines: [
          {
            ...defaultLine,
          },
        ],
      },
    );

  /* =========================
     FETCH COA
  ========================= */

  async function fetchCoa(): Promise<void> {
    try {
      const res =
        await fetch(
          "/api/coa",
        );

      if (!res.ok) {
        return;
      }

      const result:
        CoaItem[] =
        await res.json();

      setCoaList(result);
    } catch (
    error: unknown
    ) {
      console.error(
        "FETCH COA ERROR:",
        error,
      );
    }
  }

  /* =========================
     FETCH JURNAL
  ========================= */

  async function fetchJurnal(): Promise<void> {
    try {
      const res =
        await fetch(
          "/api/jurnal",
        );

      if (!res.ok) {
        return;
      }

      const result =
        (await res.json()) as {
          id_jurnal: number;
          no_bukti: string;
          keterangan: string;
          is_posted: boolean;
        }[];

      const posted =
        result.filter(
          (
            item,
          ): boolean =>
            item.is_posted ===
            true,
        );

      setJurnalList(
        posted.map(
          (
            item,
          ): JurnalPostedItem => ({
            id_jurnal:
              item.id_jurnal,

            no_bukti:
              item.no_bukti,

            keterangan:
              item.keterangan,
          }),
        ),
      );
    } catch (
    error: unknown
    ) {
      console.error(
        "FETCH JURNAL ERROR:",
        error,
      );
    }
  }

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    void fetchCoa();

    void fetchJurnal();
  }, []);

  /* =========================
     HEADER CHANGE
  ========================= */

  function handleChange<
    K extends keyof JurnalKoreksiInput,
  >(
    field: K,
    value: JurnalKoreksiInput[K],
  ): void {
    setForm(
      (
        prev,
      ): JurnalKoreksiInput => ({
        ...prev,
        [field]:
          value,
      }),
    );
  }

  /* =========================
     LINE CHANGE
  ========================= */

  function handleLineChange<
    K extends keyof JurnalKoreksiLineInput,
  >(
    index: number,
    field: K,
    value:
      JurnalKoreksiLineInput[K],
  ): void {
    const updated =
      [
        ...form.lines,
      ];

    updated[index] = {
      ...updated[index],
      [field]:
        value,
    };

    setForm(
      (
        prev,
      ): JurnalKoreksiInput => ({
        ...prev,
        lines:
          updated,
      }),
    );
  }

  /* =========================
     ADD LINE
  ========================= */

  function addLine(): void {
    setForm(
      (
        prev,
      ): JurnalKoreksiInput => ({
        ...prev,
        lines: [
          ...prev.lines,
          {
            ...defaultLine,
          },
        ],
      }),
    );
  }

  /* =========================
     REMOVE LINE
  ========================= */

  function removeLine(
    index: number,
  ): void {
    if (
      form.lines.length ===
      1
    ) {
      return;
    }

    const updated =
      form.lines.filter(
        (
          _,
          i,
        ): boolean =>
          i !== index,
      );

    setForm(
      (
        prev,
      ): JurnalKoreksiInput => ({
        ...prev,
        lines:
          updated,
      }),
    );
  }

  /* =========================
     TOTAL
  ========================= */

  const totalDebit =
    form.lines.reduce(
      (
        sum,
        line,
      ): number =>
        sum +
        Number(
          line.debit,
        ),
      0,
    );

  const totalKredit =
    form.lines.reduce(
      (
        sum,
        line,
      ): number =>
        sum +
        Number(
          line.kredit,
        ),
      0,
    );

  /* =========================
     SUBMIT
  ========================= */

  async function handleSubmit(): Promise<void> {
    try {
      setLoading(true);

      const parsed =
        jurnalKoreksiSchema.safeParse(
          form,
        );

      if (
        !parsed.success
      ) {
        Swal.fire({
          icon: "error",
          title:
            "Validasi Gagal",
          text:
            "Periksa kembali input jurnal koreksi",
        });

        setLoading(false);

        return;
      }

      if (
        totalDebit !==
        totalKredit
      ) {
        Swal.fire({
          icon: "error",
          title:
            "Jurnal Tidak Balance",
          text:
            "Total debit dan kredit harus sama",
        });

        setLoading(false);

        return;
      }

      const res =
        await fetch(
          "/api/jurnal-koreksi",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const result =
        (await res.json()) as {
          error?: string;
          message?: string;
        };

      setLoading(false);

      if (!res.ok) {
        Swal.fire({
          icon: "error",
          title:
            "Gagal",
          text:
            result.error ??
            "Gagal membuat jurnal koreksi",
        });

        return;
      }

      Swal.fire({
        icon: "success",
        title:
          "Berhasil",

        text:
          result.message ??
          "Jurnal koreksi berhasil dibuat",

        timer: 1500,

        showConfirmButton:
          false,
      }).then(() => {
        router.push(
          "/accounting/jurnal-koreksi",
        );

        router.refresh();
      });
    } catch (
    error: unknown
    ) {
      console.error(
        "SUBMIT JURNAL KOREKSI ERROR:",
        error,
      );

      showToast(
        "Terjadi kesalahan sistem",
        "error",
      );

      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card title="Tambah Jurnal Koreksi">
        {/* =========================
            HEADER
        ========================= */}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal"
            type="date"
            value={
              form.tanggal
            }
            onChange={(
              e,
            ) =>
              handleChange(
                "tanggal",
                e.target
                  .value,
              )
            }
          />

          <Input
            label="No Bukti"
            value={
              form.no_bukti
            }
            onChange={(
              e,
            ) =>
              handleChange(
                "no_bukti",
                e.target
                  .value,
              )
            }
          />

          <div>
            <label className="text-sm font-medium">
              Jurnal Asal
            </label>

            <select
              className="w-full border rounded p-2"
              value={
                form.id_jurnal_asal
              }
              onChange={(
                e,
              ) =>
                handleChange(
                  "id_jurnal_asal",
                  Number(
                    e
                      .target
                      .value,
                  ),
                )
              }
            >
              <option value={0}>
                Pilih Jurnal
              </option>

              {jurnalList.map(
                (
                  item,
                ) => (
                  <option
                    key={
                      item.id_jurnal
                    }
                    value={
                      item.id_jurnal
                    }
                  >
                    {
                      item.no_bukti
                    }{" "}
                    -
                    {" "}
                    {
                      item.keterangan
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <Input
            label="Alasan Koreksi"
            value={
              form.alasan
            }
            onChange={(
              e,
            ) =>
              handleChange(
                "alasan",
                e.target
                  .value,
              )
            }
          />

          <div className="col-span-2">
            <Input
              label="Keterangan"
              value={
                form.keterangan
              }
              onChange={(
                e,
              ) =>
                handleChange(
                  "keterangan",
                  e.target
                    .value,
                )
              }
            />
          </div>
        </div>

        {/* =========================
            DETAIL
        ========================= */}

        <div className="mt-6">
          <div className="flex justify-between mb-3">
            <h2 className="font-semibold">
              Detail Jurnal
            </h2>

            <Button
              onClick={
                addLine
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Baris
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2">
                    COA
                  </th>

                  <th className="border px-3 py-2">
                    Debit
                  </th>

                  <th className="border px-3 py-2">
                    Kredit
                  </th>

                  <th className="border px-3 py-2 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {form.lines.map(
                  (
                    line,
                    index,
                  ) => (
                    <tr
                      key={
                        index
                      }
                    >
                      <td className="border px-3 py-2">
                        <select
                          className="w-full border rounded p-2"
                          value={
                            line.id_coa
                          }
                          onChange={(
                            e,
                          ) =>
                            handleLineChange(
                              index,
                              "id_coa",
                              Number(
                                e
                                  .target
                                  .value,
                              ),
                            )
                          }
                        >
                          <option value={0}>
                            Pilih COA
                          </option>

                          {coaList.map(
                            (
                              coa,
                            ) => (
                              <option
                                key={
                                  coa.id_coa
                                }
                                value={
                                  coa.id_coa
                                }
                              >
                                {
                                  coa.kode
                                }{" "}
                                -
                                {" "}
                                {
                                  coa.nama
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td className="border px-3 py-2">
                        <Input
                          type="number"
                          value={
                            line.debit
                          }
                          onChange={(
                            e,
                          ) =>
                            handleLineChange(
                              index,
                              "debit",
                              Number(
                                e
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </td>

                      <td className="border px-3 py-2">
                        <Input
                          type="number"
                          value={
                            line.kredit
                          }
                          onChange={(
                            e,
                          ) =>
                            handleLineChange(
                              index,
                              "kredit",
                              Number(
                                e
                                  .target
                                  .value,
                              ),
                            )
                          }
                        />
                      </td>

                      <td className="border px-3 py-2 text-center">
                        <Button
                          variant="destructive"
                          onClick={() =>
                            removeLine(
                              index,
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>

              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-3 py-2 text-right">
                    TOTAL
                  </td>

                  <td className="border px-3 py-2">
                    {totalDebit.toLocaleString(
                      "id-ID",
                    )}
                  </td>

                  <td className="border px-3 py-2">
                    {totalKredit.toLocaleString(
                      "id-ID",
                    )}
                  </td>

                  <td className="border px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* =========================
            ACTION
        ========================= */}

        <div className="flex gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() =>
              router.push(
                "/accounting/jurnal-koreksi",
              )
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          <Button
            onClick={() =>
              void handleSubmit()
            }
            disabled={
              loading
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}