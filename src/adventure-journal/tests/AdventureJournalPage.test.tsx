import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DiceTransaction } from '../../tasks/types';
import { PermanentHomeScene } from '../assets/home/v0.1.0/PermanentHomeScene';
import { SunnyTrailScene } from '../assets/maps/v0.1.0/SunnyTrailScene';
import { DiceBalance } from '../components/DiceBalance';
import { InvestDialog } from '../components/InvestDialog';
import { LedgerDialog } from '../components/LedgerDialog';

describe('adventure journal shared interface', () => {
  it('validates investment amounts next to a visible input label', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <InvestDialog
        open
        targetName="田野书桌"
        balance={8}
        remaining={6}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: '投入骰子' })).toBeInTheDocument();
    expect(screen.getByLabelText('投入数量')).toHaveAttribute('max', '6');
    fireEvent.change(screen.getByLabelText('投入数量'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: '确认投入' }));

    expect(screen.getByRole('alert')).toHaveTextContent('本次最多还能投入 6 枚骰子');
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('announces the current dice balance', () => {
    render(<DiceBalance value={12} />);
    expect(screen.getByLabelText('成长骰子余额 12')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows signed ledger entries with target details', () => {
    const transaction: DiceTransaction = {
      id: 'spend',
      type: 'adventure-spend',
      amount: -6,
      sourceId: 'operation-1',
      dimension: 'mixed',
      ruleVersion: 'adventure-investment-v1',
      createdAt: '2026-08-01T09:00:00+08:00',
      balanceAfter: 2,
      targetType: 'home-item',
      targetId: 'home-field-desk'
    };
    render(<LedgerDialog open transactions={[transaction]} onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: '骰子账本' })).toBeInTheDocument();
    expect(screen.getByText('-6')).toBeInTheDocument();
    expect(screen.getByText('田野书桌')).toBeInTheDocument();
    expect(screen.getByText('余额 2')).toBeInTheDocument();
  });

  it('provides descriptive labels for both original pixel stages', () => {
    const { rerender } = render(<SunnyTrailScene reducedMotion={false} />);
    expect(screen.getByRole('img', { name: '晴日林径像素旅途场景' })).toBeInTheDocument();

    rerender(<PermanentHomeScene reducedMotion unlockedItemIds={['home-field-desk']} />);
    expect(screen.getByRole('img', { name: '永久家园像素场景' })).toBeInTheDocument();
    expect(screen.getByTestId('home-field-desk')).toBeInTheDocument();
  });
});
