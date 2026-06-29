# Spec: [Nome do Módulo]

> Template baseado na metodologia Specs + Loop (snps.ai/guias/specs-e-loop-claude-code).
> Preencha antes de pedir implementação. Apague as instruções em itálico.

---

## Objetivo

*Uma frase. O que esse módulo faz e para quem.*

Exemplo: "Permitir que corretores registrem visitas agendadas e marquem o resultado (realizada / cancelada / remarcada)."

## Critérios de aceite

*Liste os comportamentos observáveis que provam que o módulo funciona. Seja específico o suficiente para virar um checklist de teste manual.*

- [ ] ...
- [ ] ...
- [ ] ...

## Escopo

**Inclui:**
- ...

**Não inclui (fora de escopo):**
- ...

## Restrições técnicas

*Restrições que o Claude precisa respeitar ao implementar. Copie as relevantes do CLAUDE.md e adicione específicas deste módulo.*

- Multi-tenant: filtrar por `company_id` em todas as queries
- Design system: usar variáveis `--domus-*` e classes `domus-*`
- Auth: padrão `getUser()` + fallback `getSession()` nas rotas de API
- TypeScript: zero erros em `npx tsc --noEmit`

## Dados / schema

*Descreva as tabelas Supabase envolvidas, campos relevantes, e relações.*

```
tabela: nome_da_tabela
  id           uuid PK
  company_id   uuid FK → companies
  created_at   timestamptz
  ...
```

## Interface (wireframe textual)

*Descreva as telas/fluxos em texto ou ASCII. Não precisa ser bonito.*

```
[Tela principal]
  Header: "Título do Módulo"
  Botão: "+ Novo"
  Lista: card por item com campos X, Y, Z
    Ações: Editar | Excluir

[Modal / Formulário]
  Campo 1: ...
  Campo 2: ...
  Botão: Salvar
```

## API endpoints

*Quais rotas serão criadas.*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/nome` | Lista itens da empresa |
| POST | `/api/nome` | Cria novo item |
| PATCH | `/api/nome/[id]` | Atualiza item |
| DELETE | `/api/nome/[id]` | Remove item |

## Checklist de implementação

*Deixe este checklist no final. O Claude vai marcando conforme avança.*

- [ ] Schema Supabase criado/verificado
- [ ] Route handler GET implementado
- [ ] Route handler POST implementado
- [ ] Página `src/app/dashboard/nome/page.tsx` criada
- [ ] Entrada no Sidebar adicionada
- [ ] TypeScript: `npx tsc --noEmit` com zero erros
- [ ] Critérios de aceite verificados manualmente
