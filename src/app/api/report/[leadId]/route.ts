import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { CreditReportDocument } from '@/components/pdf/CreditReport'

export async function GET(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params
    // In production: fetch lead from Supabase by ID
    // const { data: lead } = await getServiceClient().from('leads').select('*, spouse_data(*)').eq('id', leadId).single()

    return NextResponse.json({ error: 'Supabase connection required' }, { status: 501 })
  } catch (err) {
    console.error('[report/route]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
