import { X } from 'lucide-react';
import type { DiceTransaction } from '../../tasks/types';

const TYPE_LABELS: Record<DiceTransaction['type'], string> = {
  'task-reward': '任务奖励',
  'weekly-bonus': '周复盘奖励',
  'goal-reward': '长期目标奖励',
  'adventure-spend': '冒险投资'
};

const TARGET_LABELS: Record<string, string> = {
  'route-wind-valley': '通往风过山谷',
  'home-field-desk': '田野书桌',
  'home-memory-shelf': '记忆陈列架'
};

type LedgerDialogProps = {
  open: boolean;
  transactions: DiceTransaction[];
  onClose(): void;
};

export function LedgerDialog({ open, transactions, onClose }: LedgerDialogProps) {
  if (!open) return null;
  const ordered = [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="journal-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="journal-dialog journal-ledger-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-ledger-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="journal-dialog-header">
          <div>
            <span>GROWTH DICE HISTORY</span>
            <h2 id="journal-ledger-title">骰子账本</h2>
          </div>
          <button className="journal-icon-button" type="button" aria-label="关闭骰子账本" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {ordered.length === 0 ? (
          <div className="journal-empty-ledger">
            <strong>还没有骰子记录</strong>
            <p>完成真实任务后，获得和投入都会保留在这里。</p>
          </div>
        ) : (
          <ol className="journal-ledger-list">
            {ordered.map((transaction) => (
              <li key={transaction.id}>
                <div>
                  <strong>{TYPE_LABELS[transaction.type]}</strong>
                  <span>{transaction.targetId ? TARGET_LABELS[transaction.targetId] ?? transaction.targetId : transaction.sourceId}</span>
                  <time dateTime={transaction.createdAt}>{transaction.createdAt.slice(0, 16).replace('T', ' ')}</time>
                </div>
                <div className="journal-ledger-amount">
                  <strong>{transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}</strong>
                  <span>余额 {transaction.balanceAfter}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
