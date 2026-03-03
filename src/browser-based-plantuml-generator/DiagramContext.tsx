import React, { useState, createContext, useContext } from "react";
import type { DiagramAST, Participant, StatementNode } from "./types";
import { astToString } from "./parser/serializer";
import { genId } from "./utils";
import { tokenizeLine } from "./parser/tokenizer";

export interface DiagramContextType {
  code: string;
  updateCode: (code: string) => void;
  ast: DiagramAST | null;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  clickPosition: { x: number, y: number } | null;
  setClickPosition: (pos: { x: number, y: number } | null) => void;
  diagramPadding: { top: number, right: number, bottom: number, left: number };
  setDiagramPadding: (pad: { top: number, right: number, bottom: number, left: number }) => void;
  actions: {
    deleteNode: (id: string) => void;
    editNodeLabel: (id: string, newLabel: string, branchIdx?: number) => void;
    createMessage: (targetId: string, position: "after" | "inside", branchIdx?: number) => void;
    createElse: (altId: string, branchIdx: number) => void;
    deleteElse: (altId: string, branchIdx: number) => void;
    createParticipant: (targetAlias: string) => void;
    editParticipant: (alias: string, newDeclStr: string) => void;
    deleteParticipant: (alias: string) => void;
    moveParticipant: (alias: string, direction: "left" | "right") => void;
    insertParticipantAt: (index: number, kind?: string) => void;
  };
}

const DiagramContext = createContext<DiagramContextType | null>(null);

export function useDiagram() {
  const ctx = useContext(DiagramContext);
  if (!ctx) throw new Error("useDiagram must be used within DiagramProvider");
  return ctx;
}

export function useDiagramActions() {
  return useDiagram().actions;
}

