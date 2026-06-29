# Calculadora de Precificação — Especificação de Implementação

**Status:** Pendente de implementação  
**Módulo:** `/dashboard/precificacao`  
**Metodologia:** Modelo Hedônico — ABNT NBR 14653 (simplificado)  
**Dependências externas:** Nenhuma — 100% interno à plataforma

---

## Contexto

Não existe API pública gratuita de precificação imobiliária no Brasil.
ZAP, VivaReal e DataZAP são todas comerciais/fechadas.

A solução é um modelo de precificação hedônico com:
- **Base de preços/m²** por capital/estado (fonte: FIPE ZAP, dados publicados trimestralmente)
- **Coeficientes de ajuste** por características do imóvel
- **Capitalização de custos** (condomínio e IPTU reduzem valor de mercado)
- **Estimativa de locação** por yield médio de mercado por cidade

Precisão esperada: **±15–20%** — adequada para orientação inicial, não substitui laudo técnico.

---

## Arquivos a Criar / Modificar

```
src/
├── app/
│   ├── api/
│   │   └── pricing/
│   │       └── estimate/
│   │           └── route.ts          ← API endpoint (POST)
│   └── dashboard/
│       └── precificacao/
│           └── page.tsx              ← Substituir totalmente (adicionar view de resultado)
└── lib/
    └── pricing-model.ts              ← Motor de cálculo + tabela de dados
```

---

## 1. Modelo de Dados — `src/lib/pricing-model.ts`

### 1.1 Tabela de Preços Base por Cidade

Preço médio de **venda** por m² (R$), fonte: FIPE ZAP Índice 2024/2025.

