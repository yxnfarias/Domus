# Documento de Especificação Unificada de Produto (PRD): Domus (MicroSaaS)

---

## 1. Visão Geral do Produto
O **Domus** é uma plataforma MicroSaaS B2B operando sob o modelo *Multi-tenant* e *White-Label*, projetada sob medida para o mercado imobiliário brasileiro. O seu propósito central é resolver o maior gargalo operacional de corretores de imóveis, imobiliárias e incorporadoras: a **qualificação prévia, documental e de crédito automatizada de leads** antes do atendimento humano individualizado.

Por meio de um formulário fluído, inteligente e de altíssimo padrão visual, a plataforma captura dados civis, financeiros e documentais cruciais para simulações habitacionais. No back-end, um ecossistema isolado garante a privacidade dos dados de cada imobiliária, enquanto um motor automatizado consome APIs de crédito e processa documentos via inteligência artificial (OCR), gerando um laudo de viabilidade de crédito instantâneo.

---

## 2. Experiência de Design & UI/UX Premium

O Domus posiciona-se como uma ferramenta de alta conversão devido à sua interface moderna, refinada e focada na experiência do utilizador:

### Estética Glassmorphism
Tanto o formulário público (interface do lead) quanto as camadas flutuantes do painel administrativo (interface do corretor) utilizam os conceitos da tendência Glassmorphism:
* **Efeito Vidro Fosco:** Utilização de fundos translúcidos com aplicação de filtros de opacidade e desfoque de fundo avançado (`backdrop-filter: blur`).
* **Bordas de Luz Cristalares:** Contornos finos, subtis e semi-transparentes que simulam o reflexo de luz nas extremidades dos cartões e campos de entrada (*inputs*).
* **Profundidade Macia:** Camadas visuais bem delimitadas através de sombras projetadas suaves (`box-shadow`) e gradientes lineares orgânicos no plano de fundo.

### Micro-interações e Feedback Visual Ativo
* **Transições de Etapa:** Animações fluidas de deslize (*slide*) ou esmaecimento (*fade*) ao avançar entre as perguntas, reduzindo a fadiga de preenchimento.
* **Foco Inteligente:** Os campos de entrada expandem milimetricamente ou iluminam as suas bordas ao receberem o foco do utilizador.
* **Indicadores Dinâmicos:** Uma barra de progresso preditiva no topo preenche-se de forma orgânica à medida que o utilizador responde.
* **Áreas de Dropzone Responsivas:** Os campos de upload de ficheiros reagem visualmente (mudança de cor da borda e pulsação subtil) quando um documento é arrastado sobre eles.

### Integração Nativa com o Design System do Cliente
A arquitetura de estilos do Domus é totalmente baseada em **Design Tokens** configuráveis. Ao injetar o código de identificação de uma imobiliária, o motor do SaaS adapta dinamicamente as variáveis de:
* Cores primárias, secundárias e de destaque.
* Famílias tipográficas e pesos de fonte.
* Raios de curvatura de borda (`border-radius`) de cartões e botões.
Isso garante uma experiência *White-Label* autêntica, onde a identidade da marca do cliente é preservada sobre a estrutura premium da plataforma.

---

## 3. Engenharia do Formulário de Simulação (Interface do Lead)

O formulário adota um fluxo passo a passo (*Typeform-like*) perfeitamente otimizado para o cenário habitacional brasileiro, coletando e validando os seguintes dados:

1. **Bloco de Identificação Inicial:** Nome completo, E-mail e WhatsApp (com máscara e validação de dígitos automática).
2. **Bloco de Dados Civis e Identificadores:**
   * **CPF:** Validado na raiz estrutural do algoritmo para prevenir fraudes e garantir consultas limpas.
   * **RG:** Registro Geral e Órgão Emissor, fundamentais para a posterior emissão de minutas contratuais.
   * **Data de Nascimento:** Determina a idade do proponente, fator crítico para o cálculo do prazo máximo de financiamento e das taxas de seguro compulsório das tabelas SAC/PRICE.
3. **Bloco de Perfil Financeiro & Composição de Renda:**
   * **Estado Civil:** Caso seja selecionado "Casado" ou "União Estável", o formulário abre dinamicamente uma ramificação para inclusão dos dados e documentos do cônjuge (composição de renda).
   * **Renda Bruta Familiar Mensal:** Valor total comprovável somado dos proponentes.
   * **Regime de Trabalho:** CLT, Autônomo, Profissional Liberal, Empresário ou Servidor Público.
