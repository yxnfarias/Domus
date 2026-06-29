export type CityTier = 'premium' | 'standard' | 'interior'
export type ZoneType  = 'premium' | 'high' | 'standard' | 'affordable'

export interface CityData {
  basePricePerM2: number   // preço/m² da zona INTERMEDIÁRIA da cidade
  rentalYield: number
  parkingValue: number
  tier: CityTier
}

// Multiplicadores por zona/perfil do bairro.
// Os preços base em CITY_PRICES representam a zona "standard" (intermediária).
// Fonte de calibração: FIPE ZAP + SECOVI 2024/2025, ajustados para zona mediana.
export const ZONE_FACTORS: Record<ZoneType, number> = {
  premium:    1.75,  // Nobre/alto padrão (Itaim, Moema, Leblon, Asa Sul...)
  high:       1.22,  // Valorizado (Pinheiros, Botafogo, Batel, Moinhos de Vento...)
  standard:   1.00,  // Intermediário — BASE (Santana, Tatuapé, Tijuca, Água Verde...)
  affordable: 0.60,  // Periférico (Brasilândia, Itaquera, Almirante Tamandaré...)
}

// Ajuste de vagas por zona (vagas valem mais em bairros premium)
export const ZONE_PARKING_FACTOR: Record<ZoneType, number> = {
  premium:    1.60,
  high:       1.20,
  standard:   1.00,
  affordable: 0.70,
}

