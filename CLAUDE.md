# Domus — Constituição do Projeto

Plataforma SaaS multi-tenant de gestão imobiliária. Stack: Next.js 15 App Router + Turbopack, TypeScript, Supabase, Tailwind CSS.

## Stack e padrões essenciais

- **Framework**: Next.js 15 App Router (`src/app/`). Componentes client-side levam `'use client'` no topo.
- **Auth**: Supabase SSR via `@supabase/ssr`. Em rotas de API, sempre usar `getUser()` com fallback para `getSession()` em caso de erro (proxy TLS):
  ```ts
  const { data: userData, error } = await supabase.auth.getUser()
  let user = userData.user
  if (!user && error) {
    const { data: sd } = await supabase.auth.getSession()
    user = sd.session?.user ?? null
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- **Multi-tenant**: Cada empresa tem `company_id`. Toda query ao banco deve filtrar por `company_id` do usuário autenticado. Nunca expor dados cross-tenant.
- **Proxy corporativo**: `NODE_TLS_REJECT_UNAUTHORIZED=0` já está em `next.config.js`. Não remover.

## Design system

CSS variables definidas em `src/app/globals.css`. Usar sempre as variáveis, nunca hardcodar cores:

| Token | Uso |
|---|---|
| `--domus-white` | Fundo sidebar e cards |
| `--domus-surface` | Fundo de página (ivory) |
| `--domus-surface-sunken` | Fundo rebaixado (#F2EEE6) |
| `--domus-border` | Bordas |
| `--domus-text` | Texto principal |
| `--domus-text-muted` | Texto secundário |
| `--domus-green-500` | Verde primário |
| `--domus-danger` | Vermelho para erros |

Classes de componente disponíveis: `domus-card`, `domus-input`, `domus-input--error`, `domus-label`, `domus-btn`, `domus-btn--ghost`, `domus-nav-item`, `domus-eyebrow`.

**Atenção**: `var(--domus-bg)` e `var(--domus-bg-subtle)` **não existem** — usar `--domus-surface` e `--domus-surface-sunken`. A classe `domus-spinner` **não existe** — usar `@keyframes` inline.

## RBAC

Roles: `super_admin` > `admin` > `member`. Definidos em `src/lib/types.ts`.

- Rotas admin-only: verificar role via `/api/me` no cliente ou via Supabase no servidor.
- Itens `adminOnly: true` no Sidebar só aparecem para `admin` e `super_admin`.

## Estrutura de arquivos

```
src/
  app/
    api/          # Route handlers Next.js
    dashboard/    # Páginas do dashboard (cada subpasta = módulo)
    login/        # Auth pages
  components/
    dashboard/    # Componentes específicos do dashboard
    ui/           # Componentes reutilizáveis
  lib/
    supabase-browser.ts   # Cliente Supabase para uso client-side
    types.ts              # Tipos TypeScript compartilhados
    utils.ts              # Helpers (cn, formatCurrency, etc.)
docs/             # Specs de features (MD)
```

## Convenções de código

- Sem comentários óbvios — nomes autoexplicativos bastam.
- Sem tratamento de erros para cenários impossíveis — confiar nas garantias do framework.
- Sem features extras além do pedido.
- Imports lucide-react na mesma linha de destructuring dos outros ícones existentes.
- Formulários multi-step: estado por step separado (`s1`, `s2`, `s3`), não um objeto gigante.

## Verificação ("verde")

Antes de marcar qualquer tarefa como concluída:

```bash
npx tsc --noEmit
```

Zero erros TypeScript = verde. O build Next.js (`npm run build`) é o verde final antes de deploy.

## Módulos existentes

| Rota | Módulo |
|---|---|
| `/dashboard` | Visão geral / KPIs |
| `/dashboard/leads` | Gestão de leads |
| `/dashboard/imoveis` | Catálogo de imóveis |
| `/dashboard/precificacao` | Calculadora de precificação (hedônica) |
| `/dashboard/visistar` | Agendamento de visitas |
| `/dashboard/reports` | Relatórios |
| `/dashboard/equipe` | Gestão de equipe (admin) |
| `/dashboard/commissions` | Comissões (admin) |
| `/dashboard/settings` | Configurações |

## APIs externas sem chave

- **ViaCEP**: `https://viacep.com.br/ws/{cep}/json/` — busca endereço por CEP, gratuita.

## Fluxo para novo módulo

1. Criar `docs/nome-do-modulo.md` com spec (usar `docs/spec-template.md`)
2. Adicionar entrada no `baseNavItems` do Sidebar (`src/components/dashboard/Sidebar.tsx`)
3. Criar `src/app/dashboard/nome/page.tsx` com `'use client'`
4. Criar route handler em `src/app/api/nome/route.ts` se necessário
5. Rodar `npx tsc --noEmit` — zero erros antes de concluir
