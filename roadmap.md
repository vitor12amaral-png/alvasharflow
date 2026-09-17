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

7. Refinamento de workflow e relacionamento
   - [x] Compactar o resumo de produção semanal no canto da visão Semana.
   - [x] Criar navegação agrupada de vídeos com painel lateral na aba Relacionamento.
   - [x] Adicionar atalho entre o detalhe do vídeo no Workflow e Relacionamento.
   - [x] Tornar explícita a ação de abrir vídeos no quadro do portal.
   - [x] Aplicar lista compacta com detalhe lateral no portal do cliente.

8. Refinamento visual e intuitivo
   - [ ] Aplicar a direção visual azul elétrico e DM Sans no sistema.
   - [ ] Reforçar localização e microinterações no menu lateral e móvel.
   - [ ] Reorganizar e refinar o formulário de nova leva de vídeos.
   - [ ] Padronizar botões, campos, seletores, abas, janelas e cabeçalhos.
   - [ ] Validar as telas representativas em desktop e mobile.