```typescript
export type CityTier = 'premium' | 'standard' | 'interior'

export interface CityData {
  basePricePerM2: number   // R$ por m² (venda)
  rentalYield: number      // yield mensal médio (ex: 0.0050 = 0,50%/mês)
  parkingValue: number     // valor por vaga (R$)
  tier: CityTier
}

export const CITY_PRICES: Record<string, CityData> = {
  // ── São Paulo ──────────────────────────────────────────────────────
  'São Paulo':        { basePricePerM2: 10200, rentalYield: 0.0048, parkingValue: 35000, tier: 'premium'  },
  'Campinas':         { basePricePerM2:  7100, rentalYield: 0.0052, parkingValue: 22000, tier: 'standard' },
  'Santos':           { basePricePerM2:  8400, rentalYield: 0.0050, parkingValue: 25000, tier: 'standard' },
  'São Bernardo do Campo': { basePricePerM2: 6800, rentalYield: 0.0053, parkingValue: 20000, tier: 'standard' },
  'Guarulhos':        { basePricePerM2:  5900, rentalYield: 0.0055, parkingValue: 18000, tier: 'standard' },
  'Ribeirão Preto':   { basePricePerM2:  6200, rentalYield: 0.0055, parkingValue: 18000, tier: 'standard' },
  'São José dos Campos': { basePricePerM2: 6600, rentalYield: 0.0052, parkingValue: 20000, tier: 'standard' },
  'Sorocaba':         { basePricePerM2:  5400, rentalYield: 0.0057, parkingValue: 15000, tier: 'standard' },

  // ── Rio de Janeiro ─────────────────────────────────────────────────
  'Rio de Janeiro':   { basePricePerM2:  9400, rentalYield: 0.0046, parkingValue: 32000, tier: 'premium'  },
  'Niterói':          { basePricePerM2:  7800, rentalYield: 0.0050, parkingValue: 24000, tier: 'standard' },

  // ── Minas Gerais ───────────────────────────────────────────────────
  'Belo Horizonte':   { basePricePerM2:  6400, rentalYield: 0.0052, parkingValue: 20000, tier: 'standard' },
  'Uberlândia':       { basePricePerM2:  4800, rentalYield: 0.0058, parkingValue: 13000, tier: 'interior' },

  // ── Distrito Federal ───────────────────────────────────────────────
  'Brasília':         { basePricePerM2:  8600, rentalYield: 0.0048, parkingValue: 28000, tier: 'premium'  },

  // ── Paraná ─────────────────────────────────────────────────────────
  'Curitiba':         { basePricePerM2:  7200, rentalYield: 0.0050, parkingValue: 22000, tier: 'standard' },
  'Londrina':         { basePricePerM2:  5100, rentalYield: 0.0057, parkingValue: 14000, tier: 'interior' },
  'Maringá':          { basePricePerM2:  5400, rentalYield: 0.0056, parkingValue: 15000, tier: 'interior' },

  // ── Rio Grande do Sul ──────────────────────────────────────────────
  'Porto Alegre':     { basePricePerM2:  5900, rentalYield: 0.0052, parkingValue: 18000, tier: 'standard' },
  'Caxias do Sul':    { basePricePerM2:  4800, rentalYield: 0.0057, parkingValue: 13000, tier: 'interior' },

  // ── Santa Catarina ─────────────────────────────────────────────────
  'Florianópolis':    { basePricePerM2:  8800, rentalYield: 0.0048, parkingValue: 28000, tier: 'premium'  },
  'Joinville':        { basePricePerM2:  5600, rentalYield: 0.0055, parkingValue: 16000, tier: 'standard' },
  'Blumenau':         { basePricePerM2:  5000, rentalYield: 0.0056, parkingValue: 14000, tier: 'interior' },

  // ── Goiás ──────────────────────────────────────────────────────────
  'Goiânia':          { basePricePerM2:  5600, rentalYield: 0.0055, parkingValue: 16000, tier: 'standard' },
  'Anápolis':         { basePricePerM2:  4200, rentalYield: 0.0060, parkingValue: 11000, tier: 'interior' },

  // ── Bahia ──────────────────────────────────────────────────────────
  'Salvador':         { basePricePerM2:  5100, rentalYield: 0.0055, parkingValue: 15000, tier: 'standard' },
  'Feira de Santana': { basePricePerM2:  3800, rentalYield: 0.0062, parkingValue: 10000, tier: 'interior' },

  // ── Ceará ──────────────────────────────────────────────────────────
  'Fortaleza':        { basePricePerM2:  5400, rentalYield: 0.0054, parkingValue: 16000, tier: 'standard' },

  // ── Pernambuco ─────────────────────────────────────────────────────
  'Recife':           { basePricePerM2:  5700, rentalYield: 0.0053, parkingValue: 17000, tier: 'standard' },

  // ── Espírito Santo ─────────────────────────────────────────────────
  'Vitória':          { basePricePerM2:  7300, rentalYield: 0.0050, parkingValue: 22000, tier: 'standard' },
  'Vila Velha':       { basePricePerM2:  6600, rentalYield: 0.0052, parkingValue: 20000, tier: 'standard' },

  // ── Pará ───────────────────────────────────────────────────────────
  'Belém':            { basePricePerM2:  4200, rentalYield: 0.0060, parkingValue: 11000, tier: 'interior' },

  // ── Amazonas ───────────────────────────────────────────────────────
  'Manaus':           { basePricePerM2:  4400, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },

  // ── Rio Grande do Norte ────────────────────────────────────────────
  'Natal':            { basePricePerM2:  5000, rentalYield: 0.0056, parkingValue: 14000, tier: 'standard' },

  // ── Paraíba ────────────────────────────────────────────────────────
  'João Pessoa':      { basePricePerM2:  4800, rentalYield: 0.0057, parkingValue: 13000, tier: 'standard' },

  // ── Maranhão ───────────────────────────────────────────────────────
  'São Luís':         { basePricePerM2:  4100, rentalYield: 0.0061, parkingValue: 11000, tier: 'interior' },

  // ── Piauí ──────────────────────────────────────────────────────────
  'Teresina':         { basePricePerM2:  3900, rentalYield: 0.0062, parkingValue: 10000, tier: 'interior' },

  // ── Mato Grosso do Sul ─────────────────────────────────────────────
  'Campo Grande':     { basePricePerM2:  5000, rentalYield: 0.0057, parkingValue: 14000, tier: 'interior' },

  // ── Mato Grosso ────────────────────────────────────────────────────
  'Cuiabá':           { basePricePerM2:  5200, rentalYield: 0.0056, parkingValue: 15000, tier: 'interior' },

  // ── Sergipe ────────────────────────────────────────────────────────
  'Aracaju':          { basePricePerM2:  4800, rentalYield: 0.0058, parkingValue: 13000, tier: 'interior' },

  // ── Alagoas ────────────────────────────────────────────────────────
  'Maceió':           { basePricePerM2:  4400, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },

  // ── Rondônia ───────────────────────────────────────────────────────
  'Porto Velho':      { basePricePerM2:  4600, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },

  // ── Tocantins ──────────────────────────────────────────────────────
  'Palmas':           { basePricePerM2:  4300, rentalYield: 0.0060, parkingValue: 11000, tier: 'interior' },

  // ── Roraima ────────────────────────────────────────────────────────
  'Boa Vista':        { basePricePerM2:  3700, rentalYield: 0.0063, parkingValue: 10000, tier: 'interior' },

  // ── Amapá ──────────────────────────────────────────────────────────
  'Macapá':           { basePricePerM2:  3600, rentalYield: 0.0064, parkingValue:  9000, tier: 'interior' },

  // ── Acre ───────────────────────────────────────────────────────────
  'Rio Branco':       { basePricePerM2:  3700, rentalYield: 0.0063, parkingValue:  9000, tier: 'interior' },
}

// Fallback por estado (quando cidade não está na tabela)
export const STATE_FALLBACK: Record<string, CityData> = {
  SP: { basePricePerM2: 6200, rentalYield: 0.0054, parkingValue: 18000, tier: 'standard' },
  RJ: { basePricePerM2: 6500, rentalYield: 0.0052, parkingValue: 19000, tier: 'standard' },
  MG: { basePricePerM2: 4800, rentalYield: 0.0057, parkingValue: 13000, tier: 'interior' },
  DF: { basePricePerM2: 8600, rentalYield: 0.0048, parkingValue: 28000, tier: 'premium'  },
  PR: { basePricePerM2: 5000, rentalYield: 0.0056, parkingValue: 14000, tier: 'interior' },
  RS: { basePricePerM2: 4800, rentalYield: 0.0057, parkingValue: 13000, tier: 'interior' },
  SC: { basePricePerM2: 5400, rentalYield: 0.0055, parkingValue: 16000, tier: 'standard' },
  GO: { basePricePerM2: 4500, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },
  BA: { basePricePerM2: 4200, rentalYield: 0.0060, parkingValue: 11000, tier: 'interior' },
  CE: { basePricePerM2: 4400, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },
  PE: { basePricePerM2: 4600, rentalYield: 0.0058, parkingValue: 13000, tier: 'interior' },
  ES: { basePricePerM2: 5500, rentalYield: 0.0055, parkingValue: 16000, tier: 'standard' },
  PA: { basePricePerM2: 3800, rentalYield: 0.0062, parkingValue: 10000, tier: 'interior' },
  AM: { basePricePerM2: 3900, rentalYield: 0.0062, parkingValue: 10000, tier: 'interior' },
  RN: { basePricePerM2: 4200, rentalYield: 0.0060, parkingValue: 11000, tier: 'interior' },
  PB: { basePricePerM2: 4000, rentalYield: 0.0061, parkingValue: 10000, tier: 'interior' },
  MA: { basePricePerM2: 3700, rentalYield: 0.0063, parkingValue:  9000, tier: 'interior' },
  PI: { basePricePerM2: 3500, rentalYield: 0.0064, parkingValue:  9000, tier: 'interior' },
  MS: { basePricePerM2: 4400, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },
  MT: { basePricePerM2: 4600, rentalYield: 0.0059, parkingValue: 12000, tier: 'interior' },
  SE: { basePricePerM2: 4200, rentalYield: 0.0060, parkingValue: 11000, tier: 'interior' },
  AL: { basePricePerM2: 3900, rentalYield: 0.0062, parkingValue: 10000, tier: 'interior' },
  RO: { basePricePerM2: 4000, rentalYield: 0.0061, parkingValue: 10000, tier: 'interior' },
  TO: { basePricePerM2: 3800, rentalYield: 0.0062, parkingValue: 10000, tier: 'interior' },
  RR: { basePricePerM2: 3400, rentalYield: 0.0065, parkingValue:  8000, tier: 'interior' },
  AP: { basePricePerM2: 3300, rentalYield: 0.0065, parkingValue:  8000, tier: 'interior' },
  AC: { basePricePerM2: 3400, rentalYield: 0.0065, parkingValue:  8000, tier: 'interior' },
}
```