// CITY_PRICES: preço da zona INTERMEDIÁRIA/STANDARD de cada cidade.
// Não é a média da cidade (que sobe por causa dos bairros premium) —
// é o que um apartamento típico em bairro intermediário vale por m².
export const CITY_PRICES: Record<string, CityData> = {
  // ── São Paulo ───────────────────────────────────────────────────────
  // Standard: Santana, Tatuapé, Mooca, Ipiranga (~R$ 6.500/m²)
  // Premium ×1.75 = R$ 11.375 (Itaim, Moema, Jardins) ✓
  // Affordable ×0.60 = R$ 3.900 (Brasilândia, Itaquera) ✓
  'São Paulo':             { basePricePerM2:  6500, rentalYield: 0.0048, parkingValue: 28000, tier: 'premium'  },
  'Campinas':              { basePricePerM2:  5200, rentalYield: 0.0052, parkingValue: 17000, tier: 'standard' },
  'Santos':                { basePricePerM2:  5600, rentalYield: 0.0050, parkingValue: 19000, tier: 'standard' },
  'São Bernardo do Campo': { basePricePerM2:  5000, rentalYield: 0.0053, parkingValue: 15000, tier: 'standard' },
  'Guarulhos':             { basePricePerM2:  4400, rentalYield: 0.0055, parkingValue: 13000, tier: 'standard' },
  'Ribeirão Preto':        { basePricePerM2:  4600, rentalYield: 0.0055, parkingValue: 14000, tier: 'standard' },
  'São José dos Campos':   { basePricePerM2:  4900, rentalYield: 0.0052, parkingValue: 15000, tier: 'standard' },
  'Sorocaba':              { basePricePerM2:  4000, rentalYield: 0.0057, parkingValue: 12000, tier: 'standard' },
  'Santo André':           { basePricePerM2:  4700, rentalYield: 0.0053, parkingValue: 14000, tier: 'standard' },
  'Osasco':                { basePricePerM2:  4200, rentalYield: 0.0055, parkingValue: 12000, tier: 'standard' },

  // ── Rio de Janeiro ──────────────────────────────────────────────────
  // Standard: Tijuca, Méier, Vila Isabel (~R$ 5.800/m²)
  // Premium ×1.75 = R$ 10.150 (Leblon, Ipanema, Gávea) ✓
  // Affordable ×0.60 = R$ 3.480 (Campo Grande, Bangu) ✓
  'Rio de Janeiro':        { basePricePerM2:  5800, rentalYield: 0.0046, parkingValue: 24000, tier: 'premium'  },
  'Niterói':               { basePricePerM2:  5200, rentalYield: 0.0050, parkingValue: 17000, tier: 'standard' },
  'Nova Iguaçu':           { basePricePerM2:  3200, rentalYield: 0.0059, parkingValue:  8000, tier: 'interior' },
  'Duque de Caxias':       { basePricePerM2:  3000, rentalYield: 0.0060, parkingValue:  7500, tier: 'interior' },

  // ── Minas Gerais ────────────────────────────────────────────────────
  // Standard BH: Sagrada Família, Colégio Batista (~R$ 4.800/m²)
  // Premium ×1.75 = R$ 8.400 (Lourdes, Savassi, Belvedere) ✓
  'Belo Horizonte':        { basePricePerM2:  4800, rentalYield: 0.0052, parkingValue: 15000, tier: 'standard' },
  'Uberlândia':            { basePricePerM2:  3600, rentalYield: 0.0058, parkingValue: 10000, tier: 'interior' },
  'Contagem':              { basePricePerM2:  3700, rentalYield: 0.0057, parkingValue: 10000, tier: 'interior' },
  'Juiz de Fora':          { basePricePerM2:  3500, rentalYield: 0.0058, parkingValue:  9000, tier: 'interior' },

  // ── Distrito Federal ────────────────────────────────────────────────
  // Standard: Taguatinga, Ceilândia, Samambaia (~R$ 4.800/m²)
  // Premium ×1.75 = R$ 8.400 (Asa Sul, Asa Norte, Noroeste) ✓
  'Brasília':              { basePricePerM2:  4800, rentalYield: 0.0048, parkingValue: 18000, tier: 'premium'  },

  // ── Paraná ──────────────────────────────────────────────────────────
  // Standard Curitiba: Água Verde periferia, Boqueirão (~R$ 5.200/m²)
  // Premium ×1.75 = R$ 9.100 (Batel, Ecoville, Água Verde centro) ✓
  'Curitiba':              { basePricePerM2:  5200, rentalYield: 0.0050, parkingValue: 17000, tier: 'standard' },
  'Londrina':              { basePricePerM2:  3800, rentalYield: 0.0057, parkingValue: 10000, tier: 'interior' },
  'Maringá':               { basePricePerM2:  4000, rentalYield: 0.0056, parkingValue: 11000, tier: 'interior' },
  'Foz do Iguaçu':         { basePricePerM2:  3400, rentalYield: 0.0058, parkingValue:  9000, tier: 'interior' },

  // ── Rio Grande do Sul ───────────────────────────────────────────────
  // Standard POA: Cristal, Partenon, Rubem Berta (~R$ 4.400/m²)
  // Premium ×1.75 = R$ 7.700 (Moinhos de Vento, Bela Vista, Mont'Serrat) ✓
  'Porto Alegre':          { basePricePerM2:  4400, rentalYield: 0.0052, parkingValue: 14000, tier: 'standard' },
  'Caxias do Sul':         { basePricePerM2:  3600, rentalYield: 0.0057, parkingValue:  9500, tier: 'interior' },
  'Pelotas':               { basePricePerM2:  2900, rentalYield: 0.0062, parkingValue:  7500, tier: 'interior' },

  // ── Santa Catarina ──────────────────────────────────────────────────
  // Standard Floripa: Ingleses, Coqueiros, Continente (~R$ 5.400/m²)
  // Premium ×1.75 = R$ 9.450 (Jurerê Internacional, Campeche, Lagoa) ✓
  'Florianópolis':         { basePricePerM2:  5400, rentalYield: 0.0048, parkingValue: 20000, tier: 'premium'  },
  'Joinville':             { basePricePerM2:  4200, rentalYield: 0.0055, parkingValue: 12000, tier: 'standard' },
  'Blumenau':              { basePricePerM2:  3800, rentalYield: 0.0056, parkingValue: 10000, tier: 'interior' },
  // Balneário: pequena, toda premium, standard = centro fora da orla
  'Balneário Camboriú':    { basePricePerM2:  7500, rentalYield: 0.0042, parkingValue: 35000, tier: 'premium'  },

  // ── Goiás ───────────────────────────────────────────────────────────
  // Standard Goiânia: Setor Bueno periferia, Setor Sudoeste (~R$ 4.200/m²)
  // Premium ×1.75 = R$ 7.350 (Setor Marista, Jardim Goiás) ✓
  'Goiânia':               { basePricePerM2:  4200, rentalYield: 0.0055, parkingValue: 13000, tier: 'standard' },
  'Anápolis':              { basePricePerM2:  3200, rentalYield: 0.0060, parkingValue:  8500, tier: 'interior' },

  // ── Bahia ────────────────────────────────────────────────────────────
  'Salvador':              { basePricePerM2:  3800, rentalYield: 0.0055, parkingValue: 11000, tier: 'standard' },
  'Feira de Santana':      { basePricePerM2:  2800, rentalYield: 0.0062, parkingValue:  7000, tier: 'interior' },

  // ── Ceará ────────────────────────────────────────────────────────────
  'Fortaleza':             { basePricePerM2:  4000, rentalYield: 0.0054, parkingValue: 12000, tier: 'standard' },

  // ── Pernambuco ──────────────────────────────────────────────────────
  'Recife':                { basePricePerM2:  4200, rentalYield: 0.0053, parkingValue: 13000, tier: 'standard' },
  'Olinda':                { basePricePerM2:  3500, rentalYield: 0.0057, parkingValue:  9500, tier: 'interior' },
  'Caruaru':               { basePricePerM2:  2700, rentalYield: 0.0063, parkingValue:  7000, tier: 'interior' },

  // ── Espírito Santo ──────────────────────────────────────────────────
  'Vitória':               { basePricePerM2:  5000, rentalYield: 0.0050, parkingValue: 16000, tier: 'standard' },
  'Vila Velha':            { basePricePerM2:  4500, rentalYield: 0.0052, parkingValue: 14000, tier: 'standard' },
  'Serra':                 { basePricePerM2:  3800, rentalYield: 0.0056, parkingValue: 11000, tier: 'standard' },

  // ── Pará ─────────────────────────────────────────────────────────────
  'Belém':                 { basePricePerM2:  3100, rentalYield: 0.0060, parkingValue:  8500, tier: 'interior' },

  // ── Amazonas ────────────────────────────────────────────────────────
  'Manaus':                { basePricePerM2:  3300, rentalYield: 0.0059, parkingValue:  9000, tier: 'interior' },

  // ── Rio Grande do Norte ─────────────────────────────────────────────
  'Natal':                 { basePricePerM2:  3700, rentalYield: 0.0056, parkingValue: 10000, tier: 'standard' },

  // ── Paraíba ─────────────────────────────────────────────────────────
  'João Pessoa':           { basePricePerM2:  3500, rentalYield: 0.0057, parkingValue:  9500, tier: 'standard' },

  // ── Maranhão ────────────────────────────────────────────────────────
  'São Luís':              { basePricePerM2:  3000, rentalYield: 0.0061, parkingValue:  8000, tier: 'interior' },

  // ── Piauí ────────────────────────────────────────────────────────────
  'Teresina':              { basePricePerM2:  2900, rentalYield: 0.0062, parkingValue:  7500, tier: 'interior' },

  // ── Mato Grosso do Sul ──────────────────────────────────────────────
  'Campo Grande':          { basePricePerM2:  3700, rentalYield: 0.0057, parkingValue: 10500, tier: 'interior' },
  'Dourados':              { basePricePerM2:  3000, rentalYield: 0.0061, parkingValue:  8000, tier: 'interior' },

  // ── Mato Grosso ─────────────────────────────────────────────────────
  'Cuiabá':                { basePricePerM2:  3900, rentalYield: 0.0056, parkingValue: 11000, tier: 'interior' },

  // ── Sergipe ─────────────────────────────────────────────────────────
  'Aracaju':               { basePricePerM2:  3500, rentalYield: 0.0058, parkingValue:  9500, tier: 'interior' },

  // ── Alagoas ─────────────────────────────────────────────────────────
  'Maceió':                { basePricePerM2:  3200, rentalYield: 0.0059, parkingValue:  8500, tier: 'interior' },

  // ── Rondônia ────────────────────────────────────────────────────────
  'Porto Velho':           { basePricePerM2:  3400, rentalYield: 0.0059, parkingValue:  9000, tier: 'interior' },

  // ── Tocantins ───────────────────────────────────────────────────────
  'Palmas':                { basePricePerM2:  3200, rentalYield: 0.0060, parkingValue:  8500, tier: 'interior' },

  // ── Roraima ─────────────────────────────────────────────────────────
  'Boa Vista':             { basePricePerM2:  2800, rentalYield: 0.0063, parkingValue:  7500, tier: 'interior' },

  // ── Amapá ────────────────────────────────────────────────────────────
  'Macapá':                { basePricePerM2:  2700, rentalYield: 0.0064, parkingValue:  7000, tier: 'interior' },

  // ── Acre ─────────────────────────────────────────────────────────────
  'Rio Branco':            { basePricePerM2:  2800, rentalYield: 0.0063, parkingValue:  7000, tier: 'interior' },
}

