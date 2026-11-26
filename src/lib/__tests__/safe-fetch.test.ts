import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublic, followPublicRedirects, isRedirect } from "@/lib/net/safe-fetch";

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });

afterEach(() => vi.restoreAllMocks());

describe("fetchPublic", () => {
  it("segue redirecionamentos públicos com redirect manual", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(redirect("/img2.jpg"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const res = await fetchPublic("http://8.8.8.8/img.jpg");
    expect(res?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("http://8.8.8.8/img2.jpg");
    expect((fetchMock.mock.calls[0][1] as RequestInit).redirect).toBe("manual");
  });

  it("bloqueia salto para rede interna", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(redirect("http://169.254.169.254/latest/meta-data"));
    expect(await fetchPublic("http://8.8.8.8/img.jpg")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("limita a 5 redirecionamentos", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => redirect("/loop"));
    expect(await fetchPublic("http://8.8.8.8/loop")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});

describe("followPublicRedirects", () => {
  it("revalida cada salto do cliente Playwright", async () => {
    const request = vi
      .fn<(u: string) => Promise<{ status: number; location?: string }>>()
      .mockResolvedValueOnce({ status: 301, location: "http://[::ffff:127.0.0.1]/" })
      .mockResolvedValue({ status: 200 });
    const res = await followPublicRedirects("http://8.8.8.8/a.jpg", request, (r) => r);
    expect(res).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe("isRedirect: só 301/302/303/307/308 com Location", () => {
  it("304 com Location é resposta final, não salto", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { location: "/outra" } }));
    const res = await fetchPublic("http://8.8.8.8/img.jpg");
    expect(res?.status).toBe(304);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("followPublicRedirects devolve 304 e 300 sem seguir; 308 segue", async () => {
    const request = vi
      .fn<(u: string) => Promise<{ status: number; location?: string }>>()
      .mockResolvedValueOnce({ status: 304, location: "/x" })
      .mockResolvedValueOnce({ status: 300, location: "/x" })
      .mockResolvedValueOnce({ status: 308, location: "/y" })
      .mockResolvedValueOnce({ status: 200 });
    expect((await followPublicRedirects("http://8.8.8.8/a", request, (r) => r))?.status).toBe(304);
    expect((await followPublicRedirects("http://8.8.8.8/a", request, (r) => r))?.status).toBe(300);
    expect((await followPublicRedirects("http://8.8.8.8/a", request, (r) => r))?.status).toBe(200);
    expect(request).toHaveBeenLastCalledWith("http://8.8.8.8/y");
  });

  it("isRedirect exige status de redirect e Location", () => {
    for (const s of [301, 302, 303, 307, 308]) expect(isRedirect(s, "/a")).toBe(true);
    expect(isRedirect(302, null)).toBe(false);
    expect(isRedirect(304, "/a")).toBe(false);
    expect(isRedirect(305, "/a")).toBe(false);
  });
});
