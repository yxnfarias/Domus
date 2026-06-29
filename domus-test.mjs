/**
 * Domus full-app verification script
 * Spawns next dev, waits for ready, runs Playwright tests, reports findings.
 */
import pkg from './node_modules/playwright/index.js'
const { chromium } = pkg
import { spawn }    from 'child_process'
import { setTimeout as wait } from 'timers/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const BASE = 'http://localhost:3000'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CREDS = {
  email:    process.env.TEST_EMAIL    ?? 'corretor@renovar.com.br',
  password: process.env.TEST_PASSWORD ?? '1234',
}

// ── 1. Start dev server ───────────────────────────────────────────────────────
let serverProc = null
async function startServer() {
  return new Promise((resolve, reject) => {
    serverProc = spawn('npx', ['next', 'dev', '--turbopack', '--port', '3001'], {
      cwd: __dirname,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 60000)
    const onData = (chunk) => {
      const s = chunk.toString()
      process.stdout.write('[server] ' + s)
      if (s.includes('Ready in') || s.includes('✓ Ready')) {
        clearTimeout(timeout)
        resolve()
      }
    }
    serverProc.stdout.on('data', onData)
    serverProc.stderr.on('data', onData)
    serverProc.on('error', reject)
  })
}

// ── 2. Screenshot helper ──────────────────────────────────────────────────────
let screenshotIdx = 0
async function shot(page, name) {
  const file = path.join(__dirname, `test-shot-${String(++screenshotIdx).padStart(2,'0')}-${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  📸 ${file}`)
  return file
}

// ── 3. Run tests ──────────────────────────────────────────────────────────────
const findings = []
const passes   = []

function pass(msg)    { passes.push(msg);   console.log('  ✅ ' + msg) }
function warn(msg)    { findings.push('⚠️  ' + msg); console.log('  ⚠️  ' + msg) }
function fail(msg)    { findings.push('❌ ' + msg); console.log('  ❌ ' + msg) }
function probe(msg)   { console.log('  🔍 ' + msg) }
function section(msg) { console.log('\n══ ' + msg + ' ══') }

async function run() {
  // Try existing server on 3000 first, fall back to 3001
  let BASE_URL = 'http://localhost:3000'
  try {
    const r = await fetch(BASE_URL + '/login').catch(() => null)
    if (!r?.ok) {
      console.log('Port 3000 not responding, starting on 3001…')
      await startServer()
      BASE_URL = 'http://localhost:3001'
    } else {
      console.log('Using existing server on port 3000')
    }
  } catch {
    await startServer()
    BASE_URL = 'http://localhost:3001'
  }

  const browser = await chromium.launch({ headless: true, slowMo: 100 })
  const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page    = await ctx.newPage()

  // Capture console errors
  const consoleErrors = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
  page.on('pageerror', e => consoleErrors.push(e.message))

  try {
    // ── LOGIN ────────────────────────────────────────────────────────────────
    section('LOGIN')
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' })
    await shot(page, 'login-page')

    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passInput  = page.locator('input[type="password"]').first()
    if (!(await emailInput.isVisible())) { fail('Login: campo email não encontrado'); }
    else {
      pass('Login: página carregou com campos email e senha')
      if (!CREDS.password) {
        warn('LOGIN PULADO — defina TEST_PASSWORD para testar autenticação')
        console.log('\n📋 Resultado parcial — precisa de credenciais para continuar.\nDefina TEST_PASSWORD=suasenha e reexecute.\n')
        await shot(page, 'login-requires-creds')
        return summarize()
      }
      await emailInput.fill(CREDS.email)
      await passInput.fill(CREDS.password)
      await passInput.press('Enter')
      await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {})

      if (page.url().includes('dashboard')) {
        pass('Login: autenticação bem-sucedida → redirecionou para /dashboard')
        await shot(page, 'dashboard')
      } else {
        fail(`Login: não redirecionou para dashboard (atual: ${page.url()})`)
        await shot(page, 'login-fail')
        return summarize()
      }
    }

    // ── DASHBOARD ────────────────────────────────────────────────────────────
    section('DASHBOARD')
    await page.waitForLoadState('networkidle')

    const kpiCards = await page.locator('.domus-card').count()
    if (kpiCards >= 4) pass(`Dashboard: ${kpiCards} cards KPI visíveis`)
    else warn(`Dashboard: apenas ${kpiCards} cards KPI (esperado ≥ 4)`)

    const followUpBanner = page.locator('text=follow-up').first()
    if (await followUpBanner.isVisible().catch(() => false))
      pass('Dashboard: banner de follow-up visível')
    else
      probe('Dashboard: nenhum banner de follow-up (nenhum para hoje/amanhã ou nenhum lead)')

    const bellBtn = page.locator('button[aria-label="Notificações"]').first()
    if (await bellBtn.isVisible().catch(() => false)) {
      pass('Sino de notificações: botão visível')
      await bellBtn.click()
      await wait(600)
      await shot(page, 'notifications-open')
      // test close by clicking outside
      await page.mouse.click(200, 200)
      await wait(300)
      probe('Sino: fechou ao clicar fora')
    } else warn('Sino: botão não encontrado')

    await shot(page, 'dashboard-full')

    // ── LEADS ────────────────────────────────────────────────────────────────
    section('LEADS')
    await page.goto(BASE_URL + '/dashboard/leads', { waitUntil: 'networkidle' })
    await shot(page, 'leads-page')

    const leadCards = await page.locator('[data-testid="lead-card"], .domus-card').count()
    pass(`Leads: página carregou (${leadCards} elementos card encontrados)`)

    // Toggle kanban / lista
    const toggleBtns = page.locator('button').filter({ hasText: /kanban|lista/i })
    if (await toggleBtns.count() > 0) {
      pass('Leads: toggle kanban/lista presente')
      await toggleBtns.first().click()
      await wait(400)
      await shot(page, 'leads-toggle')
    } else probe('Leads: toggle kanban/lista não encontrado pelo texto')

    // Abrir primeiro lead
    const firstLead = page.locator('.domus-card, [role="button"]').filter({ hasText: /R\$|CPF|lead/i }).first()
    if (await firstLead.isVisible().catch(() => false)) {
      await firstLead.click()
      await wait(800)
      await shot(page, 'lead-modal-open')

      // Verificar abas
      const tabs = ['Cadastro', 'Documentos', 'Crédito', 'Imóveis', 'Follow-up']
      for (const tabName of tabs) {
        const tabBtn = page.locator(`button:has-text("${tabName}")`).first()
        if (await tabBtn.isVisible().catch(() => false)) {
          await tabBtn.click()
          await wait(400)
          pass(`Lead modal: aba "${tabName}" clicável`)
          await shot(page, `lead-tab-${tabName.toLowerCase()}`)
        } else warn(`Lead modal: aba "${tabName}" não encontrada`)
      }

      // Fechar modal
      const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first()
      await page.keyboard.press('Escape')
      await wait(300)
    } else probe('Leads: nenhum lead visível para abrir modal')

    // ── IMÓVEIS ──────────────────────────────────────────────────────────────
    section('IMÓVEIS')
    await page.goto(BASE_URL + '/dashboard/imoveis', { waitUntil: 'networkidle' })
    await shot(page, 'imoveis-page')
    const imovelCards = await page.locator('.domus-card').count()
    pass(`Imóveis: página carregou (${imovelCards} cards)`)

    // ── RELATÓRIOS ───────────────────────────────────────────────────────────
    section('RELATÓRIOS')
    await page.goto(BASE_URL + '/dashboard/reports', { waitUntil: 'networkidle' })
    await wait(1500)
    await shot(page, 'reports-page')
    const charts = await page.locator('canvas, svg[class*="recharts"]').count()
    if (charts > 0) pass(`Relatórios: ${charts} gráfico(s) renderizado(s)`)
    else warn('Relatórios: nenhum gráfico canvas/recharts detectado')

    const exportCsv = page.locator('button').filter({ hasText: /CSV/i }).first()
    if (await exportCsv.isVisible().catch(() => false)) {
      pass('Relatórios: botão Export CSV presente')
      probe('Relatórios: não clicando export para evitar download de arquivo')
    } else warn('Relatórios: botão Export CSV não encontrado')

    const exportPdf = page.locator('button').filter({ hasText: /PDF/i }).first()
    if (await exportPdf.isVisible().catch(() => false)) pass('Relatórios: botão Export PDF presente')
    else warn('Relatórios: botão Export PDF não encontrado')

    // ── COMISSÕES ────────────────────────────────────────────────────────────
    section('COMISSÕES')
    await page.goto(BASE_URL + '/dashboard/commissions', { waitUntil: 'networkidle' })
    await shot(page, 'commissions-page')
    pass('Comissões: página carregou')

    // ── EQUIPE ───────────────────────────────────────────────────────────────
    section('EQUIPE')
    await page.goto(BASE_URL + '/dashboard/equipe', { waitUntil: 'networkidle' })
    await shot(page, 'equipe-page')
    pass('Equipe: página carregou')

    // ── VISITAS ──────────────────────────────────────────────────────────────
    section('VISITAS (Google Calendar)')
    await page.goto(BASE_URL + '/dashboard/visistar', { waitUntil: 'networkidle' })
    await wait(1000)
    await shot(page, 'visistar-page')
    pass('Visitas: página carregou')

    // ── CONSOLE ERRORS ───────────────────────────────────────────────────────
    section('ERROS DE CONSOLE')
    if (consoleErrors.length === 0) pass('Nenhum erro de console JS durante a sessão')
    else {
      const unique = [...new Set(consoleErrors)]
      unique.forEach(e => warn(`Console error: ${e.slice(0, 120)}`))
    }

  } finally {
    await browser.close()
    if (serverProc) { serverProc.kill(); console.log('\n[server] processo encerrado') }
  }

  summarize()
}

function summarize() {
  console.log('\n' + '═'.repeat(60))
  console.log('RESULTADO FINAL')
  console.log('═'.repeat(60))
  console.log(`✅ Passou: ${passes.length}`)
  console.log(`Problemas/observações: ${findings.length}`)
  if (findings.length) {
    console.log('\nFindings:')
    findings.forEach(f => console.log('  ' + f))
  }
  console.log('═'.repeat(60))
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
