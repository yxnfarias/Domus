# Plano de Implementação: Hub de Parcerias (MLS) & Simulador Multibancos

Este documento detalha o plano técnico e arquitetural para a implementação das duas novas funcionalidades prioritárias na plataforma **Domus**:
1. **Hub de Parcerias Imobiliárias (Rede MLS Integrada)**
2. **Comparador Financeiro Multibancos Detalhado**

---

## 1. Hub de Parcerias Imobiliárias (Rede MLS Integrada)

### Arquitetura & Banco de Dados
Para permitir o compartilhamento seguro de imóveis entre diferentes imobiliárias (*tenants*), precisamos ajustar as políticas de segurança ao nível de linha (RLS) e estender a tabela `properties`.

#### [NEW] Migração SQL (`supabase/migrations/007_shared_properties_mls.sql`)
1. **Colunas na tabela `properties`:**
   * `is_shared` (`BOOLEAN DEFAULT false`): Indica se o imóvel está disponível para a rede de parcerias.
   * `shared_commission_pct` (`NUMERIC(4,2) DEFAULT 50.00`): Percentual de divisão da comissão de venda com o corretor parceiro (ex: 50%).
   * `contact_phone` (`TEXT`): Telefone/WhatsApp do corretor responsável pela captação para facilitação direta de contato.
2. **Ajuste na Política RLS de Leitura:**
   * Modificar a política de `SELECT` da tabela `properties` para permitir que qualquer usuário autenticado veja imóveis que pertencem à sua organização OU que estejam marcados como compartilhados (`is_shared = true`).
   * As políticas de `INSERT`, `UPDATE` e `DELETE` permanecem restritas ao proprietário original (`company_id = auth_company_id()`).
3. **Nova Tabela `partnership_proposals`:**
   * Permite registrar e formalizar propostas de parcerias e visitas conjuntas direto pelo sistema, mantendo a trilha de auditoria para fins de garantia da comissão.

```sql
-- Adiciona colunas na tabela properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS shared_commission_pct NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Recria a política de SELECT para properties para suportar o MLS
DROP POLICY IF EXISTS "company owns property" ON properties;
DROP POLICY IF EXISTS "properties_select" ON properties;

CREATE POLICY "properties_select_mls" ON properties
  FOR SELECT
  USING (company_id = auth_company_id() OR is_shared = true);

CREATE POLICY "properties_write_own" ON properties
  FOR ALL
  USING (company_id = auth_company_id())
  WITH CHECK (company_id = auth_company_id());

-- Tabela para propostas de parceria
CREATE TABLE IF NOT EXISTS partnership_proposals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receiver_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE partnership_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON partnership_proposals
  FOR SELECT
  USING (sender_company_id = auth_company_id() OR receiver_company_id = auth_company_id());

CREATE POLICY "proposals_insert" ON partnership_proposals
  FOR INSERT
  WITH CHECK (sender_company_id = auth_company_id());
```

### Alterações no Frontend
1. **Cadastro de Imóvel (`src/app/dashboard/imoveis`):**
   * Adição de um card/seção "Parceria MLS" no formulário de cadastro de imóveis, contendo o interruptor (Toggle/Switch) "Disponibilizar para parceria" e o campo numérico "Comissão de parceria (%)".
2. **Dashboard de Leads (Aba Matching de Imóveis no `LeadModal.tsx`):**
   * A busca de matching passará a consultar tanto imóveis próprios quanto imóveis da rede MLS da mesma região geográfica.
   * Imóveis compartilhados serão marcados visualmente com uma tag de destaque (ex: `Parceria 50/50`) e exibirão o nome da imobiliária dona da captação.
   * Adição de um botão de ação rápida: *"Solicitar Parceria via WhatsApp"* (gera um link parametrizado para o WhatsApp do captador do imóvel informando sobre o lead pré-qualificado) e *"Formalizar Parceria no Sistema"*.

---

## 2. Comparador Financeiro Multibancos Detalhado

### Engenharia do Motor de Crédito
Substituição da taxa de juros única na classe de utilidades de crédito por uma modelagem estatística real baseada nas regras atuais dos maiores bancos brasileiros.

#### [MODIFY] Atualização do Simulador (`src/lib/credit-engine.ts`)
Implementação de regras de negócio específicas para cada banco:

| Banco | Taxa Nominal Média (A.A.) | LTV Máx (SAC) | LTV Máx (PRICE) | Regras Específicas / Subsídios |
| :--- | :--- | :--- | :--- | :--- |
| **Caixa Econômica (SBPE)** | 9.00% + TR | 80% | 70% | Taxa reduzida se houver relacionamento ou conta salário. |
| **Caixa (MCMV)** | 4.25% a 8.16% | 90% | 80% | Baseado nas faixas de renda e região geográfica (com cálculo de subsídio). |
| **Itaú** | 10.49% + TR | 82% | 82% | Comprometimento máximo de 30% da renda comprovada. |
| **Bradesco** | 10.50% + TR | 80% | 80% | Simulações tradicionais SAC. |
| **Santander** | 10.99% + TR | 80% | 80% | Menor burocracia para autônomos. |

* **Cálculo de Seguros MIP e DFI:** Integração de cálculo dinâmico de seguro MIP (Morte e Invalidez Permanente) baseado na idade do lead (aumenta progressivamente com a idade) e seguro DFI (Danos Físicos ao Imóvel) fixado em um percentual padrão do valor do imóvel.

#### [MODIFY] API de Crédito (`src/app/api/credit/route.ts`)
* A API retornará uma lista contendo os dados detalhados para cada um dos bancos simulados, permitindo que o frontend exiba um gráfico comparativo de parcelas e custos de financiamento.

### Alterações no Frontend
1. **Ficha do Lead (Aba Crédito no `LeadModal.tsx`):**
   * Substituição da visualização genérica de financiamento por um grid comparativo contendo logotipos dos bancos.
   * Destaque automático para a opção com **"Melhor Custo Benefício"** (menor parcela inicial ou menor custo efetivo total).
   * Barra visual mostrando o percentual de comprometimento da renda para cada opção de banco.
2. **Laudo PDF de Crédito (`src/lib/pdf-export.ts`):**
   * Ajuste na estrutura de geração do PDF para conter um gráfico comparativo (tabela estruturada) com a projeção das prestações dos 4 bancos, elevando drasticamente a autoridade do laudo gerado pelo corretor perante o cliente.

---

## 3. Plano de Verificação

### Testes Automatizados (Playwright)
* Adicionar rotas de teste simuladas no script `domus-test.mjs` para validar:
  1. A exibição e filtros da aba MLS no portfólio de imóveis.
  2. A exibição do comparador de bancos e cálculo correto das parcelas do Simulador de Crédito.

### Validação Manual
1. **Fluxo do MLS:** Criar um imóvel como "Company A" e marcar como compartilhado. Logar como "Company B" e confirmar se o imóvel aparece no matching inteligente e na listagem geral com identificação clara de parceria.
2. **Simulador:** Inserir dados de lead com diferentes faixas etárias e rendas e conferir se os valores máximos financiados e taxas de juros acompanham corretamente as regras de negócio de cada banco (especialmente a transição para taxas MCMV).
