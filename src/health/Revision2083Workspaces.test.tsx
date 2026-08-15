import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { HealthModule } from "./HealthModule";

describe("health revision 2083 workspaces", () => {
  beforeEach(() => window.localStorage.clear());

  it("builds a three-phase workout from the searchable exercise library before starting", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /运动健身/ }));
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("练前热身")).toBeInTheDocument();
    expect(screen.getByText("训练动作")).toBeInTheDocument();
    expect(screen.getByText("练后拉伸")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加训练动作" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "添加训练动作动作" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "添加训练动作" }));
    const dialog = screen.getByRole("dialog", { name: "动作库" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "搜索动作" }), { target: { value: "卧推" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "添加" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "完成添加" }));
    fireEvent.click(screen.getByRole("button", { name: /开始训练/ }));
    expect(screen.getAllByText("训练进行中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("卧推").length).toBeGreaterThan(0);
  });

  it("adds a weighed public food from a meal-specific entry", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /饮食记录/ }));
    expect(screen.getByText("还可摄入")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "添加早餐" }));
    const dialog = screen.getByRole("dialog", { name: "食物库" });
    fireEvent.click(within(dialog).getByRole("button", { name: /熟米饭/ }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "克重" }), { target: { value: "150" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "加入早餐" }));
    expect(screen.getByText("1 条 · 174 kcal")).toBeInTheDocument();
  });

  it("records body circumference through a metric chooser", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /身体状态/ }));
    fireEvent.click(screen.getByRole("button", { name: "添加身体数据" }));
    const dialog = screen.getByRole("dialog", { name: "添加身体数据" });
    fireEvent.click(within(dialog).getByRole("button", { name: "腰围" }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "腰围（cm）" }), { target: { value: "78.5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存记录" }));
    expect(screen.getByText("78.5 cm")).toBeInTheDocument();
  });

  it("keeps water targets and sedentary reminder settings separate", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /日常健康/ }));
    expect(screen.getByText("喝水、休息与睡眠")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "设置饮水目标和提醒" }));
    expect(screen.getByRole("dialog", { name: "饮水目标与提醒" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    fireEvent.click(screen.getByRole("button", { name: "设置久坐提醒" }));
    expect(screen.getByRole("dialog", { name: "久坐提醒" })).toBeInTheDocument();
  });
});
