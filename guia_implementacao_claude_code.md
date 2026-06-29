# Guia de Implementação: Domus MicroSaaS (Para Claude Code)

Este documento serve como um guia passo a passo e um "kit de prompts" para que você utilize no **Claude Code** (ou outra IA de desenvolvimento) para construir o sistema Domus com base no PRD fornecido.

---

## 🛠️ Stack Tecnológica Recomendada
* **Framework Fullstack:** Next.js (React)
* **Banco de Dados & Auth:** Supabase (PostgreSQL com RLS)
* **Estilização:** Tailwind CSS + Framer Motion
* **OCR:** Mindee (Free tier) ou Tesseract.js (100% Free)
* **Geração de PDF:** React-PDF

---

## 🚀 Passo a Passo de Implementação

### 🔐 Fase 1: Banco de Dados & Segurança (Multi-tenancy)
O primeiro passo é criar a estrutura de dados garantindo que as empresas não vejam os dados umas das outras.

**Prompt para o Claude Code:**
```text
Atue como um Engenheiro de Dados especialista em PostgreSQL. Preciso criar o esquema de banco de dados para o MicroSaaS 'Domus' no Supabase. O sistema é Multi-tenant. Crie o script SQL para as seguintes tabelas:

1. companies (id, name, slug, logo_url, theme_config (JSON para cores/fontes)).
2. leads (id, company_id, name, email, whatsapp, cpf, rg, birth_date, marital_status, income, work_regime, status, credit_score, pdf_url).
3. spouse_data (id, lead_id, name, cpf, income).

IMPORTANTE: Ative o Row Level Security (RLS) nas tabelas leads e spouse_data. Crie as políticas RLS para que usuários autenticados da company_id X só possam ver e editar os leads pertencentes à company_id X.
```

#### Snippet de Referência SQL (Para você ou a IA):
```sql
-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política para leitura
CREATE POLICY select_leads_policy ON leads
    FOR SELECT
    USING (company_id = auth.jwt() ->> 'company_id');

-- Política para inserção
CREATE POLICY insert_leads_policy ON leads
    FOR INSERT
    WITH CHECK (company_id = auth.jwt() ->> 'company_id');
```

---

### 🎨 Fase 2: UI/UX Glassmorphism & White-Label
Configuração visual para garantir o aspecto premium e a personalização de marca.

**Prompt para o Claude Code:**
```text
Atue como um desenvolvedor Frontend especialista em UI/UX e Tailwind CSS. Crie um arquivo de configuração de tema no Next.js que utilize variáveis CSS nativas (ex: --primary-color, --border-radius) para que possamos alterar o visual do site dinamicamente com base no company_id.

Além disso, crie uma classe utilitária no Tailwind para o efeito Glassmorphism que utilize `backdrop-filter: blur(10px)`, bordas semi-transparentes brancas e sombras suaves, exatamente como descrito no PRD do projeto Domus.
```

#### Snippet de Referência CSS (Efeito Vidro):
```css
.glass-effect {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}
```

---

### 📝 Fase 3: Formulário do Lead (Estilo Typeform)
Criação do formulário dinâmico e fluído.

**Prompt para o Claude Code:**
```text
Crie um componente de formulário multi-etapas (Typeform-like) usando React e Framer Motion para animações fluidas. O formulário deve coletar:
1. Dados iniciais (Nome, Email, WhatsApp com máscara).
2. CPF (com validação de algoritmo de CPF) e RG.
3. Se o estado civil for 'Casado', abra um card dinâmico para dados do cônjuge.
4. Se o regime for CLT, peça 3 holerites. Se for Autônomo, peça 3 extratos. (Simule o componente de Dropzone para upload de arquivos usando o design Glassmorphism).

Garanta que o progresso seja salvo no estado global e que as transições sejam suaves.
```

---

### 📊 Fase 4: Dashboard do Corretor
Interface de gestão dos leads.

