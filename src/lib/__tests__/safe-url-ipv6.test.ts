import { describe, expect, it } from "vitest";
import { ipv6ToBytes, isPrivateIp, isPublicHttpUrl } from "@/lib/net/safe-url";

describe("ipv6ToBytes", () => {
  it("expande :: e IPv4 embutido", () => {
    expect(ipv6ToBytes("::1")).toEqual([...Array(15).fill(0), 1]);
    expect(ipv6ToBytes("::ffff:127.0.0.1")).toEqual([...Array(10).fill(0), 255, 255, 127, 0, 0, 1]);
    expect(ipv6ToBytes("::ffff:7f00:1")).toEqual([...Array(10).fill(0), 255, 255, 127, 0, 0, 1]);
    expect(ipv6ToBytes("2001:db8::1")?.slice(0, 4)).toEqual([0x20, 0x01, 0x0d, 0xb8]);
    expect(ipv6ToBytes("nada")).toBeNull();
  });
});

describe("isPrivateIp com IPv6", () => {
  it.each([
    "::ffff:7f00:1",
    "::ffff:127.0.0.1",
    "::ffff:a9fe:a9fe",
    "::ffff:169.254.169.254",
    "::ffff:10.0.0.1",
    "::127.0.0.1",
    "::7f00:1",
    "64:ff9b::7f00:1",
    "64:ff9b::169.254.169.254",
    "2002:7f00:1::",
    "2002:a9fe:a9fe::1",
    "::",
    "::1",
    "fe80::1",
    "fc00::1",
    "ff02::1",
  ])("bloqueia %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(["2606:4700:4700::1111", "::ffff:8.8.8.8", "64:ff9b::808:808", "2002:808:808::1"])("permite %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});

describe("isPublicHttpUrl com literais IPv6", () => {
  it.each([
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:169.254.169.254]/latest/meta-data",
    "http://[::127.0.0.1]/",
    "http://[64:ff9b::a9fe:a9fe]/",
    "http://[2002:7f00:1::]/",
  ])("recusa %s", async (url) => {
    expect(await isPublicHttpUrl(url)).toBe(false);
  });
  it("aceita IPv6 público literal", async () => {
    expect(await isPublicHttpUrl("http://[2606:4700:4700::1111]/")).toBe(true);
  });
});
