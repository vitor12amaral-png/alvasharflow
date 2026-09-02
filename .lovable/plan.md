# Concluir a rodada de melhorias do documento

Auditoria feita agora contra o código: dos 7 blocos do documento, apenas parte do item 2 e parte do item 4 estão prontos. O restante está no banco (colunas criadas) mas sem interface, ou não foi feito.

## Situação atual verificada

| Item | Estado |
|---|---|
| 1. Valor por leva | Colunas `unit_price`, `batch_id`, `batch_label` existem, mas a "Nova leva" não grava nenhuma delas e não há resumo financeiro por leva |
| 2. Seleção múltipla → subcliente | Ação "Marca" já existe na barra de seleção; falta o badge clicável no card do vídeo |
| 3. Fila / etapa "Na fila para edição" | Não existe coluna própria: o status `fila` está dentro de "Em produção"; a Fila ainda lista itens enviados/entregues |
| 4. Reduzir poluição visual | Feito só no Workflow (atalhos em ícone + menu "…"); Tarefas, Marketing, Clientes e Leads continuam poluídas |
| 5. Mês sempre ativo + mês futuro | O filtro de mês é um toggle desligado por padrão; não há suporte a criar demandas já no mês seguinte |
| 6. Menu lateral por categorias | Menu ainda é lista plana; falta também o acesso a "Contas" |
| 7. Aba Ferramentas | Não existe rota; a tabela de propostas e os campos de Drive já existem no banco, sem tela |

## O que será implementado

### 1. Contabilização de valor por leva
- Ao criar leva (e vídeo individual), gravar em cada vídeo o preço por vídeo vigente e um identificador/rótulo de leva, congelando o histórico.
- Mostrar no cabeçalho da leva o total gerado (ex.: "5 vídeos · R$ 250").
- Quando o cliente não tiver valor por vídeo, exibir aviso "Valor por vídeo não definido — configure no perfil do cliente" no lugar de R$ 0.
- Resumo por cliente no Workflow e no Financeiro: valor gerado no período e por leva.
- Consumo do pacote continua automático (já há gatilho); exibir o contador atualizado logo após criar a leva.

### 2. Badge de marca no card
- Badge discreto no topo do card com o nome da marca/subcliente.
- Clique no badge abre o seletor de marca (trocar, remover ou criar) sem abrir o vídeo.

### 3. Nova etapa e nova lógica da Fila
- Coluna própria "Na fila para edição" entre "Sem material" e "Em produção" (usa o status `fila`, hoje escondido dentro de produção).
- "Enviado" deixa de mostrar alerta de prazo/urgência.
- Fila passa a listar apenas "Na fila para edição" e "Em produção", ordenada por prioridade e depois prazo mais próximo; enviados, aprovados e entregues saem da Fila.
- Resumo da nova lógica será apresentado no chat ao final.

### 4. Padrão "esconder por padrão" nas demais telas
- Aplicar o ícone de atalhos e o menu "…" já criados em Tarefas, Marketing, Clientes e Leads.
- Manter visíveis apenas busca, alternância principal de visão e a ação primária.

### 5. Mês sempre ativo e demandas futuras
- Remover o toggle: o Workflow passa a filtrar sempre pelo mês selecionado, com o seletor de mês sempre visível.
- Corrigir a filtragem para que Kanban, Fila e Lista reajam a cada troca de mês.
- "Novo vídeo" e "Nova leva" passam a sugerir prazo dentro do mês exibido, permitindo montar setembro ainda em agosto.
- A causa raiz encontrada será descrita ao final.

### 6. Menu lateral em categorias
- Grupos: Clientes (Clientes, Leads, WhatsApp), Trabalho (Workflow, Tarefas), Conteúdo (Marketing, Calendário, Biblioteca), Gestão (Financeiro, Equipe, Contas para administradores).
- Dashboard e Configurações ficam soltos.
- Estado expandido/colapsado salvo entre sessões e categoria da página atual aberta automaticamente.

### 7. Aba Ferramentas
- Propostas pré-prontas: biblioteca por categoria, criar/editar/excluir, botão copiar e variáveis `{{nome_cliente}}`, `{{quantidade_videos}}`, `{{valor}}` preenchíveis antes de copiar.
- Organizador de pastas do Drive: configuração da pasta raiz e do modelo de pastas nas Configurações, criação da estrutura padrão para um cliente e gravação do link no perfil do cliente, com mensagens claras quando a conta Google não estiver conectada.

## Detalhes técnicos

- Arquivos principais: `workflow.tsx`, `batch-videos-dialog.tsx`, `week-board.tsx`, `video-workflow.ts`, `app-shell.tsx`, `tarefas.tsx`, `marketing.tsx`, `clientes.tsx`, `leads.tsx`, `configuracoes.tsx`, `financeiro.tsx` e nova rota `ferramentas.tsx`.
- Sem novas tabelas: `proposal_templates`, `videos.unit_price/batch_id/batch_label`, `clients.drive_folder_url` e as configurações de Drive já existem.
- A integração com o Drive usa o conector Google do workspace por função de servidor; sem conexão ativa, a tela orienta a conectar em vez de falhar.
- Ao final: build limpo, verificação item a item dos 7 blocos e teste do fluxo de troca de mês, leva com valor e Fila.

## O que pode exigir ação sua

- Conectar a conta Google (OAuth) para o organizador de pastas funcionar de verdade.
