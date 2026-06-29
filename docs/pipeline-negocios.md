# Spec: Pipeline de Negócios

> Metodologia Specs + Loop — snps.ai/guias/specs-e-loop-claude-code

---

## Objetivo

Permitir que corretores registrem e acompanhem negociações em andamento, vinculando um lead a um imóvel específico e rastreando o avanço pela jornada de venda — do interesse ao fechamento. Conecta os módulos Leads, Imóveis, Visitas, Comissões e Relatórios num fluxo único.

---

## Critérios de aceite

- [ ] Corretor cria uma negociação a partir de um lead existente + imóvel existente
- [ ] Negociação percorre 6 etapas: Interesse → Visita Agendada → Proposta Enviada → Em Negociação → Fechado / Perdido
- [ ] Board kanban mostra colunas por etapa; cada card tem nome do lead, título do imóvel e dias na etapa
- [ ] Ao avançar etapa, o sistema atualiza o card imediatamente (sem reload de página)
- [ ] Ao fechar como "Fechado": imóvel é marcado como `sold` automaticamente via PATCH `/api/properties/[id]`
- [ ] Ao fechar como "Perdido": negociação é arquivada (permanece visível com filtro "Arquivadas")
- [ ] Dashboard exibe KPI "Negociações ativas" com link para o pipeline
- [ ] Relatórios exibem taxa de conversão: negociações abertas vs. fechadas no período
- [ ] TypeScript: `npm run typecheck` com zero erros

---

## Escopo

**Inclui:**
- Nova rota `/dashboard/pipeline`
- Novo item no Sidebar entre Visitas e Relatórios
- CRUD de negociações via `/api/deals`
- Kanban com 6 colunas; cards arrastáveis via clique (não drag-and-drop nativo para manter simplicidade)
- Modal de detalhes: trocar etapa, adicionar nota, ver histórico de mudanças
- Integração de fechamento: PATCH automático no imóvel
- KPI no Dashboard (`/dashboard`)
- Seção "Conversão de negócios" em Relatórios

**Não inclui:**
- Drag-and-drop nativo com `@dnd-kit` ou similar (usar botões de avanço/recuo por ora)
- Envio de proposta por e-mail ou PDF automatizado (spec separada)
- Integração automática com Google Calendar (vincular visita existente é manual)
- Notificações push ao avançar etapa

---

## Restrições técnicas

- Multi-tenant: toda query filtra por `company_id` do usuário autenticado
- Auth: padrão `getUser()` + fallback `getSession()` em todas as rotas de API
- Design system: variáveis `--domus-*` e classes `domus-*` (sem Tailwind hardcoded)
- TypeScript: zero erros em `npm run typecheck`
- Sem comentários desnecessários, sem features além do pedido

---

## Schema Supabase

```sql
-- Tabela principal
create table deals (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  lead_id       uuid not null references leads(id) on delete cascade,
  property_id   uuid references properties(id) on delete set null,
  stage         text not null default 'interest'
                check (stage in ('interest','visit_scheduled','proposal_sent','negotiation','closed','lost')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  closed_at     timestamptz
);

-- Histórico de mudanças de etapa
create table deal_events (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid not null references deals(id) on delete cascade,
  from_stage text,
  to_stage   text not null,
  note       text,
  created_at timestamptz not null default now()
);

-- RLS obrigatório: usuários só veem deals da sua company
alter table deals      enable row level security;
alter table deal_events enable row level security;
```

**Campos relevantes de tabelas existentes:**
- `leads.id`, `leads.name`, `leads.status`
- `properties.id`, `properties.title`, `properties.value`, `properties.status`
- `companies.id` — presente em `profiles` via `company_id`

---

## Interface (wireframe textual)

```
[Header sticky]
  "Domus · Pipeline"          [+ Nova negociação]  [Filtro: Ativas | Arquivadas]

[KPI strip — 4 cards]
  Ativas | Fechadas (mês) | Taxa conversão | Ticket médio fechado

[Kanban — 6 colunas, scroll horizontal]
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ Interesse (3)   │  │ Visita (2)      │  │ Proposta (1)    │  ...
  │                 │  │                 │  │                 │
  │ [Card]          │  │ [Card]          │  │ [Card]          │
  │  Nome do lead   │  │  Nome do lead   │  │  Nome do lead   │
  │  Título imóvel  │  │  Título imóvel  │  │  Título imóvel  │
  │  R$ valor       │  │  R$ valor       │  │  R$ valor       │
  │  3 dias         │  │  1 dia          │  │  5 dias         │
  │  [→ Avançar]    │  │  [→ Avançar]    │  │  [→ Avançar]    │
  └─────────────────┘  └─────────────────┘  └─────────────────┘

  Coluna "Fechado" — fundo verde claro
  Coluna "Perdido" — fundo cinza, oculta por padrão (aparece com filtro "Arquivadas")

[Modal ao clicar no card]
  Cabeçalho: Nome do lead + imóvel
  Etapa atual (badge colorido) + botões [← Recuar] [Avançar →]
  Dropdown para marcar como Fechado / Perdido
  Campo de nota (textarea)
  Histórico: lista de eventos com data + mudança de etapa + nota
  Botão: Salvar nota
```