### 1.2 Coeficientes de Ajuste

```typescript
// Multiplicador por tipo de imóvel
export const HOUSE_TYPE_FACTOR: Record<string, number> = {
  PENTHOUSE:  1.35,   // cobertura — premium significativo
  STUDIO:     1.20,   // maior preço/m² por ser menor
  APARTMENT:  1.00,   // base
  CONDO_HOUSE: 0.88,  // casa de condomínio — levemente abaixo do apto
  HOUSE:      0.78,   // casa — menor preço/m² em geral
}

// Multiplicador por andar (somente APARTMENT, STUDIO, PENTHOUSE)
export function floorFactor(floor: number): number {
  if (floor <= 0)  return 1.00
  if (floor <= 3)  return 1.00
  if (floor <= 8)  return 1.03
  if (floor <= 15) return 1.06
  if (floor <= 25) return 1.09
  return 1.13
}

// Multiplicador por número de quartos
export const BEDROOM_FACTOR: Record<number, number> = {
  0: 0.95,   // studio/kitnet
  1: 1.00,
  2: 1.05,
  3: 1.09,
  4: 1.12,
}
// Para 5+ quartos: usar 1.14
export function bedroomFactor(n: number): number {
  return BEDROOM_FACTOR[Math.min(n, 4)] ?? 1.14
}

// Adicional por suite (sobre o fator de quartos)
// Cada suíte agrega 2,5% de premium adicional
export const SUITE_PREMIUM_PER_UNIT = 0.025

// Multiplicador por número de banheiros (além do 1º)
export function bathroomFactor(n: number): number {
  if (n <= 1) return 1.00
  if (n === 2) return 1.03
  if (n === 3) return 1.05
  return 1.07  // 4+
}
```

