import { getServiceClient } from '@/lib/supabase'
import { MultiStepForm } from '@/components/form/MultiStepForm'

export const dynamic = 'force-dynamic'

export default async function FormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  let companyName:    string | null = null
  let logoUrl:        string | null = null
  let primaryColor:   string | null = null
  let secondaryColor: string | null = null
  let accentColor:    string | null = null

  try {
    const { data } = await getServiceClient()
      .from('companies')
      .select('name, logo_url, theme_config')
      .eq('slug', slug)
      .single()
    companyName = data?.name ?? null
    logoUrl     = data?.logo_url ?? null
    const tc = data?.theme_config as { primary?: string; secondary?: string; accent?: string } | null
    primaryColor   = tc?.primary   ?? null
    secondaryColor = tc?.secondary ?? null
    accentColor    = tc?.accent    ?? null
  } catch {
    // silently ignore — form still works without company branding
  }

  return (
    <MultiStepForm
      companySlug={slug}
      companyName={companyName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      accentColor={accentColor}
    />
  )
}
