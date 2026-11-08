/**
 * Vellum — Servidor de email falso para os testes E2E
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Imita POST /v3/smtp/email do Brevo e guarda as mensagens em memória, para os
 * testes lerem o código de confirmação como se abrissem a caixa de correio:
 *   GET /ultima?para=<email>  → { subject, text, html } da última mensagem
 *   GET /saude                → 200
 * Só escuta em 127.0.0.1. Uso: node scripts/e2e-mail-mock.mjs [porta]
 */
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? process.env.E2E_MAIL_PORT ?? 3199);
const messages = [];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.method === "GET" && url.pathname === "/saude") return send(200, { ok: true, total: messages.length });

  if (req.method === "GET" && url.pathname === "/ultima") {
    const to = (url.searchParams.get("para") ?? "").toLowerCase();
    const found = messages.findLast((m) => m.to.includes(to));
    return found ? send(200, found) : send(404, { error: "sem mensagens" });
  }

  if (req.method === "POST" && url.pathname === "/v3/smtp/email") {
    if (!req.headers["api-key"]) return send(401, { message: "api-key em falta" });
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(raw);
        messages.push({
          to: (body.to ?? []).map((t) => String(t.email).toLowerCase()),
          subject: body.subject,
          text: body.textContent,
          html: body.htmlContent,
          at: Date.now(),
        });
        if (messages.length > 500) messages.shift();
        send(201, { messageId: `<e2e-${messages.length}@vellum.local>` });
      } catch {
        send(400, { message: "JSON inválido" });
      }
    });
    return;
  }

  send(404, { error: "rota desconhecida" });
});

// eslint-disable-next-line no-console
server.listen(port, "127.0.0.1", () => console.log(`[e2e-mail] a ouvir em http://127.0.0.1:${port}`));
