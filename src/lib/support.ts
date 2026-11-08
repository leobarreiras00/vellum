/**
 * Vellum — Centro de Suporte: categorias e perguntas frequentes
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */

export const SUPPORT_CATEGORIES = [
  "Acesso e palavra-passe",
  "Confirmação de email",
  "Exportação PDF/Word",
  "Diagramas Mermaid",
  "Editor e documentos",
  "Privacidade e dados (RGPD)",
  "Outro assunto",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Esqueci-me da palavra-passe. Como recupero o acesso?",
    a: "No ecrã de entrada, escolha «Esqueceu-se?», indique o username ou o email e receberá um código de 6 algarismos (válido 15 minutos). Escreva o código e a nova palavra-passe. Por segurança, o código nunca aparece no ecrã para contas reais.",
  },
  {
    q: "Não recebi o código de confirmação do email.",
    a: "Procure na pasta de spam ou promoções (remetente «Vellum Atelier»). Pode pedir um novo código no ecrã «Confirme o seu email» passados 30 segundos. Se usar um endereço empresarial, peça ao administrador que autorize o remetente.",
  },
  {
    q: "Como exporto um documento para PDF ou Word?",
    a: "Num documento, escolha «Exportar» na barra superior: PDF paginado em A4 (fiel ao ecrã), Word (.docx com estilos nomeados), Markdown ou HTML autónomo. Os diagramas Mermaid e as imagens seguem com o texto, sem quebras de página a meio.",
  },
  {
    q: "Como escrevo um diagrama Mermaid?",
    a: "Escreva «/mermaid» no editor ou use o botão «Diagrama Mermaid». O estúdio traz 6 modelos e o guia «Como gerar ou importar» com a sintaxe: nós (A[Texto]), setas (A --> B), sub-grupos (subgraph … end). Se houver um erro, a linha fica destacada e mantém-se a última versão válida.",
  },
  {
    q: "Posso colar imagens nos documentos?",
    a: "Sim: cole com ⌘V / Ctrl+V uma captura de ecrã ou imagem copiada, arraste um ficheiro para a folha, use o botão «Imagem» ou escreva «/imagem». A imagem é otimizada no seu navegador antes de ser gravada.",
  },
  {
    q: "Onde estão os meus dados e como os apago?",
    a: "Os dados do workspace ficam numa base de dados PostgreSQL alojada na União Europeia ou no fornecedor indicado na Política de Privacidade. Pode exportar tudo em Definições › Sincronização e pedir a eliminação da conta através deste formulário (categoria «Privacidade e dados»).",
  },
];
