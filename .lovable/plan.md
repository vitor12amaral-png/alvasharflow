# Cliente com "todos os clientes sumiram" — causa e correção

Os dados não foram perdidos. O que aconteceu foi o fim do teste grátis de 30 dias.

## O que eu verifiquei no banco

- Três contas estão com o teste vencido: `douglasfernandescarvalho13` (venceu 27/08), `bs6788323` (23/08) e `julyanacruzedit` (26/08).
- Os dados continuam lá: a conta do Douglas tem 6 clientes e 37 vídeos gravados normalmente.
- As regras de acesso do banco exigem que a conta esteja ativa (plano pago ou teste dentro do prazo) para *ler* clientes, vídeos e o resto. Quando o teste vence, tudo fica invisível — sem nenhum aviso na tela, apenas listas vazias.

Ou seja: a pessoa vê o app funcionando e "zerado", como se tivesse perdido tudo.

## O que fazer

### 1. Destravar quem está bloqueado agora
Reativar as contas afetadas (definir como ativa ou estender o teste), para os dados voltarem a aparecer imediatamente. Preciso saber quais dessas três você quer liberar e por quanto tempo.

### 2. Nunca mais "sumir" em silêncio
Criar uma tela de bloqueio clara: quando a conta estiver com o teste vencido, o app deixa de mostrar listas vazias e passa a mostrar um aviso — "Seu teste grátis terminou em <data>. Seus dados estão salvos; fale com o suporte para reativar" — com botão de contato (WhatsApp/e-mail).

### 3. Avisar antes de vencer
Faixa de aviso no topo a partir de 7 dias antes do fim do teste, com a contagem de dias restantes.

### 4. Painel de contas para você
Uma área visível só para você (dono), listando cada conta, o plano, a data de fim do teste e um botão para ativar/estender. Assim você resolve casos futuros sem depender de mim.

## Detalhes técnicos

- Bloqueio de leitura vem de `is_workspace_active(workspace_id)` nas políticas de SELECT de `clients`, `videos` e demais tabelas; nada muda nessas políticas — a correção é de produto (aviso claro) e de operação (reativar).
- Reativação: `UPDATE workspaces SET plan='active'` ou novo `trial_ends_at`, feito por migração pontual.
- Tela de bloqueio: verificação no layout autenticado usando o workspace já carregado em `use-current-user`, renderizando uma tela de trial expirado no lugar do conteúdo.
- Painel de contas: acesso restrito por papel `admin` em `user_roles`, leitura e escrita via server function com verificação do papel antes de qualquer alteração.

## Ordem sugerida

1. Reativar as contas afetadas (rápido).
2. Tela de bloqueio + faixa de aviso.
3. Painel de contas.
