# Copiloto por voz

Falar com o copiloto como no ChatGPT: você aperta o microfone, fala naturalmente, ele repete o que entendeu, você confirma e ele executa — criando os vídeos, prazos, horários, fila e a marcação de cliente/marca sozinho.

## Como vai funcionar

1. No painel do copiloto aparece um botão de microfone. Ao tocar, ele começa a ouvir (em português) e mostra o que você está falando em tempo real.
2. Ao parar de falar, o texto é enviado automaticamente.
3. O copiloto responde **falando em voz alta** e também por escrito.
4. Antes de criar qualquer coisa, ele mostra um resumo curto do que entendeu com dois botões: **Confirmar** e **Cancelar** — e você também pode só dizer "confirma" ou "cancela".
5. Um botão liga/desliga a voz da resposta, para quando você estiver num lugar onde não pode ouvir.

Exemplo: "Hoje tenho 5 vídeos do Roney, da marca Floor, pra entregar até as 15h."
Ele responde: "Entendi: 5 vídeos para Roney · marca Floor · hoje (07/09) às 15:00 · prioridade alta · na fila de edição. Confirmo?" Depois de confirmar, cria os 5 vídeos numerados, com data, horário, marca vinculada e já contando na fila e no total do dia.

## O que o copiloto passa a entender

- **Horário de entrega** ("até as 15h") — hoje ele só entende a data; passa a gravar também a hora.
- **Marca / subcliente** ("do Roney, que é da Floor") — ele procura a marca dentro do cliente principal; se não existir, pergunta se deve criar.
- **Etapa inicial** ("põe na fila", "já em edição") — o vídeo entra direto na coluna certa em vez de sempre em "Recebido".
- **Leva** — os 5 vídeos ficam agrupados como uma leva com nome (ex.: "Floor 07/09"), aproveitando o preço por vídeo do cliente para o resumo financeiro.
- **Resumo do dia** — depois de criar, ele diz quantos vídeos você tem para hoje e o tempo estimado.

## Detalhes técnicos

- Entrada de voz: Web Speech API (`SpeechRecognition`, `lang="pt-BR"`, resultados intermediários) num novo hook `src/hooks/use-voice.ts`, ativado só no cliente. Navegadores sem suporte escondem o microfone e mantêm o texto.
- Saída de voz: `speechSynthesis` com voz pt-BR, lendo apenas as partes de texto da última resposta; controle de mudo persistido em `localStorage`.
- UI em `src/components/copilot.tsx`: botão de microfone com estado ouvindo/processando, transcrição ao vivo no campo, botão de som e um cartão de confirmação renderizado quando a última resposta trouxer a proposta pendente.
- Em `src/routes/api/copilot.ts`:
  - nova tool `plan_video_batch` (só monta e devolve o resumo interpretado, sem gravar) e `create_video_batch` estendida com `due_time`, `brand_name`, `status` inicial, `batch_label` e `unit_price` (herdado de `clients.price_per_video`);
  - resolução de marca: busca em `clients` por `parent_client_id` do cliente principal; se não achar, devolve `needs_clarification` com a opção de criar;
  - regra no prompt do sistema: para criações em lote, sempre chamar `plan_video_batch` primeiro e só executar após confirmação explícita do usuário.
- Sem mudanças no banco: `videos.due_time`, `videos.batch_id`, `videos.batch_label`, `videos.unit_price` e `clients.parent_client_id` já existem.
