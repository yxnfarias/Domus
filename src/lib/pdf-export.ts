import type { Lead } from './types'
import { formatCurrency, formatDate } from './utils'
import { analyzeCreditEligibility, compareMultibank } from './credit-engine'

interface PDFOptions {
  companyName?: string | null
  primaryColor?: string | null
}

function lighten(hex: string, factor = 0.92): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#f2f8f5'
  const r = Math.round(parseInt(c.slice(0, 2), 16) * (1 - factor) + 255 * factor)
  const g = Math.round(parseInt(c.slice(2, 4), 16) * (1 - factor) + 255 * factor)
  const b = Math.round(parseInt(c.slice(4, 6), 16) * (1 - factor) + 255 * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export async function downloadLeadPDF(lead: Lead, options?: PDFOptions): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = 210
  const H   = 297
  const M   = 20

  const fill   = (hex: string) => doc.setFillColor(hex)
  const stroke = (hex: string) => doc.setDrawColor(hex)
  const tcolor = (hex: string) => doc.setTextColor(hex)
  const font   = (style: 'normal' | 'bold', size: number) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }

  const G  = options?.primaryColor ?? '#0F3D2E'
  const IV = '#FAF7F2'
  const BE = '#D5C2A1'
  const TX = '#1a1a1a'
  const MU = '#888888'
  const BD = '#e5e5e5'
  const brandName = (options?.companyName ?? 'DOMUS').toUpperCase()

  let y = 0

  // ── Header ───────────────────────────────────────────────────────────────
  fill(G)
  doc.rect(0, 0, W, 44, 'F')
  font('bold', 22); tcolor(IV)
  doc.text(brandName, M, 24)
  font('normal', 8); tcolor(BE)
  doc.text('RELATORIO DE ANALISE DE CREDITO', M, 33)
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Emitido em ${dateStr}`, W - M, 33, { align: 'right' })
  y = 54

  // ── Lead name + status pill ──────────────────────────────────────────────
  font('bold', 17); tcolor(TX)
  doc.text(lead.name, M, y)

  const pillColors: Record<string, string> = {
    'Credito Pre-Aprovado': '#10b981',
    'Crédito Pré-Aprovado': '#10b981',
    'Em Análise':           '#f59e0b',
    'Recusado':             '#ef4444',
    'Pendente':             '#64748b',
  }
  const pillW = 60
  fill(pillColors[lead.status] ?? '#64748b')
  doc.roundedRect(W - M - pillW, y - 8, pillW, 10, 2, 2, 'F')
  font('bold', 7); tcolor('#ffffff')
  doc.text(lead.status, W - M - pillW / 2, y - 1.5, { align: 'center' })

  y += 10
  stroke(BD); doc.setLineWidth(0.3)
  doc.line(M, y, W - M, y)
  y += 10

  // ── Page 1 helpers ───────────────────────────────────────────────────────
  const section = (title: string) => {
    font('bold', 7); tcolor(MU)
    doc.text(title, M, y)
    y += 4
    stroke(BD); doc.setLineWidth(0.2)
    doc.line(M, y, W - M, y)
    y += 8
  }

  const HW = (W - M * 2) / 2
  const twoCol = (l1: string, v1: string, l2: string, v2: string) => {
    font('normal', 8); tcolor(MU)
    doc.text(l1, M,      y)
    doc.text(l2, M + HW, y)
    font('bold', 8); tcolor(TX)
    doc.text(v1 || '-', M + 44,      y)
    doc.text(v2 || '-', M + HW + 44, y)
    y += 7
  }

  const oneCol = (label: string, value: string) => {
    font('normal', 8); tcolor(MU); doc.text(label, M, y)
    font('bold',   8); tcolor(TX); doc.text(value || '-', M + 44, y)
    y += 7
  }

  // ── Identification ───────────────────────────────────────────────────────
  section('IDENTIFICACAO')
  twoCol('CPF', lead.cpf, 'RG', `${lead.rg}${lead.rg_organ ? ` (${lead.rg_organ})` : ''}`)
  twoCol('Nascimento', formatDate(lead.birth_date), 'Estado Civil', lead.marital_status)
  twoCol('E-mail', lead.email, 'WhatsApp', lead.whatsapp)
  y += 4

  // ── Financial ────────────────────────────────────────────────────────────
  section('PERFIL FINANCEIRO')
  twoCol('Regime', lead.work_regime, 'Renda mensal', formatCurrency(lead.income))
  if (lead.spouse) {
    twoCol('Conjuge', lead.spouse.name, 'Renda conjuge', formatCurrency(lead.spouse.income))
    oneCol('Renda combinada', formatCurrency(lead.income + lead.spouse.income))
  }
  y += 4

  // ── Purchase intent ──────────────────────────────────────────────────────
  section('INTENCAO DE COMPRA')
  twoCol('Valor do imovel', formatCurrency(lead.property_value), 'Regiao', lead.region)
  twoCol(
    'FGTS',    lead.fgts         ? formatCurrency(lead.fgts)         : '-',
    'Entrada', lead.down_payment ? formatCurrency(lead.down_payment) : '-',
  )
  y += 4

  // ── Credit summary (page 1) ──────────────────────────────────────────────
  if (lead.credit_score != null) {
    section('ANALISE DE CREDITO — RESUMO (ver detalhamento na pag. 2)')

    const score      = lead.credit_score
    const scoreColor = score >= 700 ? '#10b981' : score >= 500 ? '#f59e0b' : '#ef4444'
    const scoreLabel = score >= 700 ? 'Excelente' : score >= 500 ? 'Regular' : 'Baixo'

    font('bold', 28); tcolor(scoreColor)
    doc.text(String(score), M, y + 12)
    font('normal', 10); tcolor(MU)
    doc.text(scoreLabel, M + 30, y + 10)

    const barW = W - M * 2
    fill(BD); doc.roundedRect(M, y + 15, barW, 4, 1, 1, 'F')
    fill(scoreColor); doc.roundedRect(M, y + 15, (score / 1000) * barW, 4, 1, 1, 'F')
    y += 28

    const TW   = barW
    const cols = [M + 2, M + 48, M + 98, M + 150]

    fill(G); doc.rect(M, y, TW, 8, 'F')
    font('bold', 7); tcolor(IV)
    ;['SISTEMA', 'VALOR MAXIMO', '1a PARCELA (EST.)', 'PRAZO'].forEach((h, i) =>
      doc.text(h, cols[i], y + 5.5)
    )
    y += 8

    const IR = 0.0762 / 12
    const N  = 360
    const sacFirst   = (pv: number) => pv / N + pv * IR
    const priceFirst = (pv: number) => pv * (IR * Math.pow(1 + IR, N)) / (Math.pow(1 + IR, N) - 1)

    ;([
      ['SAC',   lead.max_financing_sac   ?? 0, sacFirst],
      ['PRICE', lead.max_financing_price ?? 0, priceFirst],
    ] as [string, number, (pv: number) => number][]).forEach(([label, pv, fn], ri) => {
      doc.setFillColor(ri === 0 ? '#f8f8f8' : '#ffffff')
      doc.rect(M, y, TW, 9, 'F')
      stroke(BD); doc.setLineWidth(0.2)
      if (ri > 0) doc.line(M, y, M + TW, y)
      font('bold', 9);   tcolor(G);  doc.text(label as string, cols[0], y + 6)
      font('bold', 8);   tcolor(TX); doc.text(formatCurrency(pv as number), cols[1], y + 6)
      font('normal', 8); tcolor(MU)
      doc.text(formatCurrency((fn as (pv: number) => number)(pv as number)), cols[2], y + 6)
      doc.text('360 meses', cols[3], y + 6)
      y += 9
    })

    y += 8

    const totalIncome = lead.income + (lead.spouse?.income ?? 0)
    fill(lighten(G)); stroke(G); doc.setLineWidth(0.4)
    doc.roundedRect(M, y, TW, 30, 3, 3, 'FD')

    const items: [string, string][] = [
      ['Renda combinada',         formatCurrency(totalIncome)],
      ['Limite de parcela (30%)', formatCurrency(totalIncome * 0.30)],
      ['Imovel pretendido',       formatCurrency(lead.property_value)],
      ['Resultado',               score >= 400 ? 'Aprovado' : 'Nao aprovado'],
    ]
    items.forEach(([lbl, val], idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x   = col === 0 ? M + 6 : M + TW / 2 + 6
      const iy  = y + 9 + row * 13
      font('normal', 7); tcolor(MU); doc.text(lbl, x, iy)
      font('bold', 10)
      tcolor(lbl === 'Resultado' ? (score >= 400 ? '#10b981' : '#ef4444') : TX)
      doc.text(val, x, iy + 7)
    })
  }

  // ── Footer page 1 ────────────────────────────────────────────────────────
  const hasPage2 = lead.credit_score != null
  fill(G); doc.rect(0, H - 14, W, 14, 'F')
  font('normal', 7); tcolor(IV)
  doc.text(
    hasPage2
      ? `Gerado por ${brandName} · Plataforma de Gestao de Leads Imobiliarios · Pag. 1 de 3`
      : `Gerado por ${brandName} · Plataforma de Gestao de Leads Imobiliarios`,
    W / 2, H - 5, { align: 'center' },
  )

  // ── Page 2: Detailed credit analysis ─────────────────────────────────────
  if (lead.credit_score != null) {
    doc.addPage()

    const credit = analyzeCreditEligibility({
      income:         lead.income,
      work_regime:    lead.work_regime,
      birth_date:     lead.birth_date || '1990-01-01',
      property_value: lead.property_value,
      fgts:           lead.fgts,
      down_payment:   lead.down_payment,
      spouse_income:  lead.spouse?.income ?? 0,
      ocr_income:     null,
    })

    const totalIncome2   = lead.income + (lead.spouse?.income ?? 0)
    const maxInstallment = totalIncome2 * 0.30
    const RATE           = 0.0762 / 12
    const age2           = new Date().getFullYear() - new Date(lead.birth_date || '1990-01-01').getFullYear()
    const termMonths     = Math.max(12, Math.min(360, (80 - age2) * 12))
    const sacFirst2      = lead.property_value > 0
      ? lead.property_value / termMonths + lead.property_value * RATE
      : 0
    const gap = maxInstallment - sacFirst2

    const ratio2   = lead.property_value > 0 ? (totalIncome2 * 12) / lead.property_value : 0
    const downPct2 = lead.property_value > 0
      ? ((lead.down_payment ?? 0) + (lead.fgts ?? 0)) / lead.property_value
      : 0
    const regimeBonus: Record<string, number> = {
      'CLT': 60, 'Servidor Público': 80, 'Servidor Publico': 80,
      'Liberal': 20, 'Empresário': 10, 'Empresario': 10,
      'Autônomo': 0, 'Autonomo': 0,
    }

    const factors = [
      {
        label:  'Renda x valor do imovel',
        delta:  ratio2 >= 0.12 ? +80 : ratio2 >= 0.08 ? +40 : -80,
        detail: `Renda anual = ${Math.round(ratio2 * 100)}% do valor do imovel`,
      },
      {
        label:  'Vinculo empregaticio',
        delta:  regimeBonus[lead.work_regime] ?? 0,
        detail: lead.work_regime,
      },
      {
        label:  'Faixa etaria',
        delta:  age2 < 40 ? +30 : age2 > 65 ? -60 : 0,
        detail: `${age2} anos`,
      },
      {
        label:  'Entrada + FGTS',
        delta:  downPct2 >= 0.3 ? +80 : downPct2 >= 0.2 ? +40 : 0,
        detail: downPct2 > 0 ? `${Math.round(downPct2 * 100)}% do imovel como entrada` : 'Nenhuma entrada informada',
      },
    ]

    let y2 = 0
    const TW2 = W - M * 2

    // Page 2 helpers
    const sec2 = (title: string) => {
      font('bold', 7); tcolor(MU)
      doc.text(title, M, y2)
      y2 += 4
      stroke(BD); doc.setLineWidth(0.2)
      doc.line(M, y2, W - M, y2)
      y2 += 8
    }

    const tableRowLine = () => {
      stroke(BD); doc.setLineWidth(0.2)
      doc.line(M, y2 + 8, M + TW2, y2 + 8)
    }

    // ── Page 2 header strip ──────────────────────────────────────────────
    fill(G); doc.rect(0, 0, W, 30, 'F')
    font('bold', 13); tcolor(IV)
    doc.text('ANALISE DE CREDITO - DETALHAMENTO', M, 19)
    font('normal', 8); tcolor(BE)
    doc.text(lead.name, W - M, 19, { align: 'right' })
    y2 = 40

    // ── Decision banner ──────────────────────────────────────────────────
    const approved = credit.can_finance
    fill(approved ? '#dcfce7' : '#fee2e2')
    stroke(approved ? '#16a34a' : '#dc2626')
    doc.setLineWidth(0.5)
    doc.roundedRect(M, y2, TW2, 20, 3, 3, 'FD')
    font('bold', 11); tcolor(approved ? '#15803d' : '#b91c1c')
    doc.text(approved ? 'CREDITO PRE-APROVADO' : 'CREDITO RECUSADO', M + 8, y2 + 8)
    font('normal', 8); tcolor(approved ? '#166534' : '#991b1b')
    const bannerMsg = approved
      ? `Score ${lead.credit_score} — Capacidade maxima SAC: ${formatCurrency(lead.max_financing_sac ?? 0)}`
      : credit.restrictions.length > 0
        ? credit.restrictions[0]
        : `Score ${lead.credit_score} abaixo do minimo exigido pelos bancos (400 pontos)`
    doc.text(bannerMsg, M + 8, y2 + 16)
    y2 += 28

    // ── Score ────────────────────────────────────────────────────────────
    sec2('SCORE DE CREDITO')
    const score2      = lead.credit_score!
    const scoreColor2 = score2 >= 700 ? '#10b981' : score2 >= 500 ? '#f59e0b' : '#ef4444'
    const scoreLabel2 = score2 >= 700
      ? 'Excelente — Alta probabilidade de aprovacao'
      : score2 >= 500
      ? 'Regular — Aprovacao condicionada a renda'
      : 'Baixo — Regularize antes de solicitar credito'

    font('bold', 28); tcolor(scoreColor2)
    doc.text(String(score2), M, y2 + 11)
    font('normal', 9); tcolor(MU)
    doc.text(scoreLabel2, M + 28, y2 + 10)
    fill(BD); doc.roundedRect(M, y2 + 14, TW2, 4, 1, 1, 'F')
    fill(scoreColor2); doc.roundedRect(M, y2 + 14, (score2 / 1000) * TW2, 4, 1, 1, 'F')
    font('normal', 7); tcolor(MU)
    doc.text('0', M, y2 + 22)
    doc.text('500', M + TW2 / 2, y2 + 22, { align: 'center' })
    doc.text('1000', M + TW2, y2 + 22, { align: 'right' })
    y2 += 30

    // ── Score factors ────────────────────────────────────────────────────
    sec2('COMPOSICAO DO SCORE (base: 600 pontos)')

    fill(G); doc.rect(M, y2, TW2, 8, 'F')
    font('bold', 7); tcolor(IV)
    doc.text('FATOR', M + 4, y2 + 5.5)
    doc.text('DETALHE', M + TW2 * 0.48, y2 + 5.5)
    doc.text('PONTOS', M + TW2 - 4, y2 + 5.5, { align: 'right' })
    y2 += 8

    // Base row
    fill('#f8f8f8'); doc.rect(M, y2, TW2, 8, 'F')
    font('normal', 8); tcolor(TX); doc.text('Base', M + 4, y2 + 5.5)
    font('normal', 8); tcolor(MU); doc.text('Ponto de partida da analise', M + TW2 * 0.48, y2 + 5.5)
    font('bold',   8); tcolor(TX); doc.text('600', M + TW2 - 4, y2 + 5.5, { align: 'right' })
    tableRowLine(); y2 += 8

    factors.forEach((f, i) => {
      fill(i % 2 === 0 ? '#ffffff' : '#f8f8f8')
      doc.rect(M, y2, TW2, 8, 'F')
      font('normal', 8); tcolor(TX); doc.text(f.label, M + 4, y2 + 5.5)
      font('normal', 8); tcolor(MU); doc.text(f.detail, M + TW2 * 0.48, y2 + 5.5)
      font('bold',   8)
      tcolor(f.delta > 0 ? '#10b981' : f.delta < 0 ? '#ef4444' : MU)
      doc.text(f.delta > 0 ? `+${f.delta}` : f.delta === 0 ? '+0' : String(f.delta), M + TW2 - 4, y2 + 5.5, { align: 'right' })
      tableRowLine(); y2 += 8
    })

    // Total row
    fill(G); doc.rect(M, y2, TW2, 9, 'F')
    font('bold', 8); tcolor(IV)
    doc.text('SCORE FINAL', M + 4, y2 + 6)
    doc.text(String(score2), M + TW2 - 4, y2 + 6, { align: 'right' })
    y2 += 14

    // ── Restrictions (if any) ────────────────────────────────────────────
    if (credit.restrictions.length > 0) {
      sec2('RESTRICOES IDENTIFICADAS')
      credit.restrictions.forEach(r => {
        const lines    = doc.splitTextToSize(r, TW2 - 18)
        const bannerH  = Math.max(14, lines.length * 5 + 8)
        fill('#fee2e2'); stroke('#dc2626')
        doc.setLineWidth(0.4)
        doc.roundedRect(M, y2, TW2, bannerH, 2, 2, 'FD')
        font('bold',   9); tcolor('#b91c1c'); doc.text('!', M + 5, y2 + bannerH / 2 + 1.5)
        font('normal', 8); tcolor('#7f1d1d'); doc.text(lines, M + 13, y2 + 5.5)
        y2 += bannerH + 4
      })
    }

    // ── Income commitment ─────────────────────────────────────────────────
    sec2('COMPROMETIMENTO DE RENDA (regra SFH - max. 30%)')

    fill(G); doc.rect(M, y2, TW2, 8, 'F')
    font('bold', 7); tcolor(IV)
    doc.text('ITEM', M + 4, y2 + 5.5)
    doc.text('DESCRICAO', M + TW2 * 0.48, y2 + 5.5)
    doc.text('VALOR', M + TW2 - 4, y2 + 5.5, { align: 'right' })
    y2 += 8

    const commitRows: [string, string, string, string][] = [
      ['Renda bruta mensal',      lead.spouse ? 'Titular + conjuge' : 'Renda declarada',             formatCurrency(totalIncome2),              TX],
      ['Teto de parcela (30%)',   'Limite maximo pelo SFH',                                           formatCurrency(maxInstallment),             '#10b981'],
      ['1a parcela SAC estimada', `Imovel de ${formatCurrency(lead.property_value)} em ${termMonths} meses`, formatCurrency(sacFirst2),          TX],
      [gap >= 0 ? 'Folga mensal' : 'Deficit mensal', gap >= 0 ? 'Margem disponivel apos a parcela' : 'Parcela supera o teto SFH', formatCurrency(Math.abs(gap)), gap >= 0 ? '#10b981' : '#ef4444'],
    ]

    commitRows.forEach(([label, detail, value, valueColor], i) => {
      fill(i % 2 === 0 ? '#ffffff' : '#f8f8f8')
      doc.rect(M, y2, TW2, 8, 'F')
      font('normal', 8); tcolor(TX);  doc.text(label,  M + 4,         y2 + 5.5)
      font('normal', 8); tcolor(MU);  doc.text(detail, M + TW2 * 0.48, y2 + 5.5)
      font('bold',   9); tcolor(valueColor); doc.text(value, M + TW2 - 4, y2 + 5.5, { align: 'right' })
      tableRowLine(); y2 += 8
    })

    // ── Footer page 2 ────────────────────────────────────────────────────
    fill(G); doc.rect(0, H - 14, W, 14, 'F')
    font('normal', 7); tcolor(IV)
    doc.text(`Gerado por ${brandName} · Plataforma de Gestao de Leads Imobiliarios · Pag. 2 de 3`, W / 2, H - 5, { align: 'center' })

    // ── Page 3: Multibank comparison ───────────────────────────────────────
    doc.addPage()

    const banks = compareMultibank({
      income:         lead.income,
      work_regime:    lead.work_regime,
      birth_date:     lead.birth_date || '1990-01-01',
      property_value: lead.property_value,
      fgts:           lead.fgts,
      down_payment:   lead.down_payment,
      spouse_income:  lead.spouse?.income ?? 0,
      ocr_income:     null,
    })
    const eligibleBanks = banks.filter(b => b.eligible)
    const bestBank = eligibleBanks.length > 0
      ? eligibleBanks.reduce((best, b) => (b.total_first_installment_sac < best.total_first_installment_sac ? b : best))
      : null
    const ineligibleBanks = banks.filter(b => !b.eligible)

    let y3 = 0
    const TW3 = W - M * 2
    const c0 = M + 4
    const c1 = M + TW3 * 0.46
    const c2 = M + TW3 * 0.65
    const cR = M + TW3 - 4

    const sec3 = (title: string) => {
      font('bold', 7); tcolor(MU)
      doc.text(title, M, y3)
      y3 += 4
      stroke(BD); doc.setLineWidth(0.2)
      doc.line(M, y3, W - M, y3)
      y3 += 8
    }

    // Header strip
    fill(G); doc.rect(0, 0, W, 30, 'F')
    font('bold', 13); tcolor(IV)
    doc.text('COMPARATIVO MULTIBANCOS', M, 19)
    font('normal', 8); tcolor(BE)
    doc.text(lead.name, W - M, 19, { align: 'right' })
    y3 = 40

    // ── Simulation table ─────────────────────────────────────────────────
    sec3('SIMULACAO POR INSTITUICAO (taxa, LTV e seguros MIP + DFI ja somados a parcela)')

    fill(G); doc.rect(M, y3, TW3, 8, 'F')
    font('bold', 7); tcolor(IV)
    doc.text('BANCO / LINHA',       c0, y3 + 5.5)
    doc.text('TAXA A.A.',           c1, y3 + 5.5)
    doc.text('FINANC. MAX (SAC)',   c2, y3 + 5.5)
    doc.text('1a PARCELA TOTAL',    cR, y3 + 5.5, { align: 'right' })
    y3 += 8

    banks.forEach((b, i) => {
      fill(i % 2 === 0 ? '#ffffff' : '#f8f8f8')
      doc.rect(M, y3, TW3, 13, 'F')
      font('bold', 8);   tcolor(G);  doc.text(b.bank,    c0, y3 + 5.5)
      font('normal', 7); tcolor(MU); doc.text(b.product, c0, y3 + 10.5)
      font('normal', 8); tcolor(TX)
      doc.text(`${(b.annual_rate * 100).toFixed(2).replace('.', ',')}% + TR`, c1, y3 + 7.5)
      doc.text(formatCurrency(b.max_financing_sac), c2, y3 + 7.5)
      font('bold', 8); tcolor(b.income_commitment_pct > 30 ? '#ef4444' : TX)
      doc.text(formatCurrency(b.total_first_installment_sac), cR, y3 + 7.5, { align: 'right' })
      font('normal', 7); tcolor(b.income_commitment_pct > 30 ? '#ef4444' : '#10b981')
      doc.text(`${b.income_commitment_pct.toFixed(1).replace('.', ',')}% da renda comprometida`, cR, y3 + 11.5, { align: 'right' })
      stroke(BD); doc.setLineWidth(0.2)
      doc.line(M, y3 + 13, M + TW3, y3 + 13)
      y3 += 13
    })

    y3 += 6
    if (bestBank) {
      font('bold', 7); tcolor('#10b981')
      doc.text(`* Melhor custo-beneficio: ${bestBank.bank} - ${bestBank.product}`, M, y3)
      y3 += 6
    }
    if (ineligibleBanks.length > 0) {
      font('bold', 7); tcolor('#ef4444')
      const list = ineligibleBanks.map(b => `${b.bank} (${b.product})`).join(', ')
      doc.text(doc.splitTextToSize(`* Nao elegiveis no perfil atual: ${list}`, TW3), M, y3)
      y3 += 6
    }
    y3 += 8

    // ── Insurance breakdown table ────────────────────────────────────────
    sec3('DETALHAMENTO DE SEGUROS (MIP + DFI somados antes do teto SFH de 30%)')

    const i0 = M + 4
    const iA = M + TW3 * 0.55
    const iB = M + TW3 * 0.74
    const iC = M + TW3 - 4

    fill(G); doc.rect(M, y3, TW3, 8, 'F')
    font('bold', 7); tcolor(IV)
    doc.text('BANCO / LINHA',        i0, y3 + 5.5)
    doc.text('PARCELA BASE (SAC)',   iA, y3 + 5.5, { align: 'right' })
    doc.text('MIP / MES',            iB, y3 + 5.5, { align: 'right' })
    doc.text('DFI / MES',            iC, y3 + 5.5, { align: 'right' })
    y3 += 8

    banks.forEach((b, i) => {
      fill(i % 2 === 0 ? '#ffffff' : '#f8f8f8')
      doc.rect(M, y3, TW3, 8, 'F')
      font('normal', 8); tcolor(TX)
      doc.text(`${b.bank} - ${b.product}`, i0, y3 + 5.5)
      doc.text(formatCurrency(b.first_installment_sac), iA, y3 + 5.5, { align: 'right' })
      doc.text(formatCurrency(b.mip_monthly),           iB, y3 + 5.5, { align: 'right' })
      doc.text(formatCurrency(b.dfi_monthly),           iC, y3 + 5.5, { align: 'right' })
      stroke(BD); doc.setLineWidth(0.2)
      doc.line(M, y3 + 8, M + TW3, y3 + 8)
      y3 += 8
    })

    font('normal', 7); tcolor(MU)
    doc.text('Taxas e seguros sao estimativas para fins comparativos, sujeitas a confirmacao bancaria.', M, y3 + 8)

    // ── Footer page 3 ────────────────────────────────────────────────────
    fill(G); doc.rect(0, H - 14, W, 14, 'F')
    font('normal', 7); tcolor(IV)
    doc.text(`Gerado por ${brandName} · Plataforma de Gestao de Leads Imobiliarios · Pag. 3 de 3`, W / 2, H - 5, { align: 'center' })
  }

  doc.save(`domus-${lead.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
