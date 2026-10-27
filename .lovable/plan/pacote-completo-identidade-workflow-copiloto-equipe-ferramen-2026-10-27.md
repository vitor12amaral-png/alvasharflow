# Pacote completo: identidade, Workflow, Copiloto, Equipe, Ferramentas e preços

## 1. Preços (página de vendas)
- Mensal R$ 69,90/mês; Trimestral R$ 54,90/mês (R$ 164,70); Anual R$ 39,90/mês (R$ 478,80).
- Seletor Mensal / Trimestral / Anual; Anual com selo "Mais vantajoso".

## 2. Identidade "AlvasharFlow Cinematic" no site inteiro
- Fundo grafite obsidiana (#080C14) com reflexos azul/ciano bem sutis e grade fina.
- Vidro escuro translúcido com borda de 1px luminosa; foco claro no hover/seleção.
- Títulos e números em branco forte, textos secundários em cinza-ardósia.
- Aplicado ao menu lateral, cabeçalhos, cartões, tabelas, janelas e painéis.
- Página de vendas com mais personalidade: mistura do vídeo, Arctic Depths e Apple Glass, com ordem própria das seções.

## 3. Workflow limpo
- Uma única linha de controles: botão "Filtros" (abre menu com Urgentes, Bloqueados, Com alterações, Sem editor e contadores), seletor Kanban · Fila · Semana, opções secundárias recolhidas, selo de alertas que só aparece com sobrecarga, Nova leva + Novo vídeo no canto.
- Vídeos agrupados por cliente/leva em grupos recolhíveis ("Roney · Outubro · 5 vídeos") que abrem ao clicar; estado lembrado.

## 4. Copiloto em bolinha
- Bolinha de vidro flutuante; clique ou atalho → fala → executa na hora e responde por voz.
- Pede confirmação só para apagar algo. Pode arrastar, recolher na borda ou ocultar (reativa em Configurações).

## 5. Equipe como central dos editores
- Card por editor: carga da semana, demandas ativas, avançar etapa em 1 clique.
- "Adicionar leva para este editor" abre a Nova leva já com o editor escolhido.
- Seleção de vários vídeos para trocar de editor.

## 6. Aba Ferramentas
- Gerador de contratos (mensal recorrente e avulso), puxando dados do cliente; copiar ou baixar PDF.
- Calculadora de preço e margem.
- Gerador de ganchos com IA (5 opções).
- Checklist de qualidade pré-entrega.

## 7. Complementos das outras abas
- Workflow: filtro por editor. Calendário: arrastar para mudar prazo.
- Financeiro: previsão de repasse aos editores e lucro líquido.
- Tarefas: converter tarefa em vídeo. Leads: converter lead em cliente.
- Clientes: link da pasta do cliente e renovar pacote com 1 clique.

## Detalhes técnicos
- Tokens novos em src/styles.css; componentes UI ajustados por variantes, sem cores fixas.
- Ferramentas: nova rota em _authenticated; ganchos via servidor com Lovable AI; PDF no navegador.
- Repasse usa a capacidade/valor-hora do membro (nova coluna opcional `hourly_rate`).
- Pasta do cliente: coluna opcional `folder_url` em clients.
- Preferência da bolinha salva localmente.
- Validação: build, testes existentes e Playwright autenticado em Workflow, Equipe e Ferramentas.
