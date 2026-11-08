/**
 * Vellum — Localizar e substituir dentro do documento (⌘F / ⌘H)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Plugin ProseMirror com decorações: todas as ocorrências ficam realçadas
 * (`.find-match`) e a atual com `.find-match-current`. A pesquisa percorre o
 * texto de cada bloco (ignora maiúsculas/minúsculas e acentos por omissão).
 * «Substituir tudo» é uma única transação: um só «desfazer».
 */
import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface FindMatch {
  from: number;
  to: number;
}

export interface FindState {
  term: string;
  caseSensitive: boolean;
  matches: FindMatch[];
  index: number;
}

export const findKey = new PluginKey<FindState>("vellum-find");

const EMPTY: FindState = { term: "", caseSensitive: false, matches: [], index: 0 };

/** Remove acentos mantendo o comprimento (1 carácter → 1 carácter). */
function fold(text: string, caseSensitive: boolean): string {
  let out = "";
  for (const ch of text) {
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const one = base.length === 1 ? base : ch;
    out += caseSensitive ? one : one.toLowerCase();
  }
  return out;
}

/** Ocorrências de `term` em `doc` (posições ProseMirror). Exportada para os testes. */
export function findMatches(doc: PMNode, term: string, caseSensitive = false): FindMatch[] {
  if (!term) return [];
  const needle = fold(term, caseSensitive);
  const matches: FindMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Texto do bloco com o mapa índice → posição (os nós não-texto contam como um espaço).
    let text = "";
    const map: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText) {
        const t = child.text ?? "";
        for (let i = 0; i < t.length; i++) map.push(start + i);
        text += t;
      } else {
        map.push(start);
        text += " ";
      }
    });
    const hay = fold(text, caseSensitive);
    let at = hay.indexOf(needle);
    while (at !== -1 && needle.length > 0) {
      const from = map[at]!;
      const to = map[at + needle.length - 1]! + 1;
      matches.push({ from, to });
      at = hay.indexOf(needle, at + needle.length);
    }
    return false;
  });
  return matches;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vellumFind: {
      setFindTerm: (term: string, caseSensitive?: boolean) => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
      clearFind: () => ReturnType;
    };
  }
}

type Meta = { term?: string; caseSensitive?: boolean; index?: number };

export function getFindState(state: EditorState): FindState {
  return findKey.getState(state) ?? EMPTY;
}

function selectMatch(tr: import("@tiptap/pm/state").Transaction, match: FindMatch | undefined) {
  if (!match) return tr;
  return tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
}

export const FindReplace = Extension.create({
  name: "vellumFind",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => EMPTY,
          apply(tr, prev) {
            const meta = tr.getMeta(findKey) as Meta | undefined;
            if (!meta && !tr.docChanged) return prev;
            const term = meta?.term ?? prev.term;
            const caseSensitive = meta?.caseSensitive ?? prev.caseSensitive;
            const matches = findMatches(tr.doc, term, caseSensitive);
            const wanted = meta?.index ?? prev.index;
            const index = matches.length ? ((wanted % matches.length) + matches.length) % matches.length : 0;
            return { term, caseSensitive, matches, index };
          },
        },
        props: {
          decorations(state) {
            const { matches, index } = getFindState(state);
            if (!matches.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              matches.map((m, i) =>
                Decoration.inline(m.from, m.to, {
                  class: i === index ? "find-match find-match-current" : "find-match",
                  "data-find-match": i === index ? "current" : "match",
                }),
              ),
            );
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setFindTerm:
        (term, caseSensitive) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;
          // Começa na primeira ocorrência depois do cursor.
          const matches = findMatches(state.doc, term, caseSensitive ?? getFindState(state).caseSensitive);
          const after = matches.findIndex((m) => m.from >= state.selection.from);
          const index = after === -1 ? 0 : after;
          tr.setMeta(findKey, { term, caseSensitive, index } satisfies Meta);
          dispatch(tr);
          return true;
        },
      findNext:
        () =>
        ({ tr, state, dispatch }) => {
          const s = getFindState(state);
          if (!s.matches.length) return false;
          const index = (s.index + 1) % s.matches.length;
          if (dispatch) dispatch(selectMatch(tr.setMeta(findKey, { index }), s.matches[index]));
          return true;
        },
      findPrevious:
        () =>
        ({ tr, state, dispatch }) => {
          const s = getFindState(state);
          if (!s.matches.length) return false;
          const index = (s.index - 1 + s.matches.length) % s.matches.length;
          if (dispatch) dispatch(selectMatch(tr.setMeta(findKey, { index }), s.matches[index]));
          return true;
        },
      replaceCurrent:
        (replacement) =>
        ({ tr, state, dispatch }) => {
          const s = getFindState(state);
          const match = s.matches[s.index];
          if (!match) return false;
          if (dispatch) {
            if (replacement) tr.insertText(replacement, match.from, match.to);
            else tr.delete(match.from, match.to);
            tr.setMeta(findKey, { index: s.index });
            dispatch(tr);
          }
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ tr, state, dispatch }) => {
          const s = getFindState(state);
          if (!s.matches.length) return false;
          if (dispatch) {
            // Do fim para o início: as posições anteriores não mudam.
            for (const m of [...s.matches].reverse()) {
              if (replacement) tr.insertText(replacement, m.from, m.to);
              else tr.delete(m.from, m.to);
            }
            tr.setMeta(findKey, { index: 0 });
            dispatch(tr);
          }
          return true;
        },
      clearFind:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findKey, { term: "", index: 0 }));
          return true;
        },
    };
  },
});
