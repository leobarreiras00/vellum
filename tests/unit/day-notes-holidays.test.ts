/**
 * Vellum — Testes: Nota do Dia estruturada e feriados de Portugal
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { describe, expect, it } from "vitest";

import { monthMatrix, startOfWeek, weekdayHeaders } from "@/lib/calendar";
import { checklistProgress, dayNoteSummary, parseDayNote, serializeDayNote } from "@/lib/day-note-format";
import { easterSunday, portugueseHolidays } from "@/lib/pt-holidays";

describe("Nota do Dia estruturada", () => {
  const text =
    "- [ ] Rever capítulo 3\n- [x] Enviar provas\n* Ritmo melhor de manhã\nEscrevi 1200 palavras.\nSegunda linha.";

  it("separa checklist, pontos-chave e registo", () => {
    const note = parseDayNote(text);
    expect(note.checklist).toEqual([
      { text: "Rever capítulo 3", done: false },
      { text: "Enviar provas", done: true },
    ]);
    expect(note.keyPoints).toEqual(["Ritmo melhor de manhã"]);
    expect(note.log).toBe("Escrevi 1200 palavras.\nSegunda linha.");
  });

  it("volta ao mesmo texto depois de ler e escrever", () => {
    const again = parseDayNote(serializeDayNote(parseDayNote(text)));
    expect(again).toEqual(parseDayNote(text));
  });

  it("trata notas antigas como registo e resume", () => {
    expect(parseDayNote("Só texto livre").log).toBe("Só texto livre");
    expect(dayNoteSummary(text)).toBe("Escrevi 1200 palavras. Segunda linha.");
    expect(dayNoteSummary("* A\n* B")).toBe("A · B");
    expect(checklistProgress(text)).toEqual({ done: 1, total: 2 });
  });
});

describe("Feriados de Portugal", () => {
  it("calcula a Páscoa", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  it("inclui os móveis e os fixos de 2026", () => {
    const days = new Map(portugueseHolidays(2026).map((h) => [h.date, h]));
    expect(days.get("2026-04-03")?.name).toBe("Sexta-feira Santa");
    expect(days.get("2026-06-04")?.name).toBe("Corpo de Deus");
    expect(days.get("2026-02-17")?.optional).toBe(true);
    expect(days.get("2026-12-01")?.name).toBe("Restauração da Independência");
    expect(portugueseHolidays(2027).filter((h) => !h.optional)).toHaveLength(13);
  });
});

describe("Início da semana", () => {
  it("começa à segunda ou ao domingo", () => {
    expect(startOfWeek("2026-11-08", 1)).toBe("2026-11-02");
    expect(startOfWeek("2026-11-08", 0)).toBe("2026-11-08");
    expect(weekdayHeaders(0)[0]).toBe("dom");
    expect(monthMatrix(2026, 11, 0)[0]![0]).toBe("2026-11-01");
  });
});
