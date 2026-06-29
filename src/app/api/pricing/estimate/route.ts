import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calculatePricing } from '@/lib/pricing-model'

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )

  const { data: userData, error: userError } = await supabase.auth.getUser()
  let user = userData.user
  if (!user && userError) {
    const { data: sd } = await supabase.auth.getSession()
    user = sd.session?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.state || !body.totalArea || Number(body.totalArea) <= 0) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const result = calculatePricing({
    city:                String(body.city  ?? ''),
    state:               String(body.state ?? ''),
    zone:                String(body.zone  ?? 'standard') as import('@/lib/pricing-model').ZoneType,
    houseType:           String(body.houseType          ?? 'APARTMENT'),
    floor:               Number(body.floor              ?? 0),
    totalArea:           Number(body.totalArea),
    bedroomCount:        Number(body.bedroomCount       ?? 1),
    bathroomCount:       Number(body.bathroomCount      ?? 1),
    suitesCount:         Number(body.suitesCount        ?? 0),
    parkingSlots:        Number(body.parkingSlots       ?? 0),
    condominiumPerMonth: Number(body.condominiumPerMonth ?? 0),
    hasIptu:             Boolean(body.hasIptu           ?? false),
    iptuPerYear:         Number(body.iptuPerYear        ?? 0),
  })

  return NextResponse.json(result)
}
