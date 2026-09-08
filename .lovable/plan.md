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

## Detalhes técnicos

- Entrada de voz: Web Speech API (`SpeechRecognition`, `lang="pt-BR"`, resultados intermediários) num novo hook `src/hooks/use-voice.ts`, ativado só no cliente. Navegadores sem suporte escondem o microfone e mantêm o texto.
- Saída de voz: `speechSynthesis` com voz pt-BR, lendo apenas as partes de texto da última resposta; controle de mudo persistido em `localStorage`.
- UI em `src/components/copilot.tsx`: botão de microfone com estado ouvindo/processando, transcrição ao vivo no campo, botão de som e um cartão de confirmação renderizado quando a última resposta trouxer a proposta pendente.
- Em `src/routes/api/copilot.ts`:
  - nova tool `plan_video_batch` (só monta e devolve o resumo interpretado, sem gravar) e `create_video_batch` estendida com `due_time`, `brand_name`, `status` inicial, `batch_label` e `unit_price` (herdado de `clients.price_per_video`);
  - resolução de marca: busca em `clients` por `parent_client_id` do cliente principal; se não achar, devolve `needs_clarification` com a opção de criar;
  - regra no prompt do sistema: para criações em lote, sempre chamar `plan_video_batch` primeiro e só executar após confirmação explícita do usuário.
- Sem mudanças no banco: `videos.due_time`, `videos.batch_id`, `videos.batch_label`, `videos.unit_price` e `clients.parent_client_id` já existem.

## Copiloto mais esperto

Hoje ele erra porque interpreta a frase inteira de uma vez. Passa a funcionar assim:

- Um passo de interpretação antes de agir: ele extrai cliente, marca, quantidade, data, horário, prioridade e etapa em campos separados e mostra no resumo. O que ficou em dúvida aparece marcado como "confirmar".
- Lista de clientes e marcas é enviada junto com a conversa, então ele reconhece "Roney", "Floor", apelidos e nomes escritos errado (busca por semelhança, não só igual).
- Ele entende números por extenso ("cinco vídeos"), horas faladas ("até as três da tarde", "meio-dia") e datas relativas ("amanhã", "sexta").
- Se algo faltar, ele pergunta só o que falta em vez de recomeçar.
- Modelo com raciocínio ativado para as interpretações, mantendo a resposta curta.

## Memória do copiloto

- Ele guarda o que você ensina na conversa: apelidos de clientes ("Floor é do Roney"), seus padrões ("meus vídeos normalmente são reels de 30s", "prazo padrão 18h"), e preferências de fluxo.
- Você pode dizer "lembra disso" e ele salva; "esquece isso" e ele apaga.
- Nas Configurações aparece uma lista **O que o copiloto aprendeu**, onde você lê, edita e apaga cada item.
- Tecnicamente: nova tabela `copilot_memory` (workspace, autor, tipo, conteúdo, data) com RLS + GRANTs por workspace; tools `remember` / `forget` / `list_memory`; as memórias do workspace entram no prompt de sistema a cada conversa.

## Demandas concluídas sempre visíveis

- Nas listas (Workflow, Fila, Clientes, Meu dia) as concluídas/entregues passam a aparecer por padrão, em estilo esmaecido com risco no título.
- No topo, um botão claro **Ocultar concluídas** (com contagem, ex.: "Ocultar concluídas (12)"), memorizado por usuário.

## Escolher o mês da leva

- No diálogo "Nova leva de vídeos", um seletor de mês/ano ao lado do prazo; ao escolher um mês futuro, o prazo já sugere um dia daquele mês e os vídeos são criados naquele mês do quadro.
- O copiloto entende o mesmo por voz ("cria 10 vídeos do Roney para outubro").

## Ajustes no menu lateral

- Seta da categoria aberta em azul brilhante e maior.
- Abrir um grupo fecha automaticamente os outros.
- Títulos das categorias maiores e com mais contraste, deixando claro em qual categoria você está.
- Destaque reforçado do item ativo.

