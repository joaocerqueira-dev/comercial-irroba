import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublic, followPublicRedirects } from "@/lib/net/safe-fetch";

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