export const STATE_FALLBACK: Record<string, CityData> = {
  SP: { basePricePerM2: 4600, rentalYield: 0.0054, parkingValue: 14000, tier: 'standard' },
  RJ: { basePricePerM2: 4500, rentalYield: 0.0052, parkingValue: 13000, tier: 'standard' },
  MG: { basePricePerM2: 3600, rentalYield: 0.0057, parkingValue:  9500, tier: 'interior' },
  DF: { basePricePerM2: 4800, rentalYield: 0.0048, parkingValue: 18000, tier: 'premium'  },
  PR: { basePricePerM2: 3800, rentalYield: 0.0056, parkingValue: 10500, tier: 'interior' },
  RS: { basePricePerM2: 3600, rentalYield: 0.0057, parkingValue:  9500, tier: 'interior' },
  SC: { basePricePerM2: 4000, rentalYield: 0.0055, parkingValue: 12000, tier: 'standard' },
  GO: { basePricePerM2: 3400, rentalYield: 0.0059, parkingValue:  9000, tier: 'interior' },
  BA: { basePricePerM2: 3200, rentalYield: 0.0060, parkingValue:  8500, tier: 'interior' },
  CE: { basePricePerM2: 3300, rentalYield: 0.0059, parkingValue:  9000, tier: 'interior' },
  PE: { basePricePerM2: 3400, rentalYield: 0.0058, parkingValue:  9500, tier: 'interior' },
  ES: { basePricePerM2: 4000, rentalYield: 0.0055, parkingValue: 12000, tier: 'standard' },
  PA: { basePricePerM2: 2800, rentalYield: 0.0062, parkingValue:  7500, tier: 'interior' },
  AM: { basePricePerM2: 2900, rentalYield: 0.0062, parkingValue:  7500, tier: 'interior' },
  RN: { basePricePerM2: 3100, rentalYield: 0.0060, parkingValue:  8500, tier: 'interior' },
  PB: { basePricePerM2: 3000, rentalYield: 0.0061, parkingValue:  8000, tier: 'interior' },
  MA: { basePricePerM2: 2700, rentalYield: 0.0063, parkingValue:  7000, tier: 'interior' },
  PI: { basePricePerM2: 2600, rentalYield: 0.0064, parkingValue:  6500, tier: 'interior' },
  MS: { basePricePerM2: 3300, rentalYield: 0.0059, parkingValue:  9000, tier: 'interior' },
  MT: { basePricePerM2: 3400, rentalYield: 0.0059, parkingValue:  9000, tier: 'interior' },
  SE: { basePricePerM2: 3100, rentalYield: 0.0060, parkingValue:  8000, tier: 'interior' },
  AL: { basePricePerM2: 2900, rentalYield: 0.0062, parkingValue:  7500, tier: 'interior' },
  RO: { basePricePerM2: 3000, rentalYield: 0.0061, parkingValue:  7500, tier: 'interior' },
  TO: { basePricePerM2: 2800, rentalYield: 0.0062, parkingValue:  7500, tier: 'interior' },
  RR: { basePricePerM2: 2500, rentalYield: 0.0065, parkingValue:  6000, tier: 'interior' },
  AP: { basePricePerM2: 2500, rentalYield: 0.0065, parkingValue:  6000, tier: 'interior' },
  AC: { basePricePerM2: 2500, rentalYield: 0.0065, parkingValue:  6000, tier: 'interior' },
}

