/**
 * Vellum — Formato estruturado da Nota do Dia
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * A nota continua a ser texto simples (compatível com notas antigas, exportação
 * e base de dados), com três partes reconhecidas linha a linha:
 *   - [ ] tarefa / - [x] tarefa feita   → checklist do dia
 *   * ponto                             → pontos-chave
 *   tudo o resto                        → registo livre
 */

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface StructuredDayNote {
  checklist: ChecklistItem[];
  keyPoints: string[];
  log: string;
}

const CHECK = /^\s*[-*]\s*\[( |x|X)\]\s+(.*)$/;
const POINT = /^\s*\*\s+(.*)$/;

export function parseDayNote(content: string): StructuredDayNote {
  const checklist: ChecklistItem[] = [];
  const keyPoints: string[] = [];
  const log: string[] = [];
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    const check = CHECK.exec(line);
    if (check) {
      if (check[2]!.trim()) checklist.push({ text: check[2]!.trim(), done: check[1] !== " " });
      continue;
    }
    const point = POINT.exec(line);
    if (point) {
      if (point[1]!.trim()) keyPoints.push(point[1]!.trim());
      continue;
    }
    log.push(line);
  }
  return { checklist, keyPoints, log: log.join("\n").trim() };
}

export function serializeDayNote(note: StructuredDayNote): string {
  const clean = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();
  const parts: string[] = [];
  const checks = note.checklist.filter((c) => clean(c.text)).map((c) => `- [${c.done ? "x" : " "}] ${clean(c.text)}`);
  if (checks.length) parts.push(checks.join("\n"));
  const points = note.keyPoints.filter((p) => clean(p)).map((p) => `* ${clean(p)}`);
  if (points.length) parts.push(points.join("\n"));
  if (note.log.trim()) parts.push(note.log.trim());
  return parts.join("\n\n");
}

/** Resumo curto para a célula do calendário e para os cartões da agenda. */
export function dayNoteSummary(content: string): string {
  const note = parseDayNote(content);
  if (note.log) return note.log.replace(/\s+/g, " ");
  if (note.keyPoints.length) return note.keyPoints.join(" · ");
  return note.checklist.map((c) => c.text).join(" · ");
}

export function checklistProgress(content: string): { done: number; total: number } {
  const { checklist } = parseDayNote(content);
  return { done: checklist.filter((c) => c.done).length, total: checklist.length };
}
