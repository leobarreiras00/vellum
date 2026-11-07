# Skill — Security & RBAC Guard

> © 2026 Vellum · Arquitetado e Desenvolvido por Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
> Skill obrigatória para qualquer código de servidor, rotas, renderização de conteúdo do utilizador e Mermaid.

---

## 1. Papéis

Dois níveis, definidos em `prisma/schema.prisma`:

| Nível        | Enum             | Papéis                                       |
| ------------ | ---------------- | -------------------------------------------- |
| Plataforma   | `PlatformRole`   | `USER`, `SUPER_ADMIN`                        |
| Workspace    | `WorkspaceRole`  | `OWNER`, `EDITOR`, `COMMENTER`, `VIEWER`     |

Hierarquia efetiva: `SUPER_ADMIN` > `OWNER` > `EDITOR` > `COMMENTER` > `VIEWER`.

### 1.1 Matriz de permissões

| Ação                                   | SUPER_ADMIN | OWNER | EDITOR | COMMENTER | VIEWER |
| -------------------------------------- | :---------: | :---: | :----: | :-------: | :----: |
| Ler documentos / calendário            | ✓           | ✓     | ✓      | ✓         | ✓      |
| Comentar                               | ✓           | ✓     | ✓      | ✓         | —      |
| Criar / editar documentos e eventos    | ✓           | ✓     | ✓      | —         | —      |
| Eliminar (lógico) documentos           | ✓           | ✓     | ✓ (próprios) | —   | —      |
| Gerir projetos e legendas              | ✓           | ✓     | —      | —         | —      |
| Convidar / alterar papéis de membros   | ✓           | ✓     | —      | —         | —      |
| Eliminar workspace / transferir posse  | ✓           | ✓     | —      | —         | —      |
| Exportar documentos (PDF, DOCX)        | ✓           | ✓     | ✓      | ✓         | —      |
| Administração da plataforma            | ✓           | —     | —      | —         | —      |

## 2. Regras de servidor

1. **Todas** as Server Actions e Route Handlers começam por: autenticar → validar input com **Zod** → `assertCan(user, action, resource)` → executar.
2. A permissão é verificada no servidor **sempre**; esconder botões no cliente é só conveniência.
3. Consultas Prisma filtram sempre por `workspaceId` do membro e por `deletedAt: null`. Nunca confiar num `workspaceId` vindo do cliente sem verificar `WorkspaceMember`.
4. Erros devolvidos ao cliente são genéricos em PT-PT ("Não tem permissão para esta ação."); detalhes só no log do servidor.
5. Tokens (ex.: `PasswordResetToken`) guardam-se apenas como **hash** (SHA-256), com expiração ≤ 60 min e uso único (`usedAt`).
6. Palavras-passe com Argon2id (ou bcrypt cost ≥ 12) via Better-Auth.

## 3. Proteção de rotas

- `src/middleware.ts` protege `/dashboard/**`, `/workspace/**` e `/admin/**` (e `/api/**`, exceto `/api/auth/**`, quando existir): sem sessão → redirecionar para `/login?seguinte=<rota>`. Com sessão, `/login` → `/dashboard`.
- Matriz e helpers em `src/lib/rbac.ts` (`hasPermission`, `canEditDocument`, `canManageProject`, `canExportDocument`, `assertCan`); na interface, `<RoleGuard allowed={[...]} fallback={...}>` (`src/components/auth/RoleGuard.tsx`).
- `?seguinte=` só aceita caminhos internos (`/x`), nunca `//host` nem URLs absolutos.
- `/admin/**` exige `PlatformRole.SUPER_ADMIN`, verificado no servidor (layout + actions), não só no middleware.
- Cabeçalhos: CSP restritiva (`default-src 'self'`; scripts com nonce), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`.

## 4. Mermaid e conteúdo do utilizador

```ts
mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",   // obrigatório: sem HTML/click handlers nos diagramas
  htmlLabels: false,
  theme: "base",             // variáveis derivadas dos tokens do tema ativo
});
```

- Nunca `securityLevel: "loose"` ou `"antiscript"`.
- SVG gerado é sanitizado (DOMPurify com perfil SVG) antes de ser injetado.
- Nenhum `dangerouslySetInnerHTML` com conteúdo do utilizador sem sanitização.
- Ligações externas no editor: `rel="noopener noreferrer nofollow"`.

## 5. Checklist
- [ ] Zod em todas as fronteiras.
- [ ] `assertCan` em todas as mutações.
- [ ] Filtro por `workspaceId` + `deletedAt: null`.
- [ ] Mermaid em `strict`.
- [ ] Sem segredos no código; apenas `.env` (com `.env.example` versionado).