export function DiagramProvider({ children, code, updateCode, ast }: { children: React.ReactNode, code: string, updateCode: (c: string) => void, ast: DiagramAST | null }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  const [diagramPadding, setDiagramPadding] = useState({ top: 40, right: 40, bottom: 40, left: 40 });

  const actions = {
    deleteNode: (id: string) => {
      if (!ast) return;
      function filterStmts(stmts: StatementNode[]): StatementNode[] {
        return stmts.filter(s => {
          if (s.type === "ALT_BLOCK") {
            if (s.id === id) return false;
            s.branches.forEach(b => b.statements = filterStmts(b.statements));
          } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
            if (s.id === id) return false;
            s.statements = filterStmts(s.statements);
          } else if (s.type === "NOTE" || s.type === "DIVIDER" || s.type === "MESSAGE") {
            if (s.id === id) return false;
          }
          return true;
        });
      }
      const newAst = { ...ast, statements: filterStmts([...ast.statements]) };
      updateCode(astToString(newAst));
      setSelectedNodeId(null);
      setClickPosition(null);
    },

    editNodeLabel: (id: string, newLabel: string, branchIdx?: number) => {
      if (!ast) return;
      const newStmts = JSON.parse(JSON.stringify(ast.statements)); // quick deep clone
      function edit(stmts: any[]): boolean {
        for (const s of stmts) {
          if (s.id === id) {
            if (s.type === "MESSAGE") {
              const msgM = newLabel.match(/^(\S+)\s*(->|<-|-->|<--)\s*(\S+)\s*:\s*(.+)$/);
              if (msgM) {
                s.from = msgM[1]; s.arrow = msgM[2] as any; s.to = msgM[3]; s.label = msgM[4].trim();
              } else {
                const msgNoLabel = newLabel.match(/^(\S+)\s*(->|<-|-->|<--)\s*(\S+)\s*$/);
                if (msgNoLabel) {
                  s.from = msgNoLabel[1]; s.arrow = msgNoLabel[2] as any; s.to = msgNoLabel[3]; s.label = "";
                } else {
                  s.label = newLabel;
                }
              }
            }
            else if (s.type === "DIVIDER") s.label = newLabel;
            else if (s.type === "NOTE") s.lines = newLabel.split("\\n");
            else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") s.label = newLabel;
            else if (s.type === "ALT_BLOCK") {
              if (branchIdx !== undefined && s.branches[branchIdx]) {
                s.branches[branchIdx].condition = newLabel;
              }
            }
            return true;
          }
          if (s.type === "ALT_BLOCK") {
            for (const b of s.branches) if (edit(b.statements)) return true;
          } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
            if (edit(s.statements)) return true;
          }
        }
        return false;
      }
      edit(newStmts);
      updateCode(astToString({ ...ast, statements: newStmts }));
    },

    createMessage: (targetId: string, position: "after" | "inside", branchIdx?: number) => {
      if (!ast) return;
      const newStmts = JSON.parse(JSON.stringify(ast.statements));
      const p1 = ast.participants[0]?.alias || "A";
      const p2 = ast.participants[1]?.alias || p1;
      const newMsg = { type: "MESSAGE", id: genId(), from: p1, to: p2, arrow: "->", label: "new message", autoNum: null, idx: -1 };

      function insert(stmts: any[]): boolean {
        const idx = stmts.findIndex(s => s.id === targetId);
        if (idx !== -1 && position === "after") {
          stmts.splice(idx + 1, 0, newMsg);
          return true;
        }
        for (const s of stmts) {
          if (s.id === targetId && position === "inside") {
            if (s.type === "ALT_BLOCK") {
              if (branchIdx !== undefined && s.branches[branchIdx]) {
                s.branches[branchIdx].statements.push(newMsg);
                return true;
              }
            } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
              s.statements.push(newMsg);
              return true;
            }
          }
          if (s.type === "ALT_BLOCK") {
            for (const b of s.branches) if (insert(b.statements)) return true;
          } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
            if (insert(s.statements)) return true;
          }
        }
        return false;
      }
      insert(newStmts);
      updateCode(astToString({ ...ast, statements: newStmts }));
    },

    createElse: (altId: string, branchIdx: number) => {
      if (!ast) return;
      const newStmts = JSON.parse(JSON.stringify(ast.statements));
      function addElse(stmts: any[]): boolean {
        for (const s of stmts) {
          if (s.id === altId && s.type === "ALT_BLOCK") {
            s.branches.splice(branchIdx + 1, 0, { condition: "", statements: [] });
            return true;
          }
          if (s.type === "ALT_BLOCK") {
            for (const b of s.branches) if (addElse(b.statements)) return true;
          } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
            if (addElse(s.statements)) return true;
          }
        }
        return false;
      }
      addElse(newStmts);
      updateCode(astToString({ ...ast, statements: newStmts }));
    },

    deleteElse: (altId: string, branchIdx: number) => {
      if (!ast) return;
      const newStmts = JSON.parse(JSON.stringify(ast.statements));
      function delElse(stmts: any[]): boolean {
        for (const s of stmts) {
          if (s.id === altId && s.type === "ALT_BLOCK") {
            s.branches.splice(branchIdx, 1);
            return true;
          }
          if (s.type === "ALT_BLOCK") {
            for (const b of s.branches) if (delElse(b.statements)) return true;
          } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
            if (delElse(s.statements)) return true;
          }
        }
        return false;
      }
      delElse(newStmts);
      updateCode(astToString({ ...ast, statements: newStmts }));
    },

    createParticipant: (targetAlias: string) => {
      if (!ast) return;
      const idx = ast.participants.findIndex(p => p.alias === targetAlias);
      if (idx === -1) return;
      const newAlias = "NewPart_" + genId().substring(0, 4);
      const newP = { alias: newAlias, name: "New Participant", kind: "participant" };
      const newAst = JSON.parse(JSON.stringify(ast));
      newAst.participants.splice(idx + 1, 0, newP);
      updateCode(astToString(newAst));
    },

    editParticipant: (alias: string, newDeclStr: string) => {
      if (!ast) return;
      const t = tokenizeLine(newDeclStr);
      if (t && t.type === "DECLARATION") {
        const newAlias = t.alias;
        const newAst = JSON.parse(JSON.stringify(ast));
        const pIdx = newAst.participants.findIndex((p: Participant) => p.alias === alias);
        if (pIdx !== -1) {
          newAst.participants[pIdx] = { ...newAst.participants[pIdx], kind: t.kind, name: t.name, alias: t.alias, stereoType: t.stereoType, color: t.color };
        }
        if (newAlias !== alias) {
          function rename(stmts: any[]) {
            stmts.forEach(s => {
              if (s.type === "MESSAGE") {
                if (s.from === alias) s.from = newAlias;
                if (s.to === alias) s.to = newAlias;
              } else if (s.type === "NOTE") {
                if (s.p1 === alias) s.p1 = newAlias;
                if (s.p2 === alias) s.p2 = newAlias;
              }
              if (s.type === "ALT_BLOCK") s.branches.forEach((b: any) => rename(b.statements));
              if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") rename(s.statements);
            });
          }
          rename(newAst.statements);
        }
        updateCode(astToString(newAst));
      }
    },

    deleteParticipant: (alias: string) => {
      if (!ast) return;
      const newAst = JSON.parse(JSON.stringify(ast));
      newAst.participants = newAst.participants.filter((p: Participant) => p.alias !== alias);
      function filterRefStmts(stmts: any[]): any[] {
        return stmts.filter(s => {
          if (s.type === "MESSAGE" && (s.from === alias || s.to === alias)) return false;
          if (s.type === "NOTE" && (s.p1 === alias || s.p2 === alias)) return false;
          if (s.type === "ALT_BLOCK") {
            s.branches.forEach((b: any) => b.statements = filterRefStmts(b.statements));
            return s.branches.some((b: any) => b.statements.length > 0) || s.branches.length > 0;
          }
          if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
            s.statements = filterRefStmts(s.statements);
          }
          return true;
        });
      }
      newAst.statements = filterRefStmts(newAst.statements);
      updateCode(astToString(newAst));
      setSelectedNodeId(null);
      setClickPosition(null);
    },

    moveParticipant: (alias: string, direction: "left" | "right") => {
      if (!ast) return;
      const idx = ast.participants.findIndex(p => p.alias === alias);
      if (idx === -1) return;
      const newAst = JSON.parse(JSON.stringify(ast));

      // Also check if they are in directAliases of a box and swap there if applicable
      function swapInArr(arr: any[], i1: number, i2: number) {
        if (i1 >= 0 && i2 >= 0 && i1 < arr.length && i2 < arr.length) {
          [arr[i1], arr[i2]] = [arr[i2], arr[i1]];
        }
      }

      if (direction === "left" && idx > 0) {
        swapInArr(newAst.participants, idx, idx - 1);
      } else if (direction === "right" && idx < newAst.participants.length - 1) {
        swapInArr(newAst.participants, idx, idx + 1);
      }
      updateCode(astToString(newAst));
    },

    insertParticipantAt: (index: number, kind?: string) => {
      if (!ast) return;
      const actualKind = kind || "participant";
      const newAlias = "NewPart_" + genId().substring(0, 4);
      const newP = { alias: newAlias, name: "New Participant", kind: actualKind };
      const newAst = JSON.parse(JSON.stringify(ast));
      const safeIndex = Math.max(0, Math.min(newAst.participants.length, index));
      newAst.participants.splice(safeIndex, 0, newP);
      updateCode(astToString(newAst));
    }
  };

  return (
    <DiagramContext.Provider value={{ code, updateCode, ast, selectedNodeId, setSelectedNodeId, clickPosition, setClickPosition, diagramPadding, setDiagramPadding, actions }}>
      {children}
    </DiagramContext.Provider>
  );
}
