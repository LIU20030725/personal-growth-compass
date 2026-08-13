import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthModule } from './HealthModule';

describe('HealthModule', () => {
  beforeEach(() => window.localStorage.clear());
  it('presents one calm dashboard with progressively disclosed sections', () => {
    render(<HealthModule />);
    expect(screen.getByRole('heading', { name: '健康状况' })).toBeInTheDocument();
    expect(screen.getByText(/随便从一项开始/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /身体状态/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('体重（kg）')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /身体状态/ }));
    expect(screen.getByLabelText('体重（kg）')).toBeInTheDocument();
    expect(screen.getByLabelText('BMI（自动计算）')).toBeDisabled();
  });

  it('records water and a light meal without calorie claims', async () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole('button', { name: /日常健康/ }));
    fireEvent.click(screen.getByRole('button', { name: '记录 350 ml' }));
    expect(screen.getByText('今日饮水 350 ml')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回健康首页' }));
    fireEvent.click(screen.getByRole('button', { name: /饮食记录/ }));
    fireEvent.change(screen.getByLabelText('餐食内容'), { target: { value: '鸡蛋和面包' } });
    fireEvent.click(screen.getByRole('button', { name: '保存餐食' }));
    expect(await screen.findByText('鸡蛋和面包', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText(/千卡|热量建议/)).not.toBeInTheDocument();
  });

  it('creates a custom weight-reps exercise and saves sets', () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole('button', { name: /运动健身/ }));
    fireEvent.change(screen.getByLabelText('训练项目名称'), { target: { value: '卧推' } });
    fireEvent.change(screen.getByLabelText('记录模式'), { target: { value: 'weight-reps' } });
    fireEvent.click(screen.getByRole('button', { name: '创建训练项目' }));
    expect(screen.getByText('卧推')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('第 1 组重量（kg）'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('第 1 组次数'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '添加一组' }));
    fireEvent.change(screen.getByLabelText('第 2 组重量（kg）'), { target: { value: '52.5' } });
    fireEvent.change(screen.getByLabelText('第 2 组次数'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: '保存本次训练' }));
    expect(screen.getByText('已完成 1 次训练')).toBeInTheDocument();
  });

  it('lets users record sleep, activity and optional energy', () => {
    render(<HealthModule />);
    fireEvent.click(screen.getByRole('button', { name: /日常健康/ }));
    fireEvent.change(screen.getByLabelText('睡眠时长（小时）'), { target: { value: '7.5' } });
    fireEvent.change(screen.getByLabelText('睡眠质量（可选）'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: '保存睡眠' }));
    fireEvent.change(screen.getByLabelText('今日步数'), { target: { value: '6200' } });
    fireEvent.click(screen.getByRole('button', { name: '保存活动' }));
    expect(screen.getByText(/今天已有 2 条日常记录/)).toBeInTheDocument();
  });
});
