import { describe, expect, it } from "vitest";
import { escapeCssComment, safeJsonForScript, sanitizeUrl } from "@/lib/irroba-blocks/sanitize";
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
