export type TourMode = "next" | "route" | "click" | "dialog-close";
export type TourStep = {
  title: string;
  body: string;
  /** Seletor do elemento destacado; sem ele o passo aparece no centro. */
  target?: string;
  mode: TourMode;
  /** Tela onde o passo acontece (para o atalho "Me leve até lá"). */
  path?: string;
  /** Pula o passo quando já estiver nesta tela. */
  skipIfAt?: string;
  /** Afasta a caixa do alvo (ex.: abrir espaço para o menu que surge). */
  offset?: number;
};
export type Tour = { id: string; title: string; description: string; path?: string; steps: TourStep[] };

const T = '[data-tour="page-title"]';
const A = '[data-tour="page-actions"]';

export const ONBOARDING_ID = "primeiros-passos";

export const TOURS: Tour[] = [
  {
    id: ONBOARDING_ID, title: "Primeiros passos", description: "Crie seu primeiro cliente, lance uma leva e conheça o Workflow.",
    steps: [
      { mode: "next", title: "Bem-vindo ao AlvasharFlow", body: "Em 1 minuto você aprende o essencial fazendo de verdade: criar seu primeiro cliente, lançar uma leva e acompanhar no Workflow." },
      { mode: "next", target: '[data-tour="nav"]', title: "Suas abas", body: "Tudo fica aqui no topo. Passe o mouse sobre um grupo e as opções aparecem na hora, sem clicar." },
      { mode: "route", target: '[data-tour="nav-clientes"]', path: "/clientes", skipIfAt: "/clientes", offset: 230, title: "Abra seus clientes", body: "Passe o mouse em Clientes e escolha Clientes." },
      { mode: "click", target: '[data-tour="new-client"]', path: "/clientes", title: "Crie seu primeiro cliente", body: "Clique em Novo cliente." },
      { mode: "dialog-close", target: '[role="dialog"]:not([data-tour-card])', path: "/clientes", title: "Preencha e salve", body: "Digite o nome e o pacote, depois clique em Salvar. Pode ser um cliente de teste." },
      { mode: "route", target: '[data-tour="nav-trabalho"]', path: "/workflow", skipIfAt: "/workflow", offset: 230, title: "Vá para o Workflow", body: "Passe o mouse em Trabalho e escolha Workflow. É aqui que os vídeos andam." },
      { mode: "next", target: '[data-tour="new-batch"]', path: "/workflow", title: "Nova leva", body: "Aqui você lança os vídeos do mês de um cliente de uma vez. O mês da leva é independente do prazo." },
      { mode: "next", target: '[data-tour="board"]', path: "/workflow", title: "Seu quadro", body: "Arraste os cartões entre as etapas. Passe o mouse num cartão para avançar etapa ou escolher o editor na hora." },
      { mode: "next", target: '[data-tour="copilot"]', title: "Seu copiloto", body: "Toque na bolinha e fale. Ele cria levas, move vídeos e responde por voz." },
      { mode: "next", title: "Tudo pronto!", body: "Na aba Tutoriais (em Gestão) você encontra um passo a passo de cada ferramenta, quando quiser." },
    ],
  },
  { id: "clientes", title: "Clientes", path: "/clientes", description: "Cadastrar clientes, marcas e pacotes mensais.", steps: [
    { mode: "next", target: T, path: "/clientes", title: "Sua carteira", body: "Aqui ficam todos os clientes, com subclientes e marcas agrupados." },
    { mode: "click", target: '[data-tour="new-client"]', path: "/clientes", title: "Novo cliente", body: "Clique em Novo cliente para cadastrar." },
    { mode: "dialog-close", target: '[role="dialog"]:not([data-tour-card])', path: "/clientes", title: "Preencha e salve", body: "Nome, pacote de vídeos e valor. Depois clique em Salvar." },
    { mode: "next", path: "/clientes", title: "Detalhes do cliente", body: "Clique num cliente para ver levas por mês, progresso do pacote, portal e briefing." },
  ] },
  { id: "workflow", title: "Workflow", path: "/workflow", description: "Levas do mês, etapas, editores e prazos.", steps: [
    { mode: "next", target: T, path: "/workflow", title: "O mês em andamento", body: "O Workflow abre no mês selecionado. Troque o mês para ver outras levas." },
    { mode: "next", target: '[data-tour="new-batch"]', path: "/workflow", title: "Nova leva", body: "Lance vários vídeos de um cliente para o mês de uma vez." },
    { mode: "next", target: '[data-tour="board"]', path: "/workflow", title: "Etapas", body: "Arraste cartões entre colunas. Passe o mouse num cartão para avançar etapa, trocar editor ou abrir detalhes." },
  ] },
  { id: "tarefas", title: "Tarefas", path: "/tarefas", description: "Pendências da equipe fora dos vídeos.", steps: [
    { mode: "next", target: T, path: "/tarefas", title: "Tarefas", body: "Organize pendências que não são vídeos: reuniões, roteiros, cobranças." },
    { mode: "next", target: A, path: "/tarefas", title: "Criar e filtrar", body: "Use estes botões para criar uma tarefa e escolher o responsável." },
  ] },
  { id: "calendario", title: "Calendário", path: "/calendario", description: "Prazos e entregas no mês.", steps: [
    { mode: "next", target: T, path: "/calendario", title: "Calendário", body: "Veja os prazos de todos os vídeos. Arraste um vídeo para outro dia para mudar o prazo." },
  ] },
  { id: "equipe", title: "Equipe", path: "/equipe", description: "Editores, capacidade e demandas.", steps: [
    { mode: "next", target: T, path: "/equipe", title: "Sua equipe", body: "Veja a carga de cada editor na semana e quem está sobrecarregado." },
    { mode: "next", target: A, path: "/equipe", title: "Convidar e distribuir", body: "Convide membros e lance uma leva já atribuída a um editor." },
  ] },
  { id: "financeiro", title: "Financeiro", path: "/financeiro", description: "Faturamento do mês, pacotes e repasses.", steps: [
    { mode: "next", target: T, path: "/financeiro", title: "Financeiro", body: "O valor do mês segue o mês da leva. Veja quanto cada cliente rende e quanto vai para os editores." },
  ] },
  { id: "marketing", title: "Marketing", path: "/marketing", description: "Ideias e calendário de conteúdo.", steps: [
    { mode: "next", target: T, path: "/marketing", title: "Marketing", body: "Planeje o conteúdo da sua agência e acompanhe as publicações." },
  ] },
  { id: "biblioteca", title: "Biblioteca", path: "/biblioteca", description: "Arquivos, links e referências.", steps: [
    { mode: "next", target: T, path: "/biblioteca", title: "Biblioteca", body: "Guarde links de arquivos brutos, referências e entregas de cada cliente." },
    { mode: "next", target: A, path: "/biblioteca", title: "Adicionar", body: "Use estes botões para adicionar um novo item." },
  ] },
  { id: "leads", title: "Leads", path: "/leads", description: "Funil de novos clientes.", steps: [
    { mode: "next", target: T, path: "/leads", title: "Leads", body: "Acompanhe possíveis clientes do primeiro contato até o fechamento." },
  ] },
  { id: "ferramentas", title: "Ferramentas", path: "/ferramentas", description: "Contrato, calculadora de preço, ganchos e checklist.", steps: [
    { mode: "next", target: T, path: "/ferramentas", title: "Ferramentas", body: "Gere contratos, calcule preço e margem, crie ganchos com IA e revise vídeos com o checklist." },
  ] },
  { id: "copiloto", title: "Copiloto de voz", description: "Fale comandos e ouça respostas.", steps: [
    { mode: "next", target: '[data-tour="copilot"]', title: "Copiloto", body: "Toque na bolinha e fale à vontade, pode pausar para pensar. No fim toque em Confirmar." },
    { mode: "next", target: '[data-tour="copilot"]', title: "O que ele faz", body: "Cria levas, move vídeos e responde por voz. Ações que apagam algo sempre pedem confirmação." },
  ] },
  { id: "aparencia", title: "Aparência", path: "/configuracoes", description: "Trocar as cores do app inteiro.", steps: [
    { mode: "next", target: T, path: "/configuracoes", title: "Configurações", body: "Abra a aba Aparência para escolher um modelo de cores ou sua cor preferida." },
  ] },
];

export function getTour(id: string) {
  return TOURS.find((t) => t.id === id) ?? TOURS[0];
}

/** Novo membro vê o tutorial só se ainda não concluiu nem pulou. */
export function shouldAutoStart(tourCompletedAt: string | null | undefined) {
  return !tourCompletedAt;
}
