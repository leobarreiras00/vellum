/**
 * Vellum — Modal de Gestão de Membros (compatibilidade)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Substituído pelo <ShareModal /> (src/components/share/ShareDialog.tsx), que
 * junta links de partilha, convites por email e a gestão de membros.
 */
"use client";

import { ShareModal } from "@/components/share/ShareDialog";

interface ProjectMembersDialogProps {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
}

export function ProjectMembersDialog({ open, projectId, onClose }: ProjectMembersDialogProps) {
  return <ShareModal open={open} target={{ projectId, documentId: null }} onClose={onClose} />;
}
