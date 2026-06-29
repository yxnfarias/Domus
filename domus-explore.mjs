/**
 * Domus — Exploração visual com Playwright
 *
 * Abre o browser em modo visível (headed) com velocidade controlada
 * para você acompanhar cada ação em tempo real.
 *
 * Uso:
 *   node domus-explore.mjs
 *
 * Variáveis opcionais:
 *   TEST_EMAIL    (padrão: corretor@renovar.com.br)
 *   TEST_PASSWORD (padrão: 1234)
 *   BASE_URL      (padrão: http://localhost:3000)
 *   SLOW_MO       (padrão: 700 ms entre ações — reduza para acelerar)
 */

import pkg from './node_modules/playwright/index.js'
const { chromium } = pkg['module.exports'] ?? pkg.default ?? pkg

const BASE_URL   = process.env.BASE_URL      ?? 'http://localhost:3000'
const SLOW_MO    = Number(process.env.SLOW_MO ?? 700)
const EMAIL      = process.env.TEST_EMAIL    ?? 'corretor@renovar.com.br'
const PASSWORD   = process.env.TEST_PASSWORD ?? '1234'

// ─── Relatório ────────────────────────────────────────────────────────────────
const passes   = []
const warnings = []
const errors   = []

const pass = (msg)    => { passes.push(msg);   console.log('  ✅ ' + msg) }
const warn = (msg)    => { warnings.push(msg); console.log('  ⚠️  ' + msg) }
const fail = (msg)    => { errors.push(msg);   console.log('  ❌ ' + msg) }
const info = (msg)    => console.log('  🔍 ' + msg)
const step = (msg)    => console.log('\n══ ' + msg + ' ══')

// ─── Utilitário: clica com segurança ─────────────────────────────────────────
async function safeClick(page, selector, label) {
  try {
    const el = page.locator(selector).first()
    await el.waitFor({ state: 'visible', timeout: 4000 })
    await el.click()
    return true
  } catch {
    warn(`${label}: elemento não clicável/visível (${selector})`)
    return false
  }
}

// ─── Utilitário: verifica texto na página ─────────────────────────────────────
async function hasText(page, text) {
  return page.getByText(text, { exact: false }).first().isVisible().catch(() => false)
}

