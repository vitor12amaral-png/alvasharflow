# Menu lateral mais expressivo

## Objetivo
Deixar as categorias do menu lateral maiores, mais vivas e com resposta visual imediata ao clique.

## Alterações
- Aumentar o tamanho e o peso dos títulos “CLIENTES”, “TRABALHO”, “CONTEÚDO” e “GESTÃO”, preservando o espaço disponível.
- Aplicar uma expansão suave no bloco inteiro ao passar o mouse, acompanhada por fundo e seta mais destacados.
- Fazer a categoria aberta ficar azul imediatamente após o clique, mesmo antes de entrar em uma opção interna.
- Manter o azul e o brilho quando a página atual pertencer àquela categoria.
- Preservar o comportamento exclusivo: ao abrir uma categoria, a anterior fecha.
- Respeitar a preferência de movimento reduzido e evitar deslocamentos que cortem o menu.

## Validação
- Conferir categorias fechadas, abertas, sob o mouse e com página ativa.
- Verificar que o efeito não causa sobreposição nem altera a navegação.
- Validar o menu em diferentes alturas de tela.

## Detalhes técnicos
- O estado visual azul será derivado de `open || hasActive`, enquanto o conteúdo continuará controlado pelo estado de abertura existente.
- A mudança ficará restrita ao menu lateral, sem alterar páginas, dados ou regras do sistema.
