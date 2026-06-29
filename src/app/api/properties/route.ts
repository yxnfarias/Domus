import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getAuthContext } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa associada' }, { status: 403 })

  const companyId = ctx.companyId
  const status    = req.nextUrl.searchParams.get('status')
  const supabase  = getServiceClient()

  let query = supabase
    .from('properties')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Falha ao buscar imóveis', detail: error.message }, { status: 502 })

  return NextResponse.json({ properties: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa associada' }, { status: 403 })

  const companyId = ctx.companyId

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida — envie multipart/form-data' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const propData = JSON.parse(formData.get('data') as string)

  const { data: property, error: propErr } = await supabase
    .from('properties')
    .insert({
      company_id:    companyId,
      title:         propData.title,
      description:   propData.description   || null,
      address:       propData.address        || null,
      region:        propData.region         || null,
      area_m2:       propData.area_m2        || null,
      rooms:         propData.rooms          || 0,
      bedrooms:      propData.bedrooms       || 0,
      bathrooms:     propData.bathrooms      || 0,
      parking_spots: propData.parking_spots  || 0,
      value:         propData.value          || null,
      status:        'available',
    })
    .select('id')
    .single()

  if (propErr || !property) {
    console.error('[properties/POST]', propErr)
    return NextResponse.json({ error: propErr?.message ?? 'Failed to save property' }, { status: 500 })
  }

  // Upload photos to Supabase Storage
  const photos    = formData.getAll('photos') as File[]
  const photoUrls: string[] = []

  if (photos.length > 0) {
    await supabase.storage
      .createBucket('property-photos', { public: true })
      .catch(() => {})

    for (const file of photos) {
      const ext  = file.name.split('.').pop()
      const path = `${companyId}/${property.id}/photo-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('property-photos')
        .upload(path, await file.arrayBuffer(), { contentType: file.type })

      if (storageErr) {
        console.error('[properties/POST] storage upload:', storageErr.message)
      } else {
        const { data: urlData } = supabase.storage.from('property-photos').getPublicUrl(path)
        photoUrls.push(urlData.publicUrl)
      }
    }

    if (photoUrls.length > 0) {
      await supabase.from('properties').update({ photo_urls: photoUrls }).eq('id', property.id)
    }
  }

  return NextResponse.json({ success: true, id: property.id }, { status: 201 })
}
