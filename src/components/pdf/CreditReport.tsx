'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { Lead } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { analyzeCreditEligibility, compareMultibank } from '@/lib/credit-engine'

Font.register({
  family: 'DM Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa4ET-DNl0.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa4Hd-DNl0.woff2', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZa4ET-DNl0.woff2', fontWeight: 700 },
  ],
})

const c = {
  brand:      '#0F3D2E',
  ivory:      '#FAF7F2',
  ink700:     '#2E3A33',
  ink500:     '#5A6660',
  ink300:     '#98A19B',
  ink100:     '#E4DED1',
  success:    '#2E7D5B',
  successBg:  '#DDEDE3',
  successTxt: '#166534',
  danger:     '#B23A2A',
  dangerBg:   '#F2DAD5',
  dangerTxt:  '#7f1d1d',
  warn:       '#C68A2E',
  beige:      '#D5C2A1',
  beigeLight: '#F6F0E2',
  white:      '#FFFFFF',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'DM Sans',
    backgroundColor: c.ivory,
    padding: 40,
    color: c.ink700,
    fontSize: 11,
    lineHeight: 1.45,
  },
  header: {
    backgroundColor: c.brand,
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoText:   { fontFamily: 'DM Sans', fontWeight: 700, fontSize: 18, color: c.ivory, letterSpacing: 3 },
  headerDate: { fontSize: 10, color: 'rgba(250,247,242,0.5)' },
  headerName: { fontSize: 20, fontWeight: 500, color: c.ivory, marginBottom: 3 },
  headerSub:  { fontSize: 11, color: 'rgba(250,247,242,0.65)' },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: { fontSize: 10, color: c.ivory, letterSpacing: 1 },

  section:      { marginBottom: 16 },
  sectionTitle: {
    fontFamily: 'DM Sans',
    fontWeight: 500,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.ink300,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: `1px solid ${c.ink100}`,
  },

  grid2: { flexDirection: 'row', gap: 10 },
  col:   { flex: 1 },

  card: {
    backgroundColor: c.white,
    borderRadius: 8,
    border: `1px solid ${c.ink100}`,
    padding: 14,
    marginBottom: 8,
  },
  cardAccent: {
    backgroundColor: c.beigeLight,
    borderRadius: 8,
    border: `1px solid ${c.beige}`,
    padding: 14,
  },
  bannerOk: {
    backgroundColor: c.successBg,
    borderRadius: 8,
    border: `1px solid ${c.success}`,
    padding: '10px 14px',
    marginBottom: 16,
  },
  bannerFail: {
    backgroundColor: c.dangerBg,
    borderRadius: 8,
    border: `1px solid ${c.danger}`,
    padding: '10px 14px',
    marginBottom: 16,
  },
  bannerTitle: { fontWeight: 700, fontSize: 13, marginBottom: 3 },
  bannerSub:   { fontSize: 11 },

  restrictionItem: {
    backgroundColor: c.dangerBg,
    border: `1px solid ${c.danger}`,
    borderRadius: 6,
    padding: '8px 12px',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  restrictionMark: { fontSize: 11, fontWeight: 700, color: c.danger, marginTop: 1 },
  restrictionText: { fontSize: 11, color: c.dangerTxt, flex: 1, lineHeight: 1.5 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottom: `1px solid ${c.ink100}`,
  },
  rowLabel: { fontSize: 11, color: c.ink500 },
  rowValue: { fontSize: 11, fontWeight: 500, color: c.ink700 },

  bigNum:   { fontSize: 26, fontWeight: 500, color: c.brand, letterSpacing: -0.5, lineHeight: 1, marginBottom: 2 },
  bigLabel: { fontSize: 10, color: c.ink500 },

  scoreNum: { fontSize: 34, fontWeight: 700, letterSpacing: -1, lineHeight: 1 },
  scoreBar: { height: 5, backgroundColor: c.ink100, borderRadius: 3, marginTop: 5, marginBottom: 3 },
  scoreBarFill: { height: 5, borderRadius: 3 },
  scoreScale: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: c.ink300 },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: c.brand,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: '4px 4px 0 0',
  },
  tableRow:      { flexDirection: 'row', borderBottom: `1px solid ${c.ink100}`, paddingVertical: 8, paddingHorizontal: 10 },
  tableRowAlt:   { flexDirection: 'row', borderBottom: `1px solid ${c.ink100}`, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#f8f8f8' },
  tableRowTotal: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: c.brand, borderRadius: '0 0 4px 4px' },
  tableCell:     { flex: 1, fontSize: 10, color: c.ink700 },
  tableCellMono: { flex: 1, fontSize: 10, color: c.ink700, fontWeight: 500 },
  tableHeadCell: { flex: 1, fontSize: 9, color: c.ivory, fontWeight: 500, letterSpacing: 0.8, textTransform: 'uppercase' },
  tableTotalCell:{ flex: 1, fontSize: 10, color: c.ivory, fontWeight: 700 },

  commitTable: {
    border: `1px solid ${c.ink100}`,
    borderRadius: 8,
    overflow: 'hidden',
  },

  footer: {
    marginTop: 28,
    paddingTop: 10,
    borderTop: `1px solid ${c.ink100}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 9, color: c.ink300 },
})

interface Props { lead: Lead }

export function CreditReportDocument({ lead }: Props) {
  const totalIncome   = lead.income + (lead.spouse?.income ?? 0)
  const maxInstallment = totalIncome * 0.30
  const scoreColor    = (lead.credit_score ?? 0) >= 700 ? c.success : (lead.credit_score ?? 0) >= 500 ? c.warn : c.danger

  const RATE = 0.0762 / 12
  const TERM = 360
  const calcSAC   = (pv: number) => pv / TERM + pv * RATE
  const calcPRICE = (pv: number) => pv * (RATE * Math.pow(1 + RATE, TERM)) / (Math.pow(1 + RATE, TERM) - 1)

  // Derive detailed credit result
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

  const age       = new Date().getFullYear() - new Date(lead.birth_date || '1990-01-01').getFullYear()
  const termMonths = Math.max(12, Math.min(360, (80 - age) * 12))
  const sacFirst  = lead.property_value > 0 ? lead.property_value / termMonths + lead.property_value * RATE : 0
  const gap       = maxInstallment - sacFirst

  const ratio   = lead.property_value > 0 ? (totalIncome * 12) / lead.property_value : 0
  const downPct = lead.property_value > 0 ? ((lead.down_payment ?? 0) + (lead.fgts ?? 0)) / lead.property_value : 0
  const regimeBonus: Record<string, number> = {
    'CLT': 60, 'Servidor Público': 80, 'Servidor Publico': 80,
    'Liberal': 20, 'Empresário': 10, 'Empresario': 10,
    'Autônomo': 0, 'Autonomo': 0,
  }

  const factors = [
    {
      label:  'Renda × valor do imóvel',
      delta:  ratio >= 0.12 ? +80 : ratio >= 0.08 ? +40 : -80,
      detail: `Renda anual = ${Math.round(ratio * 100)}% do imóvel`,
    },
    {
      label:  'Vínculo empregatício',
      delta:  regimeBonus[lead.work_regime] ?? 0,
      detail: lead.work_regime,
    },
    {
      label:  'Faixa etária',
      delta:  age < 40 ? +30 : age > 65 ? -60 : 0,
      detail: `${age} anos`,
    },
    {
      label:  'Entrada + FGTS',
      delta:  downPct >= 0.3 ? +80 : downPct >= 0.2 ? +40 : 0,
      detail: downPct > 0 ? `${Math.round(downPct * 100)}% do imóvel` : 'Nenhuma entrada',
    },
  ]

  const approved = credit.can_finance

  // Multibank comparison
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
  const bestBankId = eligibleBanks.length > 0
    ? eligibleBanks.reduce((best, b) => (b.total_first_installment_sac < best.total_first_installment_sac ? b : best)).id
    : null

  return (
    <Document>
      {/* ── Page 1: Summary ── */}
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={s.logoText}>DOMUS</Text>
            <Text style={s.headerDate}>Emitido em {formatDate(new Date().toISOString())}</Text>
          </View>
          <Text style={s.headerName}>{lead.name}</Text>
          <Text style={s.headerSub}>{lead.email} · {lead.whatsapp}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>LAUDO DE ANÁLISE DE CRÉDITO</Text>
          </View>
        </View>

        {/* Score */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Score de Crédito Habitacional</Text>
          <View style={s.card}>
            <Text style={[s.scoreNum, { color: scoreColor }]}>{lead.credit_score ?? '—'}</Text>
            <View style={s.scoreBar}>
              <View style={[s.scoreBarFill, { width: `${((lead.credit_score ?? 0) / 1000) * 100}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={{ fontSize: 10, color: c.ink500 }}>
              {(lead.credit_score ?? 0) >= 700 ? 'Excelente — Alta probabilidade de aprovação' :
               (lead.credit_score ?? 0) >= 500 ? 'Regular — Aprovação condicionada à renda' :
               'Baixo — Recomenda-se regularização antes do pedido'}
            </Text>
          </View>
        </View>

        {/* Financial summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Perfil Financeiro</Text>
          <View style={s.grid2}>
            <View style={[s.cardAccent, s.col]}>
              <Text style={s.bigLabel}>Renda bruta total</Text>
              <Text style={s.bigNum}>{formatCurrency(totalIncome)}</Text>
              {lead.spouse && <Text style={{ fontSize: 9, color: c.ink500 }}>Titular + cônjuge</Text>}
            </View>
            <View style={[s.cardAccent, s.col]}>
              <Text style={s.bigLabel}>Teto de parcela (30%)</Text>
              <Text style={s.bigNum}>{formatCurrency(maxInstallment)}</Text>
              <Text style={{ fontSize: 9, color: c.ink500 }}>Regra SFH — máximo comprometível</Text>
            </View>
          </View>
        </View>

        {/* Financing table */}
        {lead.max_financing_sac && lead.max_financing_price && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Capacidade de Financiamento — SAC / PRICE</Text>
            <View style={{ border: `1px solid ${c.ink100}`, borderRadius: 8, overflow: 'hidden' }}>
              <View style={s.tableHeader}>
                {['Sistema', 'Valor máximo', '1ª Parcela (est.)', 'Prazo', 'Taxa'].map(h => (
                  <Text key={h} style={s.tableHeadCell}>{h}</Text>
                ))}
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { fontWeight: 500, color: c.brand }]}>SAC</Text>
                <Text style={s.tableCellMono}>{formatCurrency(lead.max_financing_sac)}</Text>
                <Text style={s.tableCell}>{formatCurrency(calcSAC(lead.max_financing_sac))}</Text>
                <Text style={s.tableCell}>360 meses</Text>
                <Text style={s.tableCell}>7,62% a.a.</Text>
              </View>
              <View style={[s.tableRow, { borderBottom: 'none' }]}>
                <Text style={[s.tableCell, { fontWeight: 500, color: c.brand }]}>PRICE</Text>
                <Text style={s.tableCellMono}>{formatCurrency(lead.max_financing_price)}</Text>
                <Text style={s.tableCell}>{formatCurrency(calcPRICE(lead.max_financing_price))}</Text>
                <Text style={s.tableCell}>360 meses</Text>
                <Text style={s.tableCell}>7,62% a.a.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Registration data */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados Cadastrais</Text>
          <View style={s.card}>
            {([
              ['CPF', lead.cpf],
              ['RG', `${lead.rg}${lead.rg_organ ? ` (${lead.rg_organ})` : ''}`],
              ['Data de nascimento', formatDate(lead.birth_date)],
              ['Estado civil', lead.marital_status],
              ['Regime de trabalho', lead.work_regime],
              ['Imóvel pretendido', formatCurrency(lead.property_value)],
              ['Região de interesse', lead.region],
              ['FGTS disponível', lead.fgts ? formatCurrency(lead.fgts) : '—'],
              ['Entrada disponível', lead.down_payment ? formatCurrency(lead.down_payment) : '—'],
            ] as [string, string][]).map(([label, value]) => (
              <View key={label} style={s.row}>
                <Text style={s.rowLabel}>{label}</Text>
                <Text style={s.rowValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>DOMUS · Plataforma de Qualificação Imobiliária · Pág. 1 de 2</Text>
          <Text style={s.footerText}>Este laudo é indicativo e não substitui análise bancária formal.</Text>
        </View>
      </Page>

      {/* ── Page 2: Detailed credit analysis ── */}
      <Page size="A4" style={s.page}>

        {/* Page 2 header */}
        <View style={[s.header, { marginBottom: 16 }]}>
          <View style={s.headerTop}>
            <Text style={s.logoText}>DOMUS</Text>
            <Text style={s.headerDate}>{lead.name}</Text>
          </View>
          <Text style={[s.badgeText, { color: c.ivory, fontSize: 13, fontWeight: 500 }]}>
            ANÁLISE DE CRÉDITO — DETALHAMENTO
          </Text>
        </View>

        {/* Decision banner */}
        <View style={approved ? s.bannerOk : s.bannerFail}>
          <Text style={[s.bannerTitle, { color: approved ? c.successTxt : c.danger }]}>
            {approved ? '✓  Crédito Pré-Aprovado' : '✗  Crédito Recusado'}
          </Text>
          <Text style={[s.bannerSub, { color: approved ? c.successTxt : c.dangerTxt }]}>
            {approved
              ? `Score ${lead.credit_score} — capacidade máxima de ${formatCurrency(lead.max_financing_sac ?? 0)} pelo sistema SAC.`
              : credit.restrictions.length > 0
                ? credit.restrictions[0]
                : `Score ${lead.credit_score} abaixo do mínimo exigido pelos bancos (400 pontos).`
            }
          </Text>
        </View>

        {/* Score + factors */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Composição do Score (base: 600 pontos)</Text>
          <View style={{ border: `1px solid ${c.ink100}`, borderRadius: 8, overflow: 'hidden' }}>
            {/* Header */}
            <View style={s.tableHeader}>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Fator</Text>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Detalhe</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Pontos</Text>
            </View>
            {/* Base */}
            <View style={s.tableRowAlt}>
              <Text style={[s.tableCell, { flex: 2 }]}>Base</Text>
              <Text style={[s.tableCell, { flex: 3, color: c.ink500 }]}>Ponto de partida da análise</Text>
              <Text style={[s.tableCellMono, { textAlign: 'right' }]}>600</Text>
            </View>
            {/* Factors */}
            {factors.map((f, i) => (
              <View key={f.label} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 2 }]}>{f.label}</Text>
                <Text style={[s.tableCell, { flex: 3, color: c.ink500 }]}>{f.detail}</Text>
                <Text style={[s.tableCellMono, {
                  textAlign: 'right',
                  color: f.delta > 0 ? c.success : f.delta < 0 ? c.danger : c.ink500,
                  fontWeight: 700,
                }]}>
                  {f.delta > 0 ? `+${f.delta}` : f.delta === 0 ? '±0' : String(f.delta)}
                </Text>
              </View>
            ))}
            {/* Total */}
            <View style={s.tableRowTotal}>
              <Text style={[s.tableTotalCell, { flex: 2 }]}>Score final</Text>
              <Text style={[s.tableTotalCell, { flex: 3 }]} />
              <Text style={[s.tableTotalCell, { textAlign: 'right' }]}>{lead.credit_score}</Text>
            </View>
          </View>
        </View>

        {/* Restrictions */}
        {credit.restrictions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Restrições Identificadas</Text>
            {credit.restrictions.map((r, i) => (
              <View key={i} style={s.restrictionItem}>
                <Text style={s.restrictionMark}>!</Text>
                <Text style={s.restrictionText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Income commitment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Comprometimento de Renda — Regra SFH (máx. 30%)</Text>
          <View style={{ border: `1px solid ${c.ink100}`, borderRadius: 8, overflow: 'hidden' }}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Item</Text>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Descrição</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Valor</Text>
            </View>
            {([
              { label: 'Renda bruta mensal',       detail: lead.spouse ? 'Titular + cônjuge' : 'Renda declarada',                     value: formatCurrency(totalIncome),      color: c.ink700 },
              { label: 'Teto de parcela (30%)',     detail: 'Limite máximo pelo SFH',                                                  value: formatCurrency(maxInstallment),   color: c.success },
              { label: '1ª parcela SAC estimada',   detail: `Imóvel de ${formatCurrency(lead.property_value)} em ${termMonths} meses`, value: formatCurrency(sacFirst),         color: c.ink700 },
              { label: gap >= 0 ? 'Folga mensal' : 'Déficit mensal',
                detail: gap >= 0 ? 'Margem disponível após a parcela' : 'Parcela supera o teto SFH',
                value: formatCurrency(Math.abs(gap)),
                color: gap >= 0 ? c.success : c.danger,
              },
            ]).map((row, i) => (
              <View key={row.label} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 2 }]}>{row.label}</Text>
                <Text style={[s.tableCell, { flex: 3, color: c.ink500 }]}>{row.detail}</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right', color: row.color, fontWeight: 700 }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>DOMUS · Plataforma de Qualificação Imobiliária · Pág. 2 de 3</Text>
          <Text style={s.footerText}>Este laudo é indicativo e não substitui análise bancária formal.</Text>
        </View>
      </Page>

      {/* ── Page 3: Multibank comparison ── */}
      <Page size="A4" style={s.page}>

        <View style={[s.header, { marginBottom: 16 }]}>
          <View style={s.headerTop}>
            <Text style={s.logoText}>DOMUS</Text>
            <Text style={s.headerDate}>{lead.name}</Text>
          </View>
          <Text style={[s.badgeText, { color: c.ivory, fontSize: 13, fontWeight: 500 }]}>
            COMPARATIVO MULTIBANCOS — SIMULAÇÃO POR INSTITUIÇÃO
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Simulação considerando taxa, LTV e seguros (MIP + DFI) de cada banco</Text>
          <View style={{ border: `1px solid ${c.ink100}`, borderRadius: 8, overflow: 'hidden' }}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Banco / Linha</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Taxa a.a.</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Financ. máx. (SAC)</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>1ª parcela total</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Renda comprometida</Text>
            </View>
            {banks.map((b, i) => (
              <View key={b.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <View style={{ flex: 2 }}>
                  <Text style={[s.tableCell, { fontWeight: 500, color: c.brand }]}>{b.bank}</Text>
                  <Text style={{ fontSize: 9, color: c.ink500 }}>
                    {b.product}{b.id === bestBankId ? '  ·  Melhor custo-benefício' : !b.eligible ? '  ·  Não elegível' : ''}
                  </Text>
                </View>
                <Text style={[s.tableCellMono, { textAlign: 'right' }]}>{(b.annual_rate * 100).toFixed(2).replace('.', ',')}% + TR</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right' }]}>{formatCurrency(b.max_financing_sac)}</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right' }]}>{formatCurrency(b.total_first_installment_sac)}</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right', color: b.income_commitment_pct > 30 ? c.danger : c.success, fontWeight: 700 }]}>
                  {b.income_commitment_pct.toFixed(1).replace('.', ',')}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Detalhamento de seguros (MIP + DFI somados à parcela antes do teto SFH)</Text>
          <View style={{ border: `1px solid ${c.ink100}`, borderRadius: 8, overflow: 'hidden' }}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeadCell, { flex: 2 }]}>Banco / Linha</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Parcela base (SAC)</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>MIP / mês</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>DFI / mês</Text>
              <Text style={[s.tableHeadCell, { textAlign: 'right' }]}>Notas</Text>
            </View>
            {banks.map((b, i) => (
              <View key={b.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tableCell, { flex: 2, fontWeight: 500, color: c.brand }]}>{b.bank} — {b.product}</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right' }]}>{formatCurrency(b.first_installment_sac)}</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right' }]}>{formatCurrency(b.mip_monthly)}</Text>
                <Text style={[s.tableCellMono, { textAlign: 'right' }]}>{formatCurrency(b.dfi_monthly)}</Text>
                <Text style={{ flex: 1.4, fontSize: 8, color: c.ink500, textAlign: 'right' }}>
                  {b.notes.length > 0 ? b.notes.join(' · ') : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>DOMUS · Plataforma de Qualificação Imobiliária · Pág. 3 de 3</Text>
          <Text style={s.footerText}>Taxas e seguros são estimativas para fins comparativos — sujeitos a confirmação bancária.</Text>
        </View>
      </Page>
    </Document>
  )
}
