import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/server';
import { equipmentUpdateSchema } from '@/lib/zod/equipment.schema'

type Params = {
  params: {
    id: string
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const body: unknown = await req.json()
    const payload = equipmentUpdateSchema.parse(body)

    const { data, error } = await db
      .from('equipment')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data)
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

export async function DELETE(
  _: Request,
  { params }: Params
) {
  const { error } = await db
    .from('equipment')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Equipment deleted'
  })
}