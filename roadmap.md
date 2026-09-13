# Roadmap — Copiloto por voz e ajustes

1. Banco de dados
   - [x] Migration `copilot_memory` (workspace, author, kind, content, created_at, updated_at) com RLS e GRANTs.

2. Memória do copiloto
   - [x] Server functions `listCopilotMemory`, `rememberForCopilot`, `forgetCopilotMemory`.
   - [x] Aba "Copiloto" nas Configurações listando/editando/apagando memórias.
   - [x] Injetar memórias no prompt do copiloto.

3. Copiloto por voz e mais esperto
   - [x] Refatorar `src/routes/api/copilot.ts` para Responses API (`openai/gpt-6-astra`) com reasoning e `store: false`.
   - [x] Adicionar tool `plan_video_batch` e estender `create_video_batch` com horário, marca/subcliente, status inicial, mês, `batch_label` e `unit_price`.
   - [x] Melhorar prompt: extrair entidades, tratar nomes por similaridade, entender números/datas/horários, pedir só o que falta.
   - [x] Hook `useVoice` (SpeechRecognition pt-BR + speechSynthesis).
   - [x] Atualizar `src/components/copilot.tsx` com microfone, transcrição ao vivo, botão de mudo e cartão de confirmação.

4. Leva de vídeos
   - [x] Seletor de mês/ano no `BatchVideosDialog`; usar mês corrente do workflow como padrão.

5. Demandas concluídas
   - [x] Mostrar concluídas por padrão em Workflow/Clientes; botão "Ocultar concluídas (N)" claro.

6. Menu lateral
   - [x] Retirar "Meu dia"; redirecionar rota `/meu-dia` para `/workflow`.
   - [x] Acordeão exclusivo, seta azul brilhante, títulos maiores/contraste, item ativo destacado.
