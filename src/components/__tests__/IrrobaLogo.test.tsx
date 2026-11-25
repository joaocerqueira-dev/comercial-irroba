// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { IrrobaLogo } from "@/components/ui/IrrobaLogo";

afterEach(() => {
  cleanup();
});

describe("IrrobaLogo (BrandBook 2026)", () => {
  it("renderiza a versão primária em fundo claro com o vermelho institucional #EA191F", () => {
    render(<IrrobaLogo variant="primary" theme="light" />);
    const svg = screen.getByRole("img", { name: "Irroba E-commerce" });
    expect(svg.getAttribute("viewBox")).toBe("0 0 389 105");
    expect(svg.innerHTML).toContain("#EA191F");
    expect(svg.innerHTML).toContain("#830000");
  });

  it("renderiza as variações secundária e símbolo e o tema escuro em branco", () => {
    const { rerender } = render(<IrrobaLogo variant="secondary" theme="dark" />);
    let svg = screen.getByRole("img", { name: "Irroba E-commerce" });
    expect(svg.getAttribute("viewBox")).toBe("0 0 389 102");
    expect(svg.innerHTML).toContain("#FFFFFF");

    rerender(<IrrobaLogo variant="symbol" theme="mono-black" ariaLabel="Símbolo Irroba" />);
    svg = screen.getByRole("img", { name: "Símbolo Irroba" });
    expect(svg.getAttribute("viewBox")).toBe("0 0 110 102");
    expect(svg.querySelectorAll("path").length).toBe(4);
  });
});