### 1.3 Capitalização de Custos

> **Lógica:** condomínio e IPTU altos tornam o imóvel menos atrativo, reduzindo seu valor de mercado.
> Baseado em taxa de capitalização implícita de mercado (~8–10% a.a. para imóveis residenciais).

```typescript
/**
 * Desconto pelo condomínio mensal.
 * Fórmula: condo_mensal × 12 / taxa_cap × fator_repasse
 * Simplificado: cada R$ 1.000/mês de condo → desconto de ~R$ 30.000 no valor
 * (equivale a cap rate implícita de ~4% sobre o custo)
 * Limitado a 12% do valor estimado para não distorcer.
 */
export function condoDiscount(condoPerMonth: number, estimatedValue: number): number {
  const discount = condoPerMonth * 30
  return Math.min(discount, estimatedValue * 0.12)
}

/**
 * Desconto pelo IPTU anual.
 * Fórmula: iptu_anual × fator (5x = 20% a.a. de custo de oportunidade)
 * Cada R$ 1.000/ano → desconto de ~R$ 5.000 no valor.
 * Limitado a 8% do valor estimado.
 */
export function iptuDiscount(iptuPerYear: number, estimatedValue: number): number {
  const discount = iptuPerYear * 5
  return Math.min(discount, estimatedValue * 0.08)
}
```

### 1.4 Função Principal de Cálculo