**Prompt para o Claude Code:**
```text
Crie a página de Dashboard do Corretor no Next.js. Ela deve ler os dados do Supabase filtrando pela empresa do usuário logado.

Requisitos:
1. Tabela estilizada (Glassmorphism) listando os leads por data, score e status.
2. Ao clicar em um lead, deve abrir um modal flutuante (sem recarregar a página) com efeito de desfoque no fundo.
3. Dentro do modal, exiba os dados organizados em abas ou blocos e um botão proeminente: 'Executar Análise de Crédito Inteligente'.
```

---

### 🧠 Fase 5: Motor de Crédito & OCR
A inteligência do sistema.

**Prompt para o Claude Code:**
```text
Atue como desenvolvedor backend. Preciso criar a lógica do 'Motor de Crédito' do Domus.
Crie uma função (que pode ser uma Supabase Edge Function ou API Route no Next.js) que:
1. Receba o arquivo PDF do holerite/extrato do lead.
2. Use a biblioteca Tesseract.js ou a API do Mindee para extrair o texto do documento.
3. Procure por padrões como 'Rendimento Líquido', 'Valor Recebido' ou datas de depósito para validar a renda.
4. Aplique a regra do SFH (Sistema Financeiro da Habitação): O comprometimento da renda bruta não pode passar de 30%.
5. Retorne o score e a capacidade de financiamento nos modelos SAC e PRICE.
```

---

### 🔗 Fase 6: Integrações e PDFs
Finalização e entrega de valor.

**Prompt para o Claude Code:**
```text
Crie duas funcionalidades finais para o Domus:
1. Um gerador de PDF (usando React-PDF) que monte o 'Laudo de Viabilidade de Crédito' com um design profissional, incluindo gráficos simples ou tabelas com a simulação SAC/PRICE.
2. Um botão para o Dashboard que gere um link do WhatsApp (`https://wa.me/{numero}`) com uma mensagem pré-formatada contendo os resultados do laudo para que o corretor envie ao cliente com um clique.
```

---

### 🤖 Fase 7: Refinamento de Texto de Imóveis com IA (Gemini)
Esta fase adiciona inteligência ao formulário de cadastro de imóveis, permitindo que o corretor gere títulos e descrições profissionais automaticamente.

> [!WARNING]
> **Segurança:** A chave da API foi inserida abaixo para facilitar o uso no Claude Code, mas **NÃO** envie este arquivo para o GitHub ou controle de versão com a chave exposta. O ideal é movê-la para o `.env.local`.

**Passo Prévio (Manual):**
Adicione a chave da API no seu arquivo `.env.local`:
```env
GEMINI_API_KEY=AIzaSyA4-rvnx6TmEpzAul0ugsdanJNbHJJZBUk
```

**Prompt para o Claude Code:**
```text
Atue como um desenvolvedor Fullstack no projeto Domus (Next.js). Precisamos implementar a funcionalidade de refinamento de texto com IA no formulário de criação de imóveis.

Siga estes passos:
1. Instale o pacote oficial do Google Gemini: `npm install @google/generative-ai`.
2. Crie uma Rota de API em `src/app/api/ai/refine-property/route.ts` (ou use uma Server Action).
3. Essa rota deve receber dados básicos do imóvel (ex: título provisório, descrição simples, características como quartos, banheiros, diferenciais).
4. Use o modelo `gemini-1.5-flash` para gerar:
   - Um título atraente e profissional.
   - Uma descrição detalhada, persuasiva e bem formatada.
5. O prompt enviado ao Gemini deve instruí-lo a agir como um redator imobiliário experiente no Brasil, focado em destacar os pontos fortes do imóvel.
6. Localize o componente do formulário de criação de imóvel (provavelmente em `src/app/...` ou similar) e adicione um botão "Refinar com IA" próximo aos campos de descrição.
7. Ao clicar no botão, envie os dados preenchidos para a API e atualize os campos de título e descrição com o retorno da IA.
```

---
*Este guia foi atualizado para incluir a integração com a API do Gemini.*
