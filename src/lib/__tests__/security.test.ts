import { describe, expect, it } from "vitest";
import {
  escapeCssComment,
  safeJsonForScript,
  sanitizeCustomHtmlBlock,
  sanitizeUrl,
  validateSunEditorHtml,
} from "@/lib/irroba-blocks/sanitize";
import { assertPublicHttpUrl, isPrivateIp } from "@/lib/net/safe-url";
import { checkBasicAuth, isPublicPath } from "@/middleware";

describe("safeJsonForScript", () => {
  it("escapa fechamento de script e separadores de linha", () => {
    const out = safeJsonForScript("</script><script>alert(1)</script>&  ");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toBe("</script><script>alert(1)</script>&  ");
  });
});

describe("sanitizeUrl", () => {
  it("bloqueia protocolo relativo e javascript:", () => {
    expect(sanitizeUrl("//evil.com/x")).toBe("#");
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
    expect(sanitizeUrl("/api/captures/a.png")).toBe("/api/captures/a.png");
  });
  it("escapeCssComment não deixa fechar comentário", () => {
    expect(escapeCssComment("a */ body{} /*")).not.toContain("*/");
  });
});

describe("SSRF", () => {
  it("identifica IPs internos", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
  it("recusa URLs internas", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.1")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://localhost:3000")).rejects.toThrow();
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://[::1]/")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});

describe("basic auth", () => {
  const h = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`;
  it("libera em dev sem credenciais e bloqueia em produção", () => {
    expect(checkBasicAuth(null, undefined, undefined, "development")).toBe("ok");
    expect(checkBasicAuth(null, undefined, undefined, "production")).toBe("misconfigured");
  });
  it("valida usuário e senha", () => {
    expect(checkBasicAuth(h("a", "b"), "a", "b", "production")).toBe("ok");
    expect(checkBasicAuth(h("a", "x"), "a", "b", "production")).toBe("unauthorized");
    expect(checkBasicAuth(null, "a", "b", "development")).toBe("unauthorized");
  });
  it("rotas públicas", () => {
    expect(isPublicPath("/preview/x")).toBe(true);
    expect(isPublicPath("/api/captures/a.png")).toBe(true);
    expect(isPublicPath("/api/previews")).toBe(false);
  });
});

describe("sanitizeCustomHtmlBlock & validateSunEditorHtml", () => {
  it("remove tags perigosas, event handlers e URLs/CSS inseguros preservando estilos inline legítimos", () => {
    const dirty = `
      <div style="background:#fff;padding:16px;color:red;background-image:url(javascript:alert(1));width:expression(alert(1))">
        <h2 onclick="alert(1)" style="margin:0;color:#111;">Título</h2>
        <script>alert(1)</script>
        <style>.x{color:red}</style>
        <iframe src="https://evil.com"></iframe>
        <form action="/steal"><input type="text" /></form>
        <a href="javascript:alert(2)" style="font-weight:bold;">Link Malicioso</a>
        <a href="https://loja.com.br/colecao" style="background-image:url(data:text/html,evil);">Botão Seguro</a>
        <img src="https://cdn.loja.com.br/banner.jpg" onerror="fetch('/x')" style="background:e\\xpression(1);border-radius:8px;" />
      </div>
    `;
    const clean = sanitizeCustomHtmlBlock(dirty);
    expect(clean).not.toMatch(/<script|<style|<iframe|<form|<input/i);
    expect(clean).not.toMatch(/onclick=|onerror=|javascript:|expression\(|data:text/i);
    expect(clean).toContain("Título");
    expect(clean).toContain('href="https://loja.com.br/colecao"');
    expect(clean).toContain('src="https://cdn.loja.com.br/banner.jpg"');
    expect(clean).toContain("padding:16px");
    expect(clean).toContain("border-radius:8px");
  });

  it("reporta avisos para HTML incompatível com SunEditor", () => {
    const warnings = validateSunEditorHtml(
      '<style>.a{}</style><script>x()</script><div onclick="y()" style="width:expression(1)"></div>'
    );
    expect(warnings.length).toBeGreaterThanOrEqual(4);
  });
});