```typescript
export interface PricingInput {
  city: string
  state: string
  houseType: string
  floor: number
  totalArea: number
  bedroomCount: number
  bathroomCount: number
  suitesCount: number
  parkingSlots: number
  condominiumPerMonth: number
  hasIptu: boolean
  iptuPerYear: number
}

export interface PricingResult {
  estimatedSaleValue: number        // valor central estimado de venda
  minSaleValue: number              // limite inferior da faixa (–15%)
  maxSaleValue: number              // limite superior da faixa (+20%)
  pricePerM2: number                // preço/m² calculado
  estimatedRentalMonth: number      // estimativa de aluguel mensal
  rentalYield: number               // yield mensal (0.0050 = 0,50%)
  confidence: 'high' | 'medium' | 'low'
  cityFound: boolean                // se a cidade estava na tabela
  baseCity: string                  // cidade usada como base (pode ser fallback)
  breakdown: {
    basePricePerM2: number
    adjustedPricePerM2: number
    areaValue: number
    parkingValue: number
    grossValue: number
    condoDiscount: number
    iptuDiscount: number
    netValue: number
  }
}

export function calculatePricing(input: PricingInput): PricingResult {
  // 1. Buscar dados da cidade (com fallback para estado)
  const cityData = CITY_PRICES[input.city] ?? STATE_FALLBACK[input.state]
  const cityFound = !!CITY_PRICES[input.city]
  const baseCity = cityFound ? input.city : `${input.state} (média estadual)`

  if (!cityData) {
    // Fallback absoluto: média nacional estimada
    return calculateWithBase(input, {
      basePricePerM2: 5000, rentalYield: 0.0055,
      parkingValue: 15000, tier: 'interior',
    }, false, 'Brasil (média nacional)')
  }

  return calculateWithBase(input, cityData, cityFound, baseCity)
}

function calculateWithBase(
  input: PricingInput,
  cityData: CityData,
  cityFound: boolean,
  baseCity: string
): PricingResult {
  const { houseType, floor, totalArea, bedroomCount, bathroomCount,
          suitesCount, parkingSlots, condominiumPerMonth, hasIptu, iptuPerYear } = input

  // 2. Aplicar coeficientes ao preço/m²
  const typeFactor    = HOUSE_TYPE_FACTOR[houseType] ?? 1.0
  const floorMult     = (houseType === 'HOUSE' || houseType === 'CONDO_HOUSE')
                          ? 1.0
                          : floorFactor(floor)
  const bedroomMult   = bedroomFactor(bedroomCount)
  const bathroomMult  = bathroomFactor(bathroomCount)
  const suitePremium  = 1 + (suitesCount * SUITE_PREMIUM_PER_UNIT)

  const adjustedPricePerM2 = cityData.basePricePerM2
    * typeFactor
    * floorMult
    * bedroomMult
    * bathroomMult
    * suitePremium

  // 3. Valor base pela área
  const areaValue    = adjustedPricePerM2 * totalArea
  const parkingValue = cityData.parkingValue * parkingSlots
  const grossValue   = areaValue + parkingValue

  // 4. Aplicar descontos de custo
  const condoDisc = condoDiscount(condominiumPerMonth, grossValue)
  const iptuDisc  = hasIptu ? iptuDiscount(iptuPerYear, grossValue) : 0
  const netValue  = grossValue - condoDisc - iptuDisc

  // 5. Faixa de confiança
  // Cidades na tabela: ±15% / Fallback estadual: ±20%
  const spread = cityFound ? 0.15 : 0.20
  const minSaleValue = Math.round(netValue * (1 - spread) / 1000) * 1000
  const maxSaleValue = Math.round(netValue * (1 + spread) / 1000) * 1000
  const estimatedSaleValue = Math.round(netValue / 1000) * 1000

  // 6. Estimativa de locação
  const estimatedRentalMonth = Math.round(
    (estimatedSaleValue * cityData.rentalYield) / 50
  ) * 50  // arredondado para R$ 50

  // 7. Confiança
  const confidence: PricingResult['confidence'] =
    cityFound && totalArea >= 20 && totalArea <= 600 ? 'high' :
    cityFound ? 'medium' :
    'low'

  return {
    estimatedSaleValue,
    minSaleValue,
    maxSaleValue,
    pricePerM2: Math.round(adjustedPricePerM2),
    estimatedRentalMonth,
    rentalYield: cityData.rentalYield,
    confidence,
    cityFound,
    baseCity,
    breakdown: {
      basePricePerM2:     Math.round(cityData.basePricePerM2),
      adjustedPricePerM2: Math.round(adjustedPricePerM2),
      areaValue:          Math.round(areaValue),
      parkingValue:       Math.round(parkingValue),
      grossValue:         Math.round(grossValue),
      condoDiscount:      Math.round(condoDisc),
      iptuDiscount:       Math.round(iptuDisc),
      netValue:           Math.round(netValue),
    },
  }
}
```

---

## 2. API Endpoint — `src/app/api/pricing/estimate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calculatePricing } from '@/lib/pricing-model'

