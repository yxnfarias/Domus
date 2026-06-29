import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

  const service = getServiceClient()

  const { data: company } = await service
    .from('companies').select('id, name, logo_url').eq('slug', slug).maybeSingle()

  if (!company) return NextResponse.json({ error: 'Corretora não encontrada' }, { status: 404 })

  const { data: properties, error } = await service
    .from('properties')
    .select('id, title, description, address, area_m2, bedrooms, bathrooms, parking_spots, value, region, status, photo_urls, created_at')
    .eq('company_id', company.id)
    .in('status', ['available', 'reserved'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    company: { name: company.name, logo_url: company.logo_url, slug },
    properties: properties ?? [],
  })
}
