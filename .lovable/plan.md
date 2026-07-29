# Clientes-mãe (Filmmakers) com sub-clientes

## Objetivo
Modelar clientes tipo Filmmaker que fecham **um pacote único** (ex: 30 vídeos) mas enviam vídeos de **várias marcas/sub-clientes diferentes**. Precisamos organizar esses sub-clientes de forma clara sem quebrar o fluxo atual (clientes normais continuam funcionando igual).

## Modelo escolhido
- Novo campo `parent_client_id` na tabela `clients` (auto-referência, nullable).
- Cliente-mãe = `parent_client_id IS NULL` e tem filhos.
- Sub-cliente = tem `parent_client_id` apontando para o pai.
- **Pacote fica no cliente-mãe** (fonte única de contagem). Sub-clientes não têm pacote próprio — herdam do pai.
- **Vídeos ficam no sub-cliente** (cada vídeo pertence à marca real), mas contam contra o pacote do pai automaticamente.
- Cliente sem filhos = comportamento atual, sem mudanças.

## Mudanças

### 1. Banco
- `clients.parent_client_id uuid references clients(id) on delete set null`
- Ajustar trigger `tg_log_video_activity`: quando o vídeo é criado em um sub-cliente, incrementar `videos_used` do pacote do **pai** (fallback pro próprio se não tiver pai).
- View auxiliar ou função `get_effective_package(client_id)` que retorna o pacote do pai quando aplicável — usada pelos KPIs.
- RLS: sub-cliente herda workspace do pai (validar via trigger no insert).

### 2. Lista de Clientes (`/clientes`)
- Clientes-mãe aparecem com um **chevron** à esquerda. Clicar expande e mostra os sub-clientes indentados abaixo (linha mais compacta, sem KPIs próprios, mostra só nome + status + contagem de vídeos do mês).
- Contador do pai = soma de vídeos de todos os filhos + pacote consolidado (ex: "18/30 usados").
- Botão "+ Sub-cliente" no card do pai (e no menu de ações) que abre um mini-form (nome, empresa, opcional: logo/cor) — sem wizard completo, herda entrega/pacote do pai.
- Filtro novo: "Só clientes-mãe" / "Incluir sub-clientes" (default: mostra pais + filhos aninhados).

### 3. Perfil do cliente-mãe (`/clientes/$id`)
- Nova aba **"Sub-clientes"** (primeira aba quando o cliente é mãe): grid dos filhos com nome, logo, nº de vídeos do mês, status, botão de abrir.
- Aba **Vídeos** consolida vídeos de todos os filhos, com coluna extra "Marca" (nome do sub-cliente) e filtro por sub-cliente.
- Aba **Pacote/Financeiro** mostra consumo total agregado.
- Briefing/Links/Relacionamento continuam por cliente (pai tem os seus, cada filho os seus).

### 4. Perfil de sub-cliente
- Igual ao atual, mas com um breadcrumb no topo: `← Voltar para [Cliente-mãe]`.
- Não mostra aba de pacote (pacote é do pai) — mostra "Pertence ao pacote de X (Y vídeos restantes)".

### 5. Workflow (Kanban)
- Sub-clientes aparecem como stacks próprios, mas com um badge pequeno com a inicial/cor do pai — pra bater o olho e saber que vieram do mesmo cliente-mãe.
- Filtro do ClientPicker ganha agrupamento visual: cliente-mãe no topo, filhos indentados embaixo. Selecionar o pai = mostra vídeos de todos os filhos.

### 6. Onboarding Wizard
- Nova pergunta no passo 1: **"Este cliente enviará vídeos de outras marcas?"** (toggle).
  - Se sim → cria como cliente-mãe. Ao final, mostra tela extra "Adicionar primeiras marcas" (rápido: nome + opcional logo, repete).
  - Se não → fluxo atual.
- Alternativamente, adicionar sub-cliente a qualquer momento pela aba "Sub-clientes".

### 7. Dashboard
- KPI "Clientes ativos" continua contando só clientes-mãe + clientes sem pai (não infla número).
- Nova linha na timeline: "Nova marca adicionada em [cliente-mãe]".

## Fora de escopo desta rodada
- Cobrança separada por sub-cliente (você confirmou que é sempre pacote único do pai).
- Portal do cliente para o cliente-mãe agregar visão dos filhos — pode vir depois.
- Múltiplos níveis de hierarquia (só 1 nível: pai → filhos).

## Detalhes técnicos
- Migração: adicionar coluna + trigger de propagação + trigger de guard (impedir sub-de-sub).
- Frontend: novo componente `<ClientTreeRow>` para a lista, `<SubClientsTab>` no perfil, ajuste no `ClientPicker` do workflow.
- Types regen do Supabase após a migração.