// ── Outros coeficientes ───────────────────────────────────────────────────────

export const HOUSE_TYPE_FACTOR: Record<string, number> = {
  PENTHOUSE:   1.35,
  STUDIO:      1.20,
  APARTMENT:   1.00,
  CONDO_HOUSE: 0.88,
  HOUSE:       0.78,
}

export function floorFactor(floor: number): number {
  if (floor <= 3)  return 1.00
  if (floor <= 8)  return 1.03
  if (floor <= 15) return 1.06
  if (floor <= 25) return 1.09
  return 1.13
}

const BEDROOM_FACTOR: Record<number, number> = { 0: 0.95, 1: 1.00, 2: 1.05, 3: 1.09, 4: 1.12 }
export function bedroomFactor(n: number): number { return BEDROOM_FACTOR[Math.min(n, 4)] ?? 1.14 }

export const SUITE_PREMIUM_PER_UNIT = 0.025

export function bathroomFactor(n: number): number {
  if (n <= 1) return 1.00
  if (n === 2) return 1.03
  if (n === 3) return 1.05
  return 1.07
}

export function condoDiscount(condoPerMonth: number, grossValue: number): number {
  return Math.min(condoPerMonth * 30, grossValue * 0.12)
}

export function iptuDiscount(iptuPerYear: number, grossValue: number): number {
  return Math.min(iptuPerYear * 5, grossValue * 0.08)
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PricingInput {
  city: string
  state: string
  zone: ZoneType
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
  estimatedSaleValue: number
  minSaleValue: number
  maxSaleValue: number
  pricePerM2: number
  estimatedRentalMonth: number
  rentalYield: number
  confidence: 'high' | 'medium' | 'low'
  cityFound: boolean
  baseCity: string
  zoneLabel: string
  breakdown: {
    basePricePerM2: number
    zoneFactor: number
    adjustedPricePerM2: number
    areaValue: number
    parkingValue: number
    grossValue: number
    condoDiscount: number
    iptuDiscount: number
    netValue: number
  }
}

export const ZONE_LABELS: Record<ZoneType, string> = {
  premium:    'Nobre / Alto padrão',
  high:       'Valorizado',
  standard:   'Intermediário',
  affordable: 'Periférico',
}

// ── Motor de cálculo ─────────────────────────────────────────────────────────

export function calculatePricing(input: PricingInput): PricingResult {
  const cityData  = CITY_PRICES[input.city] ?? STATE_FALLBACK[input.state]
  const cityFound = !!CITY_PRICES[input.city]
  const baseCity  = cityFound ? input.city : `${input.state} (média estadual)`
  const fallback: CityData = { basePricePerM2: 3500, rentalYield: 0.0057, parkingValue: 10000, tier: 'interior' }
  return _calc(input, cityData ?? fallback, cityFound, cityData ? baseCity : 'Brasil (média nacional)')
}

function _calc(input: PricingInput, city: CityData, cityFound: boolean, baseCity: string): PricingResult {
  const { houseType, floor, totalArea, bedroomCount, bathroomCount,
          suitesCount, parkingSlots, condominiumPerMonth, hasIptu, iptuPerYear, zone } = input

  const zoneFactor   = ZONE_FACTORS[zone] ?? 1.00
  const typeFactor   = HOUSE_TYPE_FACTOR[houseType] ?? 1.0
  const floorMult    = (houseType === 'HOUSE' || houseType === 'CONDO_HOUSE') ? 1.0 : floorFactor(floor)
  const bedroomMult  = bedroomFactor(bedroomCount)
  const bathroomMult = bathroomFactor(bathroomCount)
  const suiteMult    = 1 + suitesCount * SUITE_PREMIUM_PER_UNIT

  const adjPriceM2 = city.basePricePerM2 * zoneFactor * typeFactor * floorMult * bedroomMult * bathroomMult * suiteMult

  const areaVal    = adjPriceM2 * totalArea
  const parkingVal = city.parkingValue * ZONE_PARKING_FACTOR[zone] * parkingSlots
  const grossVal   = areaVal + parkingVal

  const condoDisc = condoDiscount(condominiumPerMonth, grossVal)
  const iptuDisc  = hasIptu ? iptuDiscount(iptuPerYear, grossVal) : 0
  const netVal    = grossVal - condoDisc - iptuDisc

  const spread       = cityFound ? 0.15 : 0.20
  const estimated    = Math.round(netVal / 1000) * 1000
  const minSaleValue = Math.round(netVal * (1 - spread) / 1000) * 1000
  const maxSaleValue = Math.round(netVal * (1 + spread) / 1000) * 1000
  const rentalMonth  = Math.round((estimated * city.rentalYield) / 50) * 50

  const confidence: PricingResult['confidence'] =
    cityFound && totalArea >= 20 && totalArea <= 600 ? 'high' :
    cityFound ? 'medium' : 'low'

  return {
    estimatedSaleValue:   estimated,
    minSaleValue,
    maxSaleValue,
    pricePerM2:           Math.round(adjPriceM2),
    estimatedRentalMonth: rentalMonth,
    rentalYield:          city.rentalYield,
    confidence,
    cityFound,
    baseCity,
    zoneLabel:            ZONE_LABELS[zone],
    breakdown: {
      basePricePerM2:     Math.round(city.basePricePerM2),
      zoneFactor,
      adjustedPricePerM2: Math.round(adjPriceM2),
      areaValue:          Math.round(areaVal),
      parkingValue:       Math.round(parkingVal),
      grossValue:         Math.round(grossVal),
      condoDiscount:      Math.round(condoDisc),
      iptuDiscount:       Math.round(iptuDisc),
      netValue:           Math.round(netVal),
    },
  }
}
