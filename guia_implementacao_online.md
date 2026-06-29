# 🚀 Guia de Implementação Online: Domus

Siga este passo a passo detalhado para colocar o seu sistema **Domus** em funcionamento na nuvem.

---

## 1. Configuração do Backend (Supabase)

O Supabase será o seu banco de dados, provedor de autenticação e armazenamento de arquivos.

1.  **Criar Conta e Projeto:**
    *   Acesse [supabase.com](https://supabase.com/) e crie uma conta.
    *   Crie um **New Project**. Escolha um nome (ex: `Domus-Prod`), uma senha para o banco de dados e a região mais próxima (ex: `Sao Paulo`).
2.  **Configurar o Banco de Dados:**
    *   No menu lateral do Supabase, clique em **SQL Editor**.
    *   Clique em **New Query**.
    *   Abra o arquivo local `supabase/schema.sql`, copie todo o conteúdo e cole no editor do Supabase.
    *   Clique em **Run**. Isso criará todas as tabelas (Leads, Companies, etc.) e as políticas de segurança (RLS).
3.  **Obter Chaves de API:**
    *   Vá em **Project Settings** (ícone de engrenagem) -> **API**.
    *   Copie os seguintes valores (você precisará deles no passo 3):
        *   `Project URL`
        *   `anon (public) API Key`
        *   `service_role (secret) API Key` (Clique em reveal para ver).

---

## 2. Integração com Google Calendar (Google Cloud)

Para que o sistema possa agendar visitas no Google Agenda, você precisa registrar o app no Google.

1.  **Criar Projeto:**
    *   Acesse o [Google Cloud Console](https://console.cloud.google.com/).
    *   Crie um novo projeto chamado `Domus-App`.
2.  **Ativar a API:**
    *   Vá em **APIs & Services** -> **Library**.
    *   Procure por **Google Calendar API** e clique em **Enable**.
3.  **Configurar Tela de Consentimento (OAuth Consent Screen):**
    *   Vá em **OAuth consent screen**.
    *   Escolha **External** (ou Internal se for apenas para sua organização).
    *   Preencha o nome do app e email de suporte.
4.  **Criar Credenciais:**
    *   Vá em **Credentials** -> **Create Credentials** -> **OAuth client ID**.
    *   Application type: **Web application**.
    *   **Authorized JavaScript origins:** Adicione `http://localhost:3000` e a URL da sua futura aplicação na Vercel (ex: `https://seu-domus.vercel.app`).
    *   **Authorized redirect URIs:** Adicione `http://localhost:3000/api/auth/callback/google` e a URL da Vercel correspondente.
    *   Clique em **Create** e salve o **Client ID** e o **Client Secret**.

---

## 3. Deploy do Frontend (Vercel)

A Vercel é a plataforma recomendada para hospedar aplicações Next.js.

1.  **Submeter Código:**
    *   Certifique-se de que seu código está em um repositório Git (GitHub, GitLab ou Bitbucket).
2.  **Importar na Vercel:**
    *   Acesse [vercel.com](https://vercel.com/) e clique em **Add New** -> **Project**.
    *   Importe o repositório do seu projeto Domus.
3.  **Configurar Variáveis de Ambiente:**
    *   Na tela de importação, expanda **Environment Variables** e adicione as seguintes:
        *   `NEXT_PUBLIC_SUPABASE_URL`: (Valor do Passo 1)
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Valor do Passo 1)
        *   `SUPABASE_SERVICE_ROLE_KEY`: (Valor do Passo 1)
        *   `GOOGLE_CLIENT_ID`: (Valor do Passo 2)
        *   `GOOGLE_CLIENT_SECRET`: (Valor do Passo 2)
        *   `NEXT_PUBLIC_APP_URL`: A URL do seu site (ex: `https://seu-domus.vercel.app`)
4.  **Deploy:**
    *   Clique em **Deploy**. Aguarde alguns minutos.

---

## 4. Configuração Final do Tenant (Empresa)

Como o Domus é *Multi-tenant*, você precisa definir qual empresa o site está exibindo inicialmente.

1.  **Obter o Company ID:**
    *   No **SQL Editor** do Supabase, execute:
        ```sql
        SELECT id FROM companies WHERE slug = 'renovar';
        ```
    *   Copie o UUID gerado (ex: `df994688-...`).
2.  **Configurar Variável de Ambiente:**
    *   No painel da Vercel, vá em **Settings** -> **Environment Variables**.
    *   Adicione ou atualize a variável:
        *   `NEXT_PUBLIC_COMPANY_ID`: (O UUID que você acabou de copiar)
    *   Faça um novo **Redeploy** na Vercel para aplicar a mudança.

---

## ✅ Pronto!
Seu sistema agora deve estar acessível na URL fornecida pela Vercel. Você pode acessar o Dashboard e começar a capturar leads.

---

### Links Úteis:
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Next.js Documentation](https://nextjs.org/docs)