4. **Módulo de Upload Documental Avançado (Anexos):**
   * **Comprovante de Residência:** Upload de arquivo (PDF ou imagem) emitido nos últimos 90 dias (contas de água, luz, gás ou internet).
   * **Comprovação de Renda Condicional:** Se o regime for CLT, o sistema exige o upload dos **últimos 3 holerites**. Se for autônomo/empresário, o sistema adapta-se dinamicamente para exigir os **3 últimos extratos bancários completos**.
5. **Intenção de Compra & Recursos:** Valor pretendido do imóvel, região de interesse, saldo do FGTS disponível e valor total reservado para a entrada.

---

## 4. Arquitetura do Dashboard e Isolamento Multi-tenant

O ambiente administrativo do corretor foi projetado para alta performance operacional sob rígidos critérios de segurança de dados:

* **Isolamento Absoluto (Multi-tenancy):** Utilizando políticas de segurança ao nível da linha (*Row Level Security - RLS*) no banco de dados, cada organização opera sob um identificador único universal (`company_id`). Os dados capitaneados no formulário da Empresa X pertencem estritamente ao seu escopo, sendo completamente invisíveis e inacessíveis para a Empresa Y.
* **Painel de Gestão de Leads:** Uma tabela operacional limpa onde os corretores visualizam a listagem de clientes ordenada por data de entrada, pontuação de perfil (*lead scoring*) e status do atendimento (*Pendente, Em Análise, Crédito Pré-Aprovado, Recusado*).
* **Abertura em Modais Glassmorphic:** Ao clicar em um lead, a aplicação não recarrega a página; em vez disso, invoca um modal flutuante elegante que se projeta sobre a tela. Os dados do cliente são organizados em blocos hierárquicos (Dados Cadastrais, Documentos Anexados e Painel de Crédito).

---

## 5. Motor de Crédito Automatizado & Inteligência Artificial

O grande diferencial tecnológico do Domus reside na inteligência acionável presente dentro do modal do cliente no Dashboard:

* **Botão "Executar Análise de Crédito Inteligente":** Um gatilho manual para o corretor disparar o fluxo de análise automatizada.
* **OCR e IA Documental:** Os documentos anexados (holerites ou extratos) passam por um processamento de reconhecimento óptico de caracteres (OCR). A IA extrai o CNPJ do empregador, os valores líquidos recebidos e a consistência dos depósitos, confrontando instantaneamente os dados reais com a renda declarada pelo lead no formulário.
* **Integração com Bureaus de Crédito:** O sistema realiza chamadas de API em tempo real para os principais birôs do mercado (como Serasa Experian, Quod, Boa Vista ou motores de Open Finance), verificando a existência de restrições financeiras, protestos, dívidas ativas e o *score* habitacional do proponente.
* **Emissão de Laudo Consolidado:** Cruzando as diretrizes do Sistema Financeiro da Habitação (SFH) — que limita o comprometimento de renda a no máximo 30% — o sistema calcula a capacidade máxima de financiamento do lead sob os modelos SAC e PRICE. O motor compila todas as informações e **gera de forma automatizada um Relatório de Análise de Crédito em formato PDF**, disponível para download instantâneo ou envio direto ao banco.

---

## 6. Ecossistema de Micro-integrações Estratégicas

Para otimizar o tempo de resposta e acelerar as vendas, o Domus unifica micro-integrações nativas extremamente leves:

* **WhatsApp Quick-Action:** Um botão de ação rápida dentro do modal. Ao clicar, o sistema gera um link parametrizado (utilizando a API pública `https://wa.me/`) pré-formatado com o nome do cliente, o resumo dos dados da simulação e o veredito do laudo de crédito, abrindo o aplicativo instantaneamente para o corretor iniciar a negociação.
* **Custom Outbound Webhooks:** Permite o envio automático do *payload* completo de dados e a URL segura do laudo em PDF para qualquer CRM do mercado (como Kenlo, CV CRM, RD Station ou HubSpot) no momento em que a análise for concluída.
* **Notificação em Tempo Real:** Alertas instantâneos via WhatsApp ou Telegram para o smartphone do corretor responsável sempre que um novo formulário for submetido.