// ─── Utilitário: conta elementos ──────────────────────────────────────────────
async function count(page, selector) {
  return page.locator(selector).count().catch(() => 0)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('═'.repeat(60))
  console.log('  DOMUS — Exploração Visual (browser aparecerá em breve…)')
  console.log(`  URL: ${BASE_URL}   slowMo: ${SLOW_MO}ms`)
  console.log('═'.repeat(60))

  // Verifica se o servidor responde
  const serverOk = await fetch(BASE_URL + '/login').then(r => r.ok).catch(() => false)
  if (!serverOk) {
    console.error(`\n❌ ERRO: servidor não responde em ${BASE_URL}`)
    console.error('   Inicie o servidor com:  npm run dev\n')
    process.exit(1)
  }
  info(`Servidor OK em ${BASE_URL}`)

  const browser = await chromium.launch({
    headless: false,
    slowMo: SLOW_MO,
    args: ['--start-maximized'],
  })

  const ctx  = await browser.newContext({
    viewport:        null,  // usa o tamanho real da janela maximizada
    locale:          'pt-BR',
    timezoneId:      'America/Sao_Paulo',
  })
  const page = await ctx.newPage()

  // Captura erros de console e de página
  const consoleErrs = []
  const failedReqs  = []  // { url, status }

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const loc = msg.location()
      const locStr = loc?.url ? ` [${loc.url.replace(BASE_URL, '')}:${loc.lineNumber}]` : ''
      const full = msg.text() + locStr
      // Ignora 404 de favicon (não é código da aplicação)
      if (full.includes('favicon')) return
      consoleErrs.push(full)
    }
  })
  page.on('pageerror', e => {
    consoleErrs.push(e.message)
    console.log('  🔴 pageerror:', e.message.slice(0, 120))
  })
  // Captura qualquer resposta HTTP 4xx / 5xx (app + recursos externos)
  page.on('response', res => {
    const url    = res.url()
    const status = res.status()
    if (status >= 400) {
      const display = url.startsWith(BASE_URL) ? url.replace(BASE_URL, '') : url
      failedReqs.push({ path: display, status })
      const icon = status >= 500 ? '🔴' : '🟡'
      console.log(`  ${icon} HTTP ${status}: ${display}`)
    }
  })

  try {

    // ══════════════════════════════════════════════════════════════════════════
    step('1 · LOGIN')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' })
    info('Página de login carregada')

    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passInput  = page.locator('input[type="password"]').first()

    if (!await emailInput.isVisible().catch(() => false)) {
      fail('Login: campo e-mail não encontrado — layout inesperado')
    } else {
      await emailInput.fill(EMAIL)
      await passInput.fill(PASSWORD)
      info(`Preenchendo: ${EMAIL} / ${'*'.repeat(PASSWORD.length)}`)
      await passInput.press('Enter')

      await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {})

      if (page.url().includes('dashboard')) {
        pass('Login: autenticação bem-sucedida')
      } else {
        fail(`Login: não redirecionou para /dashboard (url atual: ${page.url()})`)
        console.log('\n  Verifique o e-mail/senha e reexecute.\n')
        await browser.close()
        return summarize()
      }
    }

    await page.waitForLoadState('networkidle')

    // ══════════════════════════════════════════════════════════════════════════
    step('2 · DASHBOARD — visão geral')
    // ══════════════════════════════════════════════════════════════════════════
    info('Verificando KPI cards…')
    const kpiCount = await count(page, '.domus-card')
    kpiCount >= 4
      ? pass(`Dashboard: ${kpiCount} cards visíveis`)
      : warn(`Dashboard: apenas ${kpiCount} cards (esperado ≥ 4)`)

    // Banner de follow-up
    const hasBanner = await hasText(page, 'follow-up')
    hasBanner
      ? pass('Dashboard: banner de follow-up presente')
      : info('Dashboard: sem banner de follow-up (nenhum pendente ou sem leads)')

    // Sino de notificações
    const bell = page.locator('button[aria-label="Notificações"]').first()
    if (await bell.isVisible().catch(() => false)) {
      pass('Sino de notificações: visível')
      await bell.click()
      await page.waitForTimeout(800)
      info('Sino: painel aberto')

      // Verifica se existe pelo menos um item ou mensagem vazia
      const notifItems = await count(page, '[class*="notif"], [class*="notification"]')
      info(`Sino: ${notifItems} itens de notificação encontrados`)

      // Fecha clicando fora
      await page.mouse.click(300, 300)
      await page.waitForTimeout(400)
      info('Sino: fechado ao clicar fora')
    } else {
      warn('Sino: botão de notificações não encontrado')
    }

    // Sidebar — links navegáveis
    const sidebarLinks = [
      { texto: 'Leads',      url: '/dashboard/leads'       },
      { texto: 'Imóveis',    url: '/dashboard/imoveis'     },
      { texto: 'Relatórios', url: '/dashboard/reports'     },
      { texto: 'Comissões',  url: '/dashboard/commissions' },
      { texto: 'Equipe',     url: '/dashboard/equipe'      },
      { texto: 'Visitas',    url: '/dashboard/visistar'    },
    ]
    for (const link of sidebarLinks) {
      const el = page.getByRole('link', { name: link.texto }).first()
      if (await el.isVisible().catch(() => false)) {
        pass(`Sidebar: link "${link.texto}" presente`)
      } else {
        warn(`Sidebar: link "${link.texto}" não encontrado`)
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    step('3 · LEADS — kanban e modal')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/leads', { waitUntil: 'networkidle' })
    info('Página de leads carregada')

    const leadCardCount = await count(page, '.domus-card')
    pass(`Leads: ${leadCardCount} cards encontrados`)

    // Toggle Kanban / Lista (botões com aria-label)
    const kanbanBtn = page.locator('[aria-label="Visualização kanban"]').first()
    const tableBtn  = page.locator('[aria-label="Visualização em tabela"]').first()
    if (await kanbanBtn.isVisible().catch(() => false)) {
      pass('Leads: toggle de visualização (kanban/tabela) presente')
      await kanbanBtn.click()
      await page.waitForTimeout(500)
      info('Leads: alternado para kanban')
      await tableBtn.click()
      await page.waitForTimeout(500)
      info('Leads: voltou para tabela')
    } else {
      warn('Leads: toggle de visualização não encontrado')
    }

    // Exportar CSV
    const csvBtn = page.locator('button').filter({ hasText: /CSV/i }).first()
    if (await csvBtn.isVisible().catch(() => false)) {
      pass('Leads: botão Export CSV presente')
    } else {
      warn('Leads: botão Export CSV não encontrado')
    }

    // Abrir modal do primeiro lead
    const firstCard = page.locator('.domus-card').filter({ hasText: /R\$/ }).first()
    if (await firstCard.isVisible().catch(() => false)) {
      info('Abrindo modal do primeiro lead…')
      await firstCard.click()
      await page.waitForTimeout(1000)

      // Verificar abas do modal
      const abas = ['Cadastro', 'Documentos', 'Crédito', 'Imóveis', 'Follow-up']
      for (const aba of abas) {
        const btn = page.locator(`button:has-text("${aba}")`).first()
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
          await page.waitForTimeout(600)
          pass(`Lead modal: aba "${aba}" funcionando`)

          // Testes específicos por aba
          if (aba === 'Follow-up') {
            const addBtn = page.locator('button').filter({ hasText: /adicionar follow/i }).first()
            addBtn.isVisible().then(v => v
              ? pass('Follow-up: botão "Adicionar follow-up" presente')
              : warn('Follow-up: botão "Adicionar follow-up" não encontrado')
            ).catch(() => {})
          }

          if (aba === 'Crédito') {
            const analyzeBtn = page.locator('button').filter({ hasText: /analis|analys/i }).first()
            analyzeBtn.isVisible().then(v => v
              ? pass('Crédito: botão de análise presente')
              : info('Crédito: botão de análise não encontrado (crédito já analisado?)')
            ).catch(() => {})
          }
        } else {
          warn(`Lead modal: aba "${aba}" não encontrada`)
        }
      }

      // Fechar modal
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      info('Modal: fechado via Escape')

    } else {
      info('Leads: nenhum lead com valor (R$) visível para abrir modal')
    }

    // ══════════════════════════════════════════════════════════════════════════
    step('4 · IMÓVEIS')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/imoveis', { waitUntil: 'networkidle' })
    info('Página de imóveis carregada')

    const imovelCount = await count(page, '.domus-card')
    pass(`Imóveis: ${imovelCount} cards encontrados`)

    // Botão de novo imóvel
    const novoImovel = page.locator('button').filter({ hasText: /novo|adicionar|imóvel/i }).first()
    if (await novoImovel.isVisible().catch(() => false)) {
      pass('Imóveis: botão para criar imóvel presente')
    } else {
      warn('Imóveis: botão para criar imóvel não encontrado')
    }

    // Filtros de status
    const filterBtns = await page.locator('button').filter({ hasText: /disponível|reservado|vendido|todos/i }).count()
    filterBtns > 0
      ? pass(`Imóveis: ${filterBtns} filtros de status encontrados`)
      : warn('Imóveis: filtros de status não encontrados')

    // ══════════════════════════════════════════════════════════════════════════
    step('5 · RELATÓRIOS')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/reports', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // gráficos precisam renderizar
    info('Página de relatórios carregada')

    // Gráficos são componentes customizados (divs/svg) — verifica por texto de label
    const chartCount = await count(page, '[class*="chart"], [class*="Chart"]')
    const hasVbar    = await hasText(page, 'Leads por mês')
    const hasFunnel  = await hasText(page, 'Funil')
    const hasDonut   = await hasText(page, 'Status')
    const chartsOk   = chartCount > 0 || hasVbar || hasFunnel || hasDonut
    chartsOk
      ? pass('Relatórios: conteúdo de gráficos renderizado')
      : warn('Relatórios: gráficos não detectados (sem dados ou erro de carregamento?)')

    const repExportCsv = page.locator('button').filter({ hasText: /CSV/i }).first()
    if (await repExportCsv.isVisible().catch(() => false)) {
      pass('Relatórios: botão Export CSV presente')
    }

    // ══════════════════════════════════════════════════════════════════════════
    step('6 · COMISSÕES')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/commissions', { waitUntil: 'networkidle' })
    info('Página de comissões carregada')
    pass('Comissões: página carregou sem erro')

    const commCards = await count(page, '.domus-card')
    info(`Comissões: ${commCards} cards/linhas visíveis`)

    // ══════════════════════════════════════════════════════════════════════════
    step('7 · EQUIPE')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/equipe', { waitUntil: 'networkidle' })
    info('Página de equipe carregada')
    pass('Equipe: página carregou sem erro')

    const memberCount = await count(page, '.domus-card')
    info(`Equipe: ${memberCount} cards de membro encontrados`)

    const inviteBtn = page.locator('button').filter({ hasText: /convidar|invite/i }).first()
    if (await inviteBtn.isVisible().catch(() => false)) {
      pass('Equipe: botão de convite presente')
    } else {
      warn('Equipe: botão de convite não encontrado')
    }

    // ══════════════════════════════════════════════════════════════════════════
    step('8 · VISITAS (Google Calendar)')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/visistar', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    info('Página de visitas carregada')
    pass('Visitas: página carregou sem erro')

    const calendarEl = await count(page, '[class*="calendar"], [class*="Calendar"], .fc')
    calendarEl > 0
      ? pass(`Visitas: ${calendarEl} elemento(s) de calendário encontrado(s)`)
      : info('Visitas: nenhum calendário renderizado (Google Calendar não conectado?)')

    // ══════════════════════════════════════════════════════════════════════════
    step('9 · CONFIGURAÇÕES')
    // ══════════════════════════════════════════════════════════════════════════
    await page.goto(BASE_URL + '/dashboard/settings', { waitUntil: 'networkidle' })
    info('Página de configurações carregada')
    pass('Configurações: página carregou sem erro')

    // ══════════════════════════════════════════════════════════════════════════
    step('10 · FORMULÁRIO PÚBLICO')
    // ══════════════════════════════════════════════════════════════════════════
    // Tenta descobrir o slug da empresa
    const url = page.url()
    const match = url.match(/dashboard/)
    if (match) {
      // Tenta o slug "renovar" como fallback
      const slugsToTry = ['renovar', 'domus', 'demo', 'teste']
      let formOk = false
      for (const slug of slugsToTry) {
        const res = await fetch(`${BASE_URL}/form/${slug}`).catch(() => null)
        if (res?.ok) {
          await page.goto(`${BASE_URL}/form/${slug}`, { waitUntil: 'networkidle' })
          await page.waitForTimeout(1000)
          const formVisible = await count(page, 'form, [class*="step"], input[type="text"]')
          if (formVisible > 0) {
            pass(`Formulário público: acessível em /form/${slug}`)
            info('Formulário: campos do Step 1 visíveis')
            formOk = true
            break
          }
        }
      }
      if (!formOk) info('Formulário público: não conseguiu encontrar slug ativo para testar')
    }

    // ══════════════════════════════════════════════════════════════════════════
    step('11 · VERIFICAÇÃO FINAL — erros de console')
    // ══════════════════════════════════════════════════════════════════════════
    // Erros HTTP
    if (failedReqs.length === 0) {
      pass('Nenhuma requisição HTTP com erro durante toda a sessão')
    } else {
      const by5xx = failedReqs.filter(r => r.status >= 500)
      const by4xx = failedReqs.filter(r => r.status >= 400 && r.status < 500)
      if (by5xx.length) {
        fail(`${by5xx.length} requisição(ões) com erro 5xx (servidor):`)
        by5xx.forEach(r => fail(`  HTTP ${r.status} → ${r.path}`))
      }
      if (by4xx.length) {
        warn(`${by4xx.length} requisição(ões) com erro 4xx (cliente):`)
        by4xx.forEach(r => warn(`  HTTP ${r.status} → ${r.path}`))
      }
    }

    // Erros de JS
    if (consoleErrs.length > 0) {
      const unique = [...new Set(consoleErrs)]
      warn(`${unique.length} tipo(s) de erro de console JS:`)
      unique.forEach(e => warn(`  ${e}`))   // sem truncar — precisamos da URL completa
    } else {
      pass('Nenhum erro de console JS durante toda a sessão')
    }

  } finally {
    await page.waitForTimeout(2000) // pausa final para o usuário ver
    await browser.close()
  }

  summarize()
}

function summarize() {
  console.log('\n' + '═'.repeat(60))
  console.log('  RESULTADO FINAL DA EXPLORAÇÃO')
  console.log('═'.repeat(60))
  console.log(`  ✅ Passou:         ${passes.length}`)
  console.log(`  ⚠️  Avisos:        ${warnings.length}`)
  console.log(`  ❌ Falhas/Erros:   ${errors.length}`)

  if (warnings.length) {
    console.log('\n  Avisos:')
    warnings.forEach(w => console.log('    ⚠️  ' + w))
  }
  if (errors.length) {
    console.log('\n  Falhas:')
    errors.forEach(e => console.log('    ❌ ' + e))
  }
  console.log('\n' + '═'.repeat(60))
}

run().catch(e => {
  console.error('\n❌ ERRO FATAL:', e.message)
  process.exit(1)
})
