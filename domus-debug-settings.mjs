/**
 * Domus — Debug: Identidade Visual / Configurações
 * Testa se o PATCH em /api/settings persiste e aparece no formulário público.
 *
 * Uso:  node domus-debug-settings.mjs
 */

import pkg from './node_modules/playwright/index.js'
const { chromium } = pkg['module.exports'] ?? pkg.default ?? pkg

const BASE_URL = process.env.BASE_URL      ?? 'http://localhost:3000'
const EMAIL    = process.env.TEST_ADMIN    ?? 'corretor@renovar.com.br'
const PASSWORD = process.env.TEST_PASSWORD ?? '1234'

const log  = (msg) => console.log('\n' + msg)
const ok   = (msg) => console.log('  ✅ ' + msg)
const fail = (msg) => console.log('  ❌ ' + msg)
const info = (msg) => console.log('  🔍 ' + msg)

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 600 })
  const page    = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  // ── Captura TODAS as respostas de API ──────────────────────────────────────
  const apiLog = []
  page.on('response', async res => {
    const url = res.url()
    if (!url.includes('/api/')) return
    let body = null
    try { body = await res.json() } catch { /* ignorar */ }
    apiLog.push({ status: res.status(), url: url.replace(BASE_URL, ''), body })
    const short = url.replace(BASE_URL, '')
    if (res.status() >= 400) {
      console.log(`  ⚠️  HTTP ${res.status()} → ${short}  |  ${JSON.stringify(body)}`)
    }
  })

  // ── 1. Login ────────────────────────────────────────────────────────────────
  log('══ 1. Login ══')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForTimeout(800)

  const emailFld = page.locator('input[type="email"]').first()
  const passFld  = page.locator('input[type="password"]').first()

  if (!(await emailFld.isVisible())) { fail('Campo e-mail não encontrado'); await browser.close(); return }
  await emailFld.fill(EMAIL)
  await passFld.fill(PASSWORD)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2500)

  const atDash = page.url().includes('/dashboard')
  if (atDash) ok(`Login com ${EMAIL}`)
  else {
    fail(`Login falhou — URL atual: ${page.url()}`)
    info('Tente trocar TEST_ADMIN para outro e-mail com role=admin')
    await browser.close()
    return
  }

  // ── 2. GET /api/settings — estado atual ────────────────────────────────────
  log('══ 2. GET /api/settings (estado atual) ══')
  const getRes = await page.evaluate(async () => {
    const r = await fetch('/api/settings')
    return { status: r.status, body: await r.json() }
  })
  info(`Status: ${getRes.status}`)
  if (getRes.status === 200) {
    const c = getRes.body.company
    ok(`Empresa: ${c?.name}  |  logo_url: ${c?.logo_url ?? '(null)'}  |  primary: ${c?.theme_config?.primary ?? '(null)'}`)
  } else {
    fail(`GET /api/settings retornou ${getRes.status}: ${JSON.stringify(getRes.body)}`)
  }

  // ── 3. PATCH /api/settings — mudar cor e logo ──────────────────────────────
  const TEST_COLOR = '#B23A2A'   // vermelho — fácil de detectar visualmente
  const TEST_LOGO  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png'

  log('══ 3. PATCH /api/settings ══')
  const patchRes = await page.evaluate(async ({ color, logo }) => {
    const r = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logo_url: logo,
        theme_config: { primary: color, secondary: '#D5C2A1', accent: '#FAF7F2' },
      }),
    })
    return { status: r.status, body: await r.json() }
  }, { color: TEST_COLOR, logo: TEST_LOGO })

  info(`PATCH status: ${patchRes.status}`)
  if (patchRes.status === 200) {
    const c = patchRes.body.company
    ok(`Salvo! primary: ${c?.theme_config?.primary}  |  logo_url: ${c?.logo_url}`)
  } else {
    fail(`PATCH falhou: ${JSON.stringify(patchRes.body)}`)
    info('Possíveis causas: usuário sem role=admin | migration 008 não aplicada')
    await browser.close()
    return
  }

  // ── 4. Confirmação: GET novamente ──────────────────────────────────────────
  log('══ 4. Confirmação via GET ══')
  const confirmRes = await page.evaluate(async () => {
    const r = await fetch('/api/settings')
    return { status: r.status, body: await r.json() }
  })
  if (confirmRes.status === 200) {
    const c = confirmRes.body.company
    const colorOk = c?.theme_config?.primary === TEST_COLOR
    const logoOk  = c?.logo_url === TEST_LOGO
    if (colorOk) ok(`Cor persistida corretamente: ${c?.theme_config?.primary}`)
    else         fail(`Cor NÃO persistiu. Banco retornou: ${c?.theme_config?.primary}`)
    if (logoOk)  ok(`Logo persistido corretamente`)
    else         fail(`Logo NÃO persistiu. Banco retornou: ${c?.logo_url}`)
  } else {
    fail(`Confirmação falhou: ${confirmRes.status}`)
  }

  // ── 5. Formulário público — verificar cor e logo ───────────────────────────
  log('══ 5. Formulário público /form/renovar ══')
  await page.goto(`${BASE_URL}/form/renovar`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const bg = await page.evaluate(() => {
    const el = document.querySelector('.min-h-screen')
    return el ? window.getComputedStyle(el).background : null
  })
  info(`Background do form: ${bg}`)

  const hasRedBg = bg?.includes('178') || bg?.includes('B23A2A') || bg?.toLowerCase().includes('#b23a2a')
  if (hasRedBg) ok('Cor primária aplicada no formulário')
  else          fail(`Cor NÃO aparece no formulário. Pode ser cache ou SSG.  BG atual: ${bg?.slice(0, 80)}`)

  const logoEl = await page.locator('img[alt]').first().getAttribute('src').catch(() => null)
  info(`Logo src: ${logoEl}`)
  if (logoEl === TEST_LOGO) ok('Logo aplicado no formulário')
  else                      fail(`Logo NÃO aparece. Src encontrado: ${logoEl}`)

  // ── Relatório final ────────────────────────────────────────────────────────
  log('══ Resumo ══')
  const apiErrors = apiLog.filter(e => e.status >= 400)
  if (apiErrors.length) {
    fail(`${apiErrors.length} chamada(s) com erro:`)
    apiErrors.forEach(e => info(`  ${e.status} ${e.url}  →  ${JSON.stringify(e.body)}`))
  } else {
    ok('Nenhum erro de API registrado')
  }

  log('Browser aberto para inspeção. Feche manualmente quando terminar.')
})()
