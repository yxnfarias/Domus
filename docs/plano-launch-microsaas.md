# Plano de Launch — Domus como Micro-SaaS com Cakto

## Entendimento da plataforma

Domus é um SaaS multi-tenant de gestão imobiliária. Cada **empresa (imobiliária)** é um tenant isolado por `company_id`. A plataforma já tem os módulos core prontos: gestão de leads com análise de crédito, catálogo de imóveis, calculadora de precificação hedônica, agendamento de visitas, pipeline de negócios, comissões e relatórios.

A stack (Next.js 15 + Supabase) é naturalmente compatível com deploy na Vercel + Supabase Cloud — sem nenhuma mudança de arquitetura.

---

## O que falta para ir ao ar

A plataforma não tem: página pública de venda, fluxo de cadastro de empresa, controle de assinatura/acesso e integração com gateway de pagamento. Tudo o que o plano abaixo endereça.

---

## Fase 1 — Infraestrutura de assinatura (Supabase)

**Objetivo:** controlar se uma empresa tem acesso ativo ou não.

### 1.1 Migration no Supabase

Criar a tabela `subscriptions` e adicionar campo de status em `companies`:

```sql
-- Tabela de assinaturas
create table subscriptions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references companies(id) on delete cascade,
  cakto_order_id  text unique,           -- ID do pedido na Cakto
  cakto_email     text,                  -- email do comprador na Cakto
  plan            text not null,         -- 'starter' | 'pro'
  status          text not null default 'active', -- 'active' | 'cancelled' | 'overdue'
  trial_ends_at   timestamptz,
  current_period_ends_at timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Status de acesso na tabela companies
alter table companies add column if not exists
  access_status text not null default 'trial'; -- 'trial' | 'active' | 'suspended'

alter table companies add column if not exists
  trial_ends_at timestamptz default (now() + interval '14 days');
```

### 1.2 Row Level Security

Nenhuma query à `subscriptions` pode ser feita pelo cliente — apenas via route handlers server-side com a service role key.

---

## Fase 2 — Webhook da Cakto

**Objetivo:** a Cakto notifica o Domus quando uma venda é confirmada, renovada ou cancelada.

### 2.1 Criar `/api/webhooks/cakto/route.ts`

```ts
// Eventos relevantes da Cakto:
// purchase_approved  → ativar empresa
// subscription_cancelled → suspender empresa  
// chargeback         → suspender empresa
// subscription_renewed → atualizar period_ends_at
```

Fluxo do handler:
1. Verificar assinatura do webhook (header `x-cakto-signature` com HMAC-SHA256 do body usando secret configurado no painel Cakto).
2. Identificar a empresa pelo `email` do comprador (campo `cakto_email` na `subscriptions`).
3. Atualizar `companies.access_status` e `subscriptions.status` conforme o evento.
4. Retornar `200 OK` sempre (mesmo em casos de erro interno, para evitar reenvios em loop).

### 2.2 Configurar na Cakto

No painel da Cakto (Produto → Integrações → Webhook), apontar para:
```
https://seudominio.com.br/api/webhooks/cakto
```

---

## Fase 3 — Middleware de acesso

**Objetivo:** qualquer rota `/dashboard/*` verifica se a empresa tem `access_status = 'active'` ou está em trial válido.

### 3.1 `src/middleware.ts`

```ts
// Lógica de bloqueio:
// 1. Usuário não logado → redirecionar para /login
// 2. Empresa com access_status = 'suspended' → redirecionar para /suspended
// 3. Empresa em trial e trial_ends_at < now() → redirecionar para /trial-expired
// 4. Caso contrário → deixar passar

// Rotas públicas que não precisam de verificação:
// /, /login, /signup, /api/webhooks/*, /api/auth/*
```

---

## Fase 4 — Fluxo de cadastro (Onboarding)

**Objetivo:** alguém que chegou pela landing page consegue criar sua conta e empresa sem intervenção manual.

### 4.1 Página `/signup`

Formulário em 2 steps:

**Step 1 — Dados da empresa**
- Nome da imobiliária
- CNPJ (opcional inicialmente)
- Slug (subdomínio ou identificador único)

**Step 2 — Dados do admin**
- Nome completo
- E-mail
- Senha

Ao submeter:
1. Criar usuário no Supabase Auth.
2. Criar registro em `companies` com `access_status = 'trial'` e `trial_ends_at = now() + 14 days`.
3. Criar registro em `company_users` com `role = 'admin'`.
4. Redirecionar para `/dashboard` com banner de trial ativo.

### 4.2 Página `/trial-expired`

Explica que o trial expirou e exibe o link/botão de compra da Cakto (link do produto). Após pagar, o webhook ativa a conta automaticamente.

### 4.3 Página `/suspended`

Para contas com chargeback ou cancelamento. Exibe opção de reativar (link Cakto) ou contato.

---

