import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

const O = "https://app.x";
describe("safeNextPath", () => {
  it.each(["/\\evil.com", "/\t/evil.com", "//evil.com", "https://evil.com", "javascript:alert(1)", null, undefined, ""])(
    "rejeita %j",
    (v) => expect(safeNextPath(v, O)).toBe("/"),
  );
  it("mantém caminho interno com query e hash", () => {
    expect(safeNextPath("/studio/x?a=1#h", O)).toBe("/studio/x?a=1#h");
  });
});
