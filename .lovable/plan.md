## Correções em lote

### 1. "Abrir" no card do cliente não faz nada
Causa: no roteamento flat do TanStack, `clientes.tsx` + `clientes.$clientId.tsx` faz do primeiro um layout pai. `clientes.tsx` não renderiza `<Outlet />`, então a rota filha até casa mas fica em branco.

Correção: renomear `src/routes/_authenticated/clientes.$clientId.tsx` → `src/routes/_authenticated/clientes_.$clientId.tsx`. O sufixo `_` opta por não aninhar. A URL `/clientes/:id` permanece igual.

### 2. Onboarding não gera os vídeos do pacote
Ao finalizar o wizard, além de criar o cliente e o pacote, gerar automaticamente `total_videos` linhas em `videos` com status `recebido`, título `Vídeo 01`, `Vídeo 02`, …, associadas ao cliente e ao pacote. O trigger existente `tg_log_video_activity` já registra atividade e incrementa `videos_used` — precisamos zerar isso para não contar em dobro.

Ajuste no trigger: **não incrementar `videos_used` no INSERT** — a contagem passa a refletir "vídeos usados" só quando o cliente/editor efetivamente movimenta o vídeo. Alternativa simpler e mais correta: manter o incremento, mas o `videos_used` do pacote passa a significar "vídeos alocados" (o que já é o comportamento real do painel). Escolha: **manter incremento** — assim ao finalizar o wizard o card já mostra `10/10 alocados`, condizente com "pacote de 10 vídeos".

Além disso, hoje a barra de progresso mostra `videos_used / total_videos` como "vídeos usados". Vou renomear o label para "alocados" e adicionar contador "entregues" separado no card do cliente.

### 3. Card do cliente com métricas mais úteis
Adicionar no card da lista `/clientes`:
- Alocados / Total (barra atual)
- Entregues no mês
- Pendentes (em qualquer estágio ≠ entregue/aprovado)
- Atrasados (due_date < hoje e status ≠ entregue/aprovado)

### 4. Ações rápidas no workspace do cliente
Na página `/clientes/:id`, aba "Vídeos", adicionar botão "Novo vídeo" que abre dialog rápido (título + prioridade + due_date) inserindo na tabela `videos` com o pacote ativo já preenchido.

## Fora do escopo desta rodada
Módulos ainda enxutos (Equipe, Calendário, Biblioteca com upload nativo, Financeiro completo, Workflow com automações) permanecem como esqueleto. Depois que o fluxo Cliente → Pacote → Vídeos estiver sólido, avançamos módulo a módulo conforme o PRD.

## Validação após aplicar
1. Recarregar `/clientes` → clicar "Abrir" no card → página do cliente carrega com abas.
2. Criar novo cliente com pacote de 10 → o cliente aparece com `10/10 alocados` e 10 vídeos na aba Vídeos, status `recebido`.
3. Card do cliente na lista mostra "1 em produção" / "0 entregues" / "0 atrasados" corretos.
4. Botão "Novo vídeo" no workspace insere e reflete na lista.
