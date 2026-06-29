import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getAuthContext } from '@/lib/api-auth'
import { createNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req)
  if (!ctx) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  if (!ctx.companyId) return NextResponse.json({ error: 'Sem empresa associada' }, { status: 403 })

  const supabase = getServiceClient()
  const companyId = ctx.companyId
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'

  let query = supabase
    .from('leads')
    .select('*, spouse_data(*), lead_documents(*), lead_follow_ups(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  // Corretores só enxergam os leads que o admin atribuiu a eles
  if (!isAdmin) query = query.eq('broker_id', ctx.user.id)

  const { data, error } = await query

  if (error) {
    console.error('[leads/GET]', error)
    return NextResponse.json({ error: 'Falha ao buscar leads', detail: error.message }, { status: 502 })
  }

  // Normalize spouse_data (Supabase returns array) -> single object
  type RawLead = {
    spouse_data:     Array<{ name: string; cpf: string; income: number }> | null
    lead_documents:  Array<{ id: string; type: string; file_url: string; file_name: string; created_at: string }> | null
    lead_follow_ups: Array<{ id: string; lead_id: string; company_id: string; date: string; note: string | null; done: boolean; created_by: string | null; created_at: string }> | null
    [key: string]: unknown
  }
  const leads = ((data ?? []) as RawLead[]).map(l => ({
    ...l,
    spouse: l.spouse_data?.[0] ?? null,
    documents: l.lead_documents ?? [],
    follow_ups: l.lead_follow_ups ?? [],
  }))

  return NextResponse.json({ leads })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient()

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Requisição inválida — envie multipart/form-data' }, { status: 400 })
    }

    const companySlug = formData.get('company_slug') as string
    const raw = formData.get('data') as string
    if (!companySlug || !raw) {
      return NextResponse.json({ error: 'Campos company_slug e data são obrigatórios' }, { status: 400 })
    }
    const leadData = JSON.parse(raw)

    // 1. Resolve company by slug
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', companySlug)
      .single()

    if (companyErr || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
    const companyId = company.id

    // 2. Insert lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        company_id: companyId,
        name: leadData.name,
        email: leadData.email,
        whatsapp: leadData.whatsapp,
        cpf: leadData.cpf,
        rg: leadData.rg,
        rg_organ: leadData.rg_organ,
        birth_date: leadData.birth_date,
        marital_status: leadData.marital_status,
        income: leadData.income,
        work_regime: leadData.work_regime,
        property_value: leadData.property_value,
        region: leadData.region,
        fgts: leadData.fgts,
        down_payment: leadData.down_payment,
      })
      .select('id')
      .single()

    if (leadErr || !lead) {
      console.error('[leads/POST] insert lead', leadErr)
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
    }

    // 3. Insert spouse if present
    if (leadData.spouse_name) {
      await supabase.from('spouse_data').insert({
        lead_id: lead.id,
        name: leadData.spouse_name,
        cpf: leadData.spouse_cpf,
        income: leadData.spouse_income,
      })
    }

    // 4. Upload documents to Supabase Storage
    const filesToUpload: Array<{ file: File; type: string }> = []
    const residenceProof = formData.get('residence_proof') as File | null
    if (residenceProof) filesToUpload.push({ file: residenceProof, type: 'residence' })

    const incomeDocs = formData.getAll('income_docs') as File[]
    const incomeType = ['CLT', 'Servidor Público'].includes(leadData.work_regime)
      ? 'income_payslip'
      : 'income_statement'
    incomeDocs.forEach(f => filesToUpload.push({ file: f, type: incomeType }))

    for (const { file, type } of filesToUpload) {
      const ext = file.name.split('.').pop()
      const path = `${companyId}/${lead.id}/${type}-${Date.now()}.${ext}`
      const buffer = await file.arrayBuffer()

      const { error: storageErr } = await supabase.storage
        .from('lead-documents')
        .upload(path, buffer, { contentType: file.type })

      if (!storageErr) {
        const { data: urlData } = supabase.storage
          .from('lead-documents')
          .getPublicUrl(path)

        await supabase.from('lead_documents').insert({
          lead_id: lead.id,
          company_id: companyId,
          type,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
        })
      }
    }

    // Non-blocking notification
    createNotification({
      companyId: companyId,
      type:  'new_lead',
      title: 'Novo lead cadastrado',
      body:  `${leadData.name}${leadData.region ? ` · ${leadData.region}` : ''}`,
      href:  '/dashboard/leads',
    }).catch(() => {})

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 })
  } catch (err) {
    console.error('[leads/POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