export async function POST(req: NextRequest) {
  // Autenticação: apenas usuários logados
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => req.cookies.get(n)?.value } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Validação mínima
  if (!body.city || !body.state || !body.totalArea || body.totalArea <= 0) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const result = calculatePricing({
    city:               body.city,
    state:              body.state,
    houseType:          body.houseType         ?? 'APARTMENT',
    floor:              body.floor             ?? 0,
    totalArea:          body.totalArea,
    bedroomCount:       body.bedroomCount      ?? 1,
    bathroomCount:      body.bathroomCount     ?? 1,
    suitesCount:        body.suitesCount       ?? 0,
    parkingSlots:       body.parkingSlots      ?? 0,
    condominiumPerMonth: body.condominiumPerMonth ?? 0,
    hasIptu:            body.hasIptu           ?? false,
    iptuPerYear:        body.iptuPerYear        ?? 0,
  })

  return NextResponse.json(result)
}
```

---

## 3. Frontend — `src/app/dashboard/precificacao/page.tsx`

### 3.1 Mudanças no fluxo atual

O formulário de 4 passos já existe. Alterações necessárias:

1. **Remover** a função `buildURL` e toda referência ao QuintoAndar
2. **Remover** `geocodeAddr` e Nominatim (não são mais necessários)
3. **Remover** `lookupCep` ... na verdade **manter** o ViaCEP para auto-preenchimento de campos
4. **Alterar** o step 0: remover campos latitude/longitude, manter apenas os campos de endereço visíveis ao usuário
5. **Substituir** `handleNext` no step 3: chamar `POST /api/pricing/estimate` em vez de abrir URL
6. **Adicionar** estado `result: PricingResult | null` e `loading: boolean`
7. **Adicionar** view de resultado (renderizada quando `result !== null`)

### 3.2 Novo estado

```typescript
import type { PricingResult } from '@/lib/pricing-model'

const [result, setResult]   = useState<PricingResult | null>(null)
const [estimating, setEstimating] = useState(false)
const [apiError, setApiError]     = useState<string | null>(null)
```

### 3.3 Novo handleNext (step 3)

```typescript
// Substituir o bloco `else` do step 3 em handleNext:
} else {
  if (!validateS3()) return
  setEstimating(true)
  setApiError(null)
  try {
    const res = await fetch('/api/pricing/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city:                addr.city,
        state:               addr.state,
        houseType:           s1.houseType,
        floor:               s1.floor ? parseInt(s1.floor) : 0,
        totalArea:           parseFloat(s1.totalArea),
        bedroomCount:        s2.bedroomCount,
        bathroomCount:       s2.bathroomCount,
        suitesCount:         s2.suitesCount,
        parkingSlots:        s2.parkingSlots,
        condominiumPerMonth: parseCurrency(s3.condominiumPerMonth),
        hasIptu:             s3.hasIptu,
        iptuPerYear:         s3.hasIptu ? parseCurrency(s3.iptuPerYear) : 0,
      }),
    })
    if (!res.ok) throw new Error('Erro ao calcular estimativa')
    const data: PricingResult = await res.json()
    setResult(data)
  } catch (e) {
    setApiError(e instanceof Error ? e.message : 'Erro desconhecido')
  } finally {
    setEstimating(false)
  }
}
```

### 3.4 View de Resultado

Renderizar quando `result !== null` (substituir o wizard inteiro):

```
┌──────────────────────────────────────────────────────────┐
│  [←] Nova consulta          Calculadora QPreço           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Estimativa de Venda                                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │          R$ 580.000                              │    │  ← estimatedSaleValue (grande)
│  │          R$ 5.800 / m²                           │    │
│  │                                                  │    │
│  │  ├────────────────●──────────────────────┤       │    │
│  │  R$ 493.000                      R$ 696.000      │    │  ← min / max
│  │                                                  │    │
│  │  [● Alta confiança] Baseado em São Paulo         │    │  ← badge de confiança
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Estimativa de Locação                                   │
│  ┌───────────────────────┐  ┌────────────────────────┐   │
│  │  R$ 2.900 / mês       │  │  Yield: 0,50% a.m.     │   │
│  └───────────────────────┘  └────────────────────────┘   │
│                                                          │
│  Detalhamento do Cálculo      [▼ expandir]               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Preço base (SP): R$ 10.200/m²                   │    │
│  │  Preço ajustado:  R$ 11.600/m²                   │    │
│  │  Valor pela área: R$ 580.000                     │    │
│  │  Vagas:          + R$ 35.000                     │    │
│  │  Valor bruto:     R$ 615.000                     │    │
│  │  Desc. cond.:    − R$ 24.000                     │    │
│  │  Desc. IPTU:     − R$ 11.000                     │    │
│  │  Valor líquido:   R$ 580.000                     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Resumo do imóvel consultado                             │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Apartamento · 50 m² · 5º andar                  │    │
│  │  2 quartos (1 suíte) · 2 banheiros · 1 vaga      │    │
│  │  Jardim América, São Paulo - SP                  │    │
│  │  Cond. R$ 800/mês · IPTU R$ 2.200/ano            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ⚠️  Aviso legal                                         │
│  Esta estimativa é baseada em médias de mercado e        │
│  coeficientes técnicos. Não substitui laudo de           │
│  avaliação (ABNT NBR 14653) para fins legais.            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Componentes do resultado a implementar:

