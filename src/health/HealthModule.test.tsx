import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthModule } from "./HealthModule";

describe("HealthModule", () => {
  beforeEach(() => window.localStorage.clear());
  it("uses a today-first home and one accessible quick-record chooser", () => {
    render(<HealthModule />);

    expect(
      screen.getByRole("heading", { name: "今天，记录一点真实变化" }),
    ).toBeInTheDocument();
    expect(screen.getByText("今日概览")).toBeInTheDocument();
    expect(screen.queryByText("进入")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "一键记录" }));
    const chooser = screen.getByRole("dialog", { name: "一键记录" });
    expect(chooser).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "记录身体" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "记录身体" }));
    expect(chooser).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "身体状态" })).toBeInTheDocument();
  });

  it("returns the module to the top when entering a child page", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<HealthModule />);
    scrollIntoView.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /身体状态/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("imports a backup from a file instead of requiring pasted JSON", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: "数据与隐私" }));

    expect(screen.getByLabelText("选择健康备份文件")).toHaveAttribute(
      "type",
      "file",
    );
    expect(screen.queryByLabelText("导入备份内容")).not.toBeInTheDocument();
  });

  it("keeps body corrections inside an accessible, cancellable dialog", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /身体状态/ }));
    fireEvent.change(screen.getByLabelText("体重（kg）"), {
      target: { value: "70" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存身体记录" }));
    fireEvent.click(screen.getByRole("button", { name: "更正" }));

    const dialog = screen.getByRole("dialog", { name: "更正身体记录" });
    expect(dialog).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("更正后的体重（kg）"), {
      target: { value: "69.5" },
    });
    fireEvent.change(screen.getByLabelText("更正原因（可选）"), {
      target: { value: "补录修正" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存更正" }));

    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByText("69.5 kg")).toBeInTheDocument();
  });

  it("confirms destructive actions in an in-product dialog", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /运动健身/ }));
    fireEvent.change(screen.getByLabelText("训练项目名称"), {
      target: { value: "慢跑" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建训练项目" }));
    fireEvent.click(screen.getByRole("button", { name: "归档" }));

    expect(
      screen.getByRole("dialog", { name: "归档训练项目" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认归档" }));
    expect(screen.queryByText("慢跑")).not.toBeInTheDocument();
  });
  it("presents one calm dashboard with progressively disclosed sections", () => {
    render(<HealthModule />);
    expect(
      screen.getByRole("heading", { name: "今天，记录一点真实变化" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/随便从一项开始/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /身体状态/ }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("体重（kg）")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /身体状态/ }));
    expect(screen.getByLabelText("体重（kg）")).toBeInTheDocument();
    expect(screen.getByLabelText("BMI（自动计算）")).toBeDisabled();
  });

  it("records water and a light meal without calorie claims", async () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /日常健康/ }));
    fireEvent.click(screen.getByRole("button", { name: "记录 350 ml" }));
    expect(screen.getByText("今日饮水 350 ml")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回健康首页" }));
    fireEvent.click(screen.getByRole("button", { name: /饮食记录/ }));
    fireEvent.change(screen.getByLabelText("餐食内容"), {
      target: { value: "鸡蛋和面包" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存餐食" }));
    expect(
      await screen.findByText("鸡蛋和面包", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/千卡|热量建议/)).not.toBeInTheDocument();
  });

  it("creates a custom weight-reps exercise and saves sets", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /运动健身/ }));
    fireEvent.change(screen.getByLabelText("训练项目名称"), {
      target: { value: "卧推" },
    });
    fireEvent.change(screen.getByLabelText("记录模式"), {
      target: { value: "weight-reps" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建训练项目" }));
    expect(
      screen.getByRole("heading", { name: /^卧推$/ }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("第 1 组重量（kg）"), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("第 1 组次数"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加一组" }));
    fireEvent.change(screen.getByLabelText("第 2 组重量（kg）"), {
      target: { value: "52.5" },
    });
    fireEvent.change(screen.getByLabelText("第 2 组次数"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存本次训练" }));
    expect(screen.getByText("已完成 1 次训练")).toBeInTheDocument();
  });

  it("progressively reveals, edits and restores advanced set details", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /运动健身/ }));
    fireEvent.change(screen.getByLabelText("训练项目名称"), {
      target: { value: "单侧哑铃划船" },
    });
    fireEvent.change(screen.getByLabelText("记录模式"), {
      target: { value: "weight-reps" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建训练项目" }));
    expect(screen.queryByLabelText("第 1 组类型")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "展开进阶记录" }));
    fireEvent.change(screen.getByLabelText("第 1 组类型"), {
      target: { value: "working" },
    });
    fireEvent.change(screen.getByLabelText("第 1 组侧别"), {
      target: { value: "left" },
    });
    fireEvent.change(screen.getByLabelText("第 1 组重量（kg）"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("第 1 组次数"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存本次训练" }));
    expect(screen.getByText(/正式组 · 左侧/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "编辑训练" }));
    expect(screen.getByLabelText("第 1 组类型")).toHaveValue("working");
    expect(screen.getByLabelText("第 1 组侧别")).toHaveValue("left");
    fireEvent.click(screen.getByRole("button", { name: "保存训练修改" }));
    fireEvent.click(screen.getByRole("button", { name: "复制上次训练为草稿" }));
    fireEvent.click(screen.getByRole("button", { name: "恢复草稿" }));
    expect(screen.getByLabelText("第 1 组类型")).toHaveValue("working");
    expect(screen.getByLabelText("第 1 组侧别")).toHaveValue("left");
    fireEvent.click(screen.getByRole("button", { name: "保存本次训练" }));
    expect(screen.queryByText("有一份未完成训练草稿")).not.toBeInTheDocument();
  });

  it.each([
    ["distance-time", "间歇跑", "第 1 段距离（km）", "第 1 段用时（分钟）"],
    [
      "bodyweight-reps",
      "辅助引体",
      "第 1 组额外负重（kg）",
      "第 1 组辅助重量（kg）",
    ],
    ["timed-sets", "单侧平板支撑", "第 1 组侧别", "第 1 组时长（分钟）"],
  ])(
    "exposes %s advanced fields without adding a new mode",
    (mode, name, first, second) => {
      render(<HealthModule />);
      fireEvent.click(screen.getByRole("button", { name: /运动健身/ }));
      fireEvent.change(screen.getByLabelText("训练项目名称"), {
        target: { value: name },
      });
      fireEvent.change(screen.getByLabelText("记录模式"), {
        target: { value: mode },
      });
      fireEvent.click(screen.getByRole("button", { name: "创建训练项目" }));
      fireEvent.click(screen.getByRole("button", { name: "展开进阶记录" }));
      expect(screen.getByLabelText(first)).toBeInTheDocument();
      expect(screen.getByLabelText(second)).toBeInTheDocument();
    },
  );

  it("lets users record sleep, activity and optional energy", () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole("button", { name: /日常健康/ }));
    fireEvent.change(screen.getByLabelText("睡眠时长（小时）"), {
      target: { value: "7.5" },
    });
    fireEvent.change(screen.getByLabelText("睡眠质量（可选）"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存睡眠" }));
    fireEvent.change(screen.getByLabelText("今日步数"), {
      target: { value: "6200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存活动" }));
    expect(screen.getByText(/今天已有 2 条日常记录/)).toBeInTheDocument();
  });
});
