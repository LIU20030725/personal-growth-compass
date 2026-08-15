import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("Dice Life health navigation", () => {
  it("opens the real health module instead of the generic placeholder", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "健康状况" }));
    expect(
      screen.getByRole("heading", { name: "今天，记录一点真实变化" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /身体状态/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("health-shell");
    expect(
      screen.getByRole("complementary", { name: "角色与模块导航" }),
    ).toHaveClass("health-sidebar");
    expect(
      screen.queryByText("记录睡眠、运动与身体指标，保持稳定输出。"),
    ).not.toBeInTheDocument();
  });
});
