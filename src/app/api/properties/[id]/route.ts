import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getAuthContext } from '@/lib/api-auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id }   = await params
  const supabase = getServiceClient()
  const body     = await req.json()

  const patch: Record<string, unknown> = {}
  const allowed = ['title','description','address','region','area_m2','rooms','bedrooms',
                   'bathrooms','parking_spots','value','status','sold_at']
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if (body.status === 'sold') {
    if (!body.sold_at) patch.sold_at = new Date().toISOString()
  }
  if (body.status === 'available') {
    patch.sold_at = null
  }

  // Update the core fields first (always works)
  const { data, error } = await supabase
    .from('properties')
    .update(patch)
    .eq('id', id)
    .eq('company_id', ctx.companyId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record who made the sale — non-blocking (column may not exist if migration 003 not run yet)
  if (body.status === 'sold') {
    await supabase
      .from('properties')
      .update({ sold_by: ctx.user.id })
      .eq('id', id)
      .eq('company_id', ctx.companyId)
      .then(() => {/* ignore error if column missing */})
  }
  if (body.status === 'available') {
    await supabase
      .from('properties')
      .update({ sold_by: null })
      .eq('id', id)
      .eq('company_id', ctx.companyId)
      .then(() => {/* ignore error if column missing */})
  }

  return NextResponse.json({ property: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id }   = await params
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('company_id', ctx.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