---

## API endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/deals` | Lista negociações da empresa (query: `?stage=`, `?archived=true`) |
| POST | `/api/deals` | Cria negociação (`lead_id`, `property_id`, `notes?`) |
| GET | `/api/deals/[id]` | Detalhe + histórico de eventos |
| PATCH | `/api/deals/[id]` | Atualiza stage, notes ou closed_at |
| DELETE | `/api/deals/[id]` | Remove negociação (soft: marca como `lost` + `closed_at`) |

**Payload POST `/api/deals`:**
```json
{ "lead_id": "uuid", "property_id": "uuid", "notes": "opcional" }
```

**Payload PATCH `/api/deals/[id]` — avançar etapa:**
```json
{ "stage": "proposal_sent", "note": "Proposta enviada por WhatsApp" }
```
O servidor cria automaticamente um `deal_event` com `from_stage` → `to_stage`.

**Payload PATCH — fechar:**
```json
{ "stage": "closed", "note": "Contrato assinado", "close_property": true }
```
Se `close_property: true`, o servidor faz PATCH interno em `/api/properties/[property_id]` marcando `status: 'sold'` e `sold_at: now()`.

---

## Tipos TypeScript (adicionar em `src/lib/types.ts`)

```ts
export type DealStage =
  | 'interest'
  | 'visit_scheduled'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed'
  | 'lost'

export interface Deal {
  id:          string
  company_id:  string
  lead_id:     string
  property_id: string | null
  stage:       DealStage
  notes:       string | null
  created_at:  string
  updated_at:  string
  closed_at:   string | null
  // joins
  lead?:       { name: string; status: string }
  property?:   { title: string; value: number | null }
}

export interface DealEvent {
  id:         string
  deal_id:    string
  from_stage: DealStage | null
  to_stage:   DealStage
  note:       string | null
  created_at: string
}
```

---

## Integração com módulos existentes

| Módulo | Mudança |
|---|---|
| Dashboard | Adicionar KPI "Negociações ativas" com link para `/dashboard/pipeline` |
| Sidebar | Novo item `{ href: '/dashboard/pipeline', icon: Handshake, label: 'Pipeline', adminOnly: false }` |
| Relatórios | Nova seção: "Negócios — conversão" com total aberto vs. fechado no período e ticket médio |
| Imóveis | Nenhuma mudança na UI — status `sold` continua sendo atualizado via PATCH existente |

---

## Configuração das etapas (constante no frontend)

```ts
export const DEAL_STAGES: {
  key: DealStage; label: string; color: string; bg: string; terminal?: boolean
}[] = [
  { key: 'interest',        label: 'Interesse',        color: 'var(--domus-text-muted)', bg: 'var(--domus-ink-100)' },
  { key: 'visit_scheduled', label: 'Visita Agendada',  color: 'var(--domus-warning)',    bg: 'var(--domus-warning-bg)' },
  { key: 'proposal_sent',   label: 'Proposta Enviada', color: 'var(--domus-brand)',      bg: 'var(--domus-green-50)' },
  { key: 'negotiation',     label: 'Em Negociação',    color: '#7C3AED',                 bg: '#F3EFFF' },
  { key: 'closed',          label: 'Fechado',          color: 'var(--domus-success)',    bg: 'var(--domus-success-bg)', terminal: true },
  { key: 'lost',            label: 'Perdido',          color: 'var(--domus-danger)',     bg: 'var(--domus-danger-bg)', terminal: true },
]
```

---

## Verde (verificação)

```bash
npm run typecheck   # zero erros TypeScript
```

Verificação manual após implementação:
1. Criar negociação com lead + imóvel → aparece na coluna "Interesse"
2. Avançar para "Visita Agendada" → card muda de coluna + evento criado no histórico
3. Avançar para "Fechado" → imóvel fica `sold` no módulo Imóveis
4. Marcar como "Perdido" → negociação some do board padrão, aparece em "Arquivadas"
5. Dashboard mostra KPI atualizado

---

## Checklist de implementação

- [ ] Tipos `DealStage`, `Deal`, `DealEvent` adicionados em `src/lib/types.ts`
- [ ] Tabelas `deals` e `deal_events` criadas no Supabase (SQL acima)
- [ ] Route handler `GET/POST /api/deals` criado
- [ ] Route handler `GET/PATCH/DELETE /api/deals/[id]` criado
- [ ] Página `src/app/dashboard/pipeline/page.tsx` com kanban + modal
- [ ] Entrada no Sidebar adicionada (`Handshake` icon do lucide-react)
- [ ] KPI "Negociações ativas" adicionado em `src/app/dashboard/page.tsx`
- [ ] Seção de conversão adicionada em `src/app/dashboard/reports/page.tsx`
- [ ] `npm run typecheck` → zero erros
- [ ] Critérios de aceite verificados manualmente