## Fase 5 — Landing page pública

**Objetivo:** página de venda do Domus em `/` (fora do dashboard).

### Estrutura sugerida

```
/                    → landing page (marketing)
/precos              → página de planos e preços
/signup              → cadastro (trial gratuito de 14 dias)
/login               → login
/trial-expired       → tela de upgrade
/suspended           → tela de conta suspensa
/dashboard/*         → plataforma (protegida)
```

### Seções da landing page

1. **Hero** — proposta de valor ("Gerencie sua imobiliária do lead ao fechamento")
2. **Módulos** — cards visuais dos 8 módulos existentes
3. **Prova social** — depoimentos (adicionar quando tiver clientes)
4. **Planos e preços** — tabela comparativa
5. **CTA** — "Comece grátis por 14 dias" → `/signup`

---

## Fase 6 — Planos e preços

Sugestão de precificação (ajustar conforme seu mercado):

| Plano | Preço/mês | Usuários | Imóveis | Leads |
|---|---|---|---|---|
| **Starter** | R$ 149 | até 3 | ilimitado | ilimitado |
| **Pro** | R$ 299 | ilimitado | ilimitado | ilimitado |

Na Cakto, criar dois produtos com recorrência mensal. O link de checkout de cada plano vai nos botões da landing page e na tela de trial expirado.

### Associar plano ao tenant

Quando o webhook chega, gravar `plan: 'starter'` ou `'pro'` na `subscriptions` com base no `product_id` da Cakto (virá no payload do webhook).

O middleware e o frontend podem usar o plano para limitar funcionalidades (ex: limitar equipe a 3 usuários no Starter).

---

## Fase 7 — Super Admin panel

**Objetivo:** você (Yan) consegue ver e gerenciar todos os tenants sem mexer direto no banco.

### `/dashboard/admin/companies` (já existe parcialmente via `adminOnly`)

Adicionar:
- Listagem de todas as empresas com status de assinatura
- Botão para ativar/suspender manualmente
- Histórico de webhooks recebidos (tabela `webhook_logs`)
- Impersonation básico (logar como admin de qualquer empresa para suporte)

---

## Fase 8 — Deploy

### 8.1 Supabase

- Criar projeto de produção em [supabase.com](https://supabase.com) (separado do dev).
- Rodar as migrations (Fase 1) no projeto de produção.
- Configurar buckets de storage (fotos de imóveis, documentos de leads).
- Anotar `SUPABASE_URL` e `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.

### 8.2 Vercel

```bash
# Push para GitHub (se ainda não tiver)
git init && git add . && git commit -m "feat: initial commit"
git remote add origin https://github.com/seu-usuario/domus.git
git push -u origin main

# Na Vercel: importar repositório → Next.js detectado automaticamente
```

**Variáveis de ambiente na Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CAKTO_WEBHOOK_SECRET=     # secret HMAC configurado no painel Cakto
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 8.3 Domínio

- Registrar domínio (ex: `domusgestao.com.br`) no Registro.br.
- Apontar para Vercel (adicionar domínio custom no projeto Vercel).
- SSL é provisionado automaticamente pela Vercel.

---

## Ordem de execução (sprint sugerida)

| Semana | Entregas |
|---|---|
| 1 | Migration Supabase + tabela subscriptions + middleware de acesso |
| 1 | Webhook `/api/webhooks/cakto` + verificação HMAC |
| 2 | Página `/signup` com criação de empresa + trial |
| 2 | Páginas `/trial-expired` e `/suspended` |
| 3 | Landing page `/` + página de preços |
| 3 | Super admin panel com listagem de companies |
| 4 | Deploy Vercel + Supabase produção + domínio |
| 4 | Criar produtos na Cakto + configurar webhook URL + teste end-to-end |

---

## Checklist pré-launch

- [ ] `npx tsc --noEmit` → zero erros
- [ ] `npm run build` → build limpo
- [ ] Teste de webhook: simular `purchase_approved` via cURL e verificar que empresa muda para `active`
- [ ] Teste de signup → trial → expiração → pagamento → ativação
- [ ] RLS do Supabase revisado (nenhum dado cross-tenant acessível)
- [ ] Variáveis de ambiente de produção configuradas (nenhuma key de dev vazando)
- [ ] Domínio com HTTPS funcionando
- [ ] E-mail transacional (Supabase já envia convites e reset de senha — verificar template)

---

## Observação sobre a Cakto

A Cakto é focada em infoprodutores mas **suporta recorrência** (mencionado no FAQ). A integração via webhook é padrão: você cadastra a URL do seu endpoint e eles enviam POSTs JSON para eventos de compra/cancelamento. O payload exato da Cakto deve ser confirmado na documentação deles em [ajuda.cakto.com.br](https://ajuda.cakto.com.br) — adaptar os campos `cakto_order_id` e `product_id` conforme o schema real do webhook deles.
