// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";

afterEach(() => cleanup());

function Harness({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  return (
    <Modal open title="Teste" onClose={() => onClose()}>
      <button type="button">Primeiro</button>
      <input aria-label="campo" value={text} onChange={(e) => setText(e.target.value)} />
    </Modal>
  );
}

describe("Modal", () => {
  it("não rouba o foco ao re-renderizar com onClose inline", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    expect(document.activeElement).toBe(screen.getByText("Primeiro"));

    const input = screen.getByLabelText("campo") as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });

    expect(input.value).toBe("ab");
    expect(document.activeElement).toBe(input);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Esc chama o onClose mais recente", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Modal open title="T" onClose={first}>
        <button type="button">x</button>
      </Modal>
    );
    rerender(
      <Modal open title="T" onClose={second}>
        <button type="button">x</button>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
