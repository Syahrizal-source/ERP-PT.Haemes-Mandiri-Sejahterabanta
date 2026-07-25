import { z } from "zod";

export const employeeCreateSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi").max(50),

  name: z.string().min(1, "Nama wajib diisi").max(150),

  position: z.string().min(1, "Posisi wajib diisi").max(100),

  division_id: z.string().uuid("Division tidak valid"),

  hire_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal tidak valid"),

  basic_salary: z.coerce.number().min(0, "Gaji tidak boleh minus"),

  is_active: z.boolean().optional(),
});

export const employeeUpdateSchema = z.object({
  nik: z.string().min(1).max(50).optional(),

  name: z.string().min(1).max(150).optional(),

  position: z.string().min(1).max(100).optional(),

  division_id: z.string().uuid().optional(),

  hire_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal tidak valid")
    .optional(),

  basic_salary: z.coerce.number().min(0, "Gaji tidak boleh minus").optional(),

  is_active: z.boolean().optional(),
});

export const employeeParamSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