**Slider de posicionamento** (idêntico ao conceito QuintoAndar):
```tsx
// Calcular posição percentual dentro da faixa
const range = result.maxSaleValue - result.minSaleValue
const position = ((result.estimatedSaleValue - result.minSaleValue) / range) * 100
// Gradiente: verde escuro → verde → amarelo → laranja → vermelho
// background: linear-gradient(to right, #0F3D2E, #1E6B52, #F5C842, #E07B39, #B23A2A)
// Marcador posicionado em ~50% (valor ideal)
```

**Badge de confiança:**
```
high   → "Alta confiança"   (verde) — cidade na tabela
medium → "Média confiança"  (amarelo) — cidade na tabela mas área fora do comum
low    → "Estimativa geral" (cinza) — fallback estadual/nacional
```

**Botão "Nova consulta":** `setResult(null); setStep(0); setErrors({})`

---

## 4. Notas Técnicas

### Por que não usar API externa?

| Opção | Status |
|---|---|
| ZAP Imóveis API | Comercial, sem free tier público |
| VivaReal API | Apenas para integração de anúncios |
| DataZAP | Enterprise, licença paga |
| FIPE ZAP | Publica índices agregados (não API de imóvel específico) |
| QuintoAndar | Calculadora pública, mas abre site externo |
| **Modelo interno** | **✅ Sem dependência, sem custo, sem rate limit** |

### Precisão esperada

| Situação | Margem de erro |
|---|---|
| Capital com imóvel típico (40–200m²) | ±12–15% |
| Capital com imóvel atípico ou muito grande | ±15–20% |
| Cidade não mapeada (fallback estadual) | ±20–25% |
| Interior de estado não mapeado | ±25–30% |

### Atualização dos dados base

Os valores `CITY_PRICES` devem ser revisados **semestralmente** com base nos relatórios FIPE ZAP:
- URL pública: `https://www.zapimoveis.com.br/indice-fipezap/`
- Publicação: trimestral

---

## 5. Checklist de Implementação

- [x] Criar `src/lib/pricing-model.ts` com toda a tabela e lógica de cálculo
- [x] Criar `src/app/api/pricing/estimate/route.ts`
- [x] Reescrever `src/app/dashboard/precificacao/page.tsx`:
  - [x] Remover função `buildURL` e import `ExternalLink`
  - [x] Remover função `geocodeAddr` e variável `geocoding`
  - [x] Remover campos `latitude`/`longitude` do estado `addr`
  - [x] Adicionar estados `result`, `estimating`, `apiError`
  - [x] Alterar `handleNext` step 3 para chamar a API interna
  - [x] Adicionar view de resultado com slider, cards e breakdown
  - [x] Adicionar botão "Nova consulta" no resultado
- [ ] Testar com cidades da tabela (ex: São Paulo, Curitiba)
- [ ] Testar com cidade não mapeada (fallback estadual)
- [ ] Testar com imóvel sem condo/IPTU (caso base)
- [ ] Testar com condo alto relativo ao valor (verificar cap do desconto)

**Implementado em:** 2026-06-17  
**Status:** ✅ Completo — aguardando testes manuais
