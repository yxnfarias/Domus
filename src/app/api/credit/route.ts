import { NextRequest, NextResponse } from 'next/server'
import { analyzeCreditEligibility, compareMultibank } from '@/lib/credit-engine'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      lead_id,
      income,
      work_regime,
      birth_date,
      property_value,
      fgts,
      down_payment,
      spouse_income,
    } = body

    // Only income and work_regime are strictly required
    if (!income || !work_regime) {
      return NextResponse.json({ error: 'income e work_regime são obrigatórios' }, { status: 400 })
    }

    const creditInput = {
      income:         Number(income),
      work_regime,
      birth_date:     birth_date    || '1990-01-01',
      property_value: Number(property_value  ?? 0),
      fgts:           Number(fgts           ?? 0),
      down_payment:   Number(down_payment   ?? 0),
      spouse_income:  Number(spouse_income  ?? 0),
      ocr_income:     null,
    }

    const result = analyzeCreditEligibility(creditInput)
    const banks = compareMultibank(creditInput)

    // Persist result in Supabase
    if (lead_id) {
      const supabase = getServiceClient()
      await supabase
        .from('leads')
        .update({
          status:               result.can_finance ? 'Crédito Pré-Aprovado' : 'Recusado',
          credit_score:         result.score,
          max_financing_sac:    result.max_financing_sac,
          max_financing_price:  result.max_financing_price,
        })
        .eq('id', lead_id)
    }

    return NextResponse.json({ ...result, banks })
  } catch (err) {
    console.error('[credit/route]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
