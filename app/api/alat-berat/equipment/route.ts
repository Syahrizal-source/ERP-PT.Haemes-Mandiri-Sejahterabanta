import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server';
import { equipmentCreateSchema } from '@/lib/zod/equipment.schema'

export async function GET() {
  const { data, error } = await db
    .from('equipment')
    .select(`
      id,
      asset_number,
      type,
      brand,
      model,
      serial_number,
      year,
      status,
      site_id,
      created_at
    `)
    .order('asset_number')

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const payload = equipmentCreateSchema.parse(body)

    const { data, error } = await db
      .from('equipment')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json(
        { message: err.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Unknown error' },
      { status: 500 }
    )
  }
}