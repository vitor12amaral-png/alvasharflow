# Auditoria do documento de prompts — o que falta

Comparei cada parte do documento com o app atual. A maior parte já está no ar; três blocos ainda não existem e dois estão parciais.

## Já implementado (verificado no código)

- Parte 0 — rebranding (hoje AlvasharFlow), Parte 1.1 a 1.11 (troca de mês, briefing editável, feed por permissão, esqueci minha senha + tela de redefinição, exclusão de tarefas, reset do formulário de cliente, chips de prazo do pacote).
- Parte 2 — abas Tarefas e Marketing (roteiros, calendário de conteúdo, campanhas).
- Parte 3 — Copiloto de IA com tools (criar cliente, vídeo, tarefa, roteiro, consultas).
- Parte 4 — cronômetro centralizado no console flutuante do Workflow, com sessões e histórico.
- Parte 6 — aba "Links" no perfil do cliente (link ou upload, categorias, favoritos, busca).
- Parte 7 — aba "Relacionamento", portal público por link com aprovação/comentários/upload, histórico de interações e NPS.
- Parte 8 — subclientes (marcas) com aba própria, vínculo de vídeos e visão consolidada.
- Parte 12 — valor por vídeo, cálculo automático na "Nova leva" e visão semanal na Fila.

## Falta implementar

### 1. Parte 10 — módulo Leads / CRM (não existe)
Kanban de leads com colunas Novo contato, Em conversa, Proposta enviada, Aguardando follow-up, Fechando, Fechado, Perdido. Campos: nome, empresa, contato, origem, valor estimado, último contato, próximo follow-up, observações. Alertas visuais de follow-up vencido, resumo no Dashboard e botão "Converter em cliente" que pré-preenche o cadastro e mantém o histórico.

### 2. Parte 5 — notificações por WhatsApp (não existe)
Disparos para prazo vencendo, vídeo aprovado/entregue, pacote perto do limite e tarefa urgente atribuída. Precisa de tela de configuração de números por pessoa e liga/desliga por tipo de aviso. Depende de uma conta em provedor (Meta Cloud API, Twilio ou Z-API) — sem credencial, entrego a estrutura e os avisos ficam inativos até você conectar.

### 3. Parte 11 — conversas de WhatsApp dentro do app (não existe)
Caixa de entrada com histórico e envio pelo app, vínculo automático por telefone com cliente ou lead. É a parte mais pesada e só faz sentido depois da Parte 5 estar conectada.

## Parcialmente feito

### 4. Parte 1.12 — subclientes dentro da aba Briefing
Hoje só dá para cadastrar marca pela aba "Marcas". Falta a seção "Subclientes" com botão "+ Novo subcliente" dentro do próprio Briefing.

### 5. Parte 9 — status do cliente
Ativo/inativo/pausado, badge e filtro já existem. Falta o motivo da pausa + data prevista de retorno, e a pergunta de arquivar pacotes ao marcar como inativo.

## Detalhes técnicos

- Leads: tabelas `leads` e `lead_activities` com `workspace_id`, RLS por membro do workspace e GRANTs; UI reaproveitando o padrão de Kanban do Workflow.
- Status do cliente: colunas `pause_reason` e `pause_until` em `clients`; ao inativar, atualizar `client_packages.status` para arquivado.
- WhatsApp: segredo do provedor via ferramenta de secrets, envio por server function e webhook em `src/routes/api/public/`.

## Ordem sugerida

1. Itens parciais (4 e 5) — rápidos.
2. Parte 10 (Leads/CRM).
3. Parte 5 e depois 11 (WhatsApp), quando a conta do provedor estiver pronta.
