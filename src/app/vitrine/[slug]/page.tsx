import type { Metadata } from 'next'
import type { Property } from '@/lib/types'
import { Building2, Bed, Bath, Car, Maximize2, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: `Imóveis disponíveis · ${slug}` }
}

async function getVitrine(slug: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const res  = await fetch(`${base}/api/properties/public?slug=${slug}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json() as Promise<{ company: { name: string; logo_url: string | null; slug: string }; properties: Property[] }>
}

export default async function VitrinePage({ params }: Props) {
  const { slug } = await params
  const data = await getVitrine(slug)

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <p style={{ color: '#666' }}>Corretora não encontrada.</p>
      </div>
    )
  }

  const { company, properties } = data

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#0F3D2E', padding: '0 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company.name} style={{ height: 32, objectFit: 'contain' }} />
            ) : (
              <span style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 14, fontWeight: 500, letterSpacing: '0.14em', color: '#FAF7F2' }}>
                {company.name.toUpperCase()}
              </span>
            )}
          </div>
          <Link
            href={`/form/${slug}`}
            style={{
              padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: '#D5C2A1', color: '#082018', textDecoration: 'none',
            }}
          >
            Simular financiamento
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: '#0F3D2E', padding: '48px 40px 56px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontFamily: '"DM Mono", monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,242,0.55)', margin: '0 0 10px' }}>
            Imóveis disponíveis
          </p>
          <h1 style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 32, fontWeight: 400, letterSpacing: '-0.01em', color: '#FAF7F2', margin: 0 }}>
            Encontre o imóvel ideal
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(250,247,242,0.65)', margin: '10px 0 0' }}>
            {properties.length} imóvel{properties.length !== 1 ? 'is' : ''} disponível{properties.length !== 1 ? 'is' : ''} — {company.name}
          </p>
        </div>
      </div>

      {/* Properties grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        {properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <Building2 size={40} style={{ color: '#98A19B', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, color: '#5A6660' }}>Nenhum imóvel disponível no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {properties.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E4DED1', overflow: 'hidden', boxShadow: '0 1px 0 rgba(20,36,28,.04), 0 1px 2px rgba(20,36,28,.04)' }}>
                {/* Photo */}
                <div style={{ height: 200, background: '#F2EEE6', position: 'relative' }}>
                  {p.photo_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_urls[0]} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={36} style={{ color: '#C5CCC7' }} />
                    </div>
                  )}
                  {p.status === 'reserved' && (
                    <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 99, background: '#F6E9CC', color: '#C68A2E', fontSize: 10, fontWeight: 600 }}>
                      Reservado
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '18px 20px' }}>
                  {p.region && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <MapPin size={11} style={{ color: '#98A19B' }} />
                      <span style={{ fontSize: 11, color: '#98A19B' }}>{p.region}</span>
                    </div>
                  )}
                  <h2 style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 14, fontWeight: 400, margin: '0 0 6px', color: '#14241C', lineHeight: 1.35 }}>
                    {p.title}
                  </h2>
                  {p.address && (
                    <p style={{ fontSize: 12, color: '#98A19B', margin: '0 0 12px' }}>{p.address}</p>
                  )}

                  {/* Specs */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                    {p.bedrooms > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5A6660' }}>
                        <Bed size={12} /> {p.bedrooms}q
                      </span>
                    )}
                    {p.bathrooms > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5A6660' }}>
                        <Bath size={12} /> {p.bathrooms}b
                      </span>
                    )}
                    {p.parking_spots > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5A6660' }}>
                        <Car size={12} /> {p.parking_spots}v
                      </span>
                    )}
                    {p.area_m2 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5A6660' }}>
                        <Maximize2 size={12} /> {p.area_m2}m²
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontFamily: '"Unbounded", sans-serif', fontSize: 18, fontWeight: 400, color: '#0F3D2E', margin: 0 }}>
                      {p.value ? fmtBRL(p.value) : '—'}
                    </p>
                    <Link
                      href={`/form/${slug}?property=${p.id}`}
                      style={{
                        padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                        background: '#0F3D2E', color: '#FAF7F2', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Phone size={11} /> Tenho interesse
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E4DED1', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#98A19B', margin: 0 }}>
          {company.name} · Plataforma Domus
        </p>
      </footer>
    </div>
  )
}
