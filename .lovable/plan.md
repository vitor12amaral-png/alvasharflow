# Redesign Translúcido Clean (padrão Apple Dark / referência Oversight)

Identidade ciano do AlvasharFlow mantida. Nenhuma regra de negócio alterada (mês de competência, pacotes, finanças, margens, voz).

## 1. Fundação e atmosfera
- Fundo sólido obsidiana profundo, sem névoa nem gradientes difusos.
- Remover do topo do app: brilhos borrados, feixe diagonal e glow forte atrás do conteúdo.
- Novo vidro "Apple": fundo translúcido sutil, desfoque leve com saturação, borda de 1px quase invisível, brilho fino no topo e sombra profunda.
- Cards, janelas, menus e campos passam a usar esse vidro; botões principais ciano sem halo exagerado.

## 2. Página inicial – Hero com arco
- Arco fino e nítido (1.5–2px) com luz ciano concentrada só no topo.
- Mockup do painel surgindo de trás do arco, com contraste total.
- Títulos brancos e compactos, textos secundários em cinza neutro.
- Barra superior em pílula translúcida.

## 3. Página inicial – Grade de funcionalidades (Bento)
- Card 1: etapas em pílulas com pontinhos coloridos (Roteiro, Edição, Aprovado) e mini-cards.
- Card 2: mini-gráfico de linha fina com número em destaque e selo de crescimento.
- Card 3: lista em árvore monocromática compacta (clientes > marcas > vídeos).
- Card 4: símbolo focal em lente escura com reflexo e pequena animação.

## 4. Telas internas
- Barra superior do app em pílula translúcida, sem glow de fundo; moldura de conteúdo em vidro fino.
- Workflow: colunas em vidro fino, cards de vídeo compactos com etiquetas monocromáticas.
- Clientes, Financeiro, Tarefas, Equipe, Ferramentas, Calendário, Leads: tabelas com divisores finos, campos em pílula, foco de 1px, cartões de métricas no novo vidro.

## 5. Validação
- Screenshots reais de `/`, `/workflow` e demais telas, comparados lado a lado com os frames da referência; ajustes até ficar no nível.
- Testes existentes e build sem erros.

## Detalhes técnicos
- Tokens em `src/styles.css` (`@theme inline`): fundo ~oklch(0.12 0.015 250); utilitários `@utility glass-apple` / `panel-apple` (rgba(18,18,22,.6), `backdrop-filter: blur(20px) saturate(180%)` sem prefixo manual, borda rgba(255,255,255,.08), `inset 0 1px 0 rgba(255,255,255,.14)`, `0 20px 48px -12px rgba(0,0,0,.8)`).
- `panel-landing` passa a apontar para o novo vidro, propagando a `Card`, `Dialog`, `Popover`, `StatCard`.
- `app-shell.tsx`: remover horizonte borrado/feixe; manter navegação superior.
- `src/routes/index.tsx`: reescrever Hero e seção de funcionalidades.
- Gabarito: `/tmp/ref/frame_003.png`, `frame_010.png`, `frame_022.png`.
