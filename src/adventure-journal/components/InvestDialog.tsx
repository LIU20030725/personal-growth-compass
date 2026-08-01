import { useEffect, useState, type FormEvent } from 'react';
import { Minus, Plus, X } from 'lucide-react';

type InvestDialogProps = {
  open: boolean;
  targetName: string;
  balance: number;
  remaining: number;
  externalError?: string;
  onClose(): void;
  onConfirm(amount: number): void;
};

export function InvestDialog({
  open,
  targetName,
  balance,
  remaining,
  externalError = '',
  onClose,
  onConfirm
}: InvestDialogProps) {
  const [amount, setAmount] = useState('1');
  const [error, setError] = useState('');
  const maximum = Math.min(balance, remaining);

  useEffect(() => {
    if (!open) return;
    setAmount(maximum > 0 ? '1' : '0');
    setError('');
  }, [maximum, open, targetName]);

  if (!open) return null;

  function updateAmount(next: number) {
    setAmount(String(Math.max(0, next)));
    setError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      setError('请输入大于 0 的整数');
      return;
    }
    if (value > remaining) {
      setError(`本次最多还能投入 ${remaining} 枚骰子`);
      return;
    }
    if (value > balance) {
      setError(`骰子余额不足，还差 ${value - balance} 枚`);
      return;
    }
    onConfirm(value);
  }

  const shownError = error || externalError;

  return (
    <div className="journal-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="journal-dialog journal-invest-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-invest-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="journal-dialog-header">
          <div>
            <span>FIXED-PRICE INVESTMENT</span>
            <h2 id="journal-invest-title">投入骰子</h2>
          </div>
          <button className="journal-icon-button" type="button" aria-label="关闭投入对话框" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <form onSubmit={submit} noValidate>
          <p className="journal-invest-target">目标：<strong>{targetName}</strong></p>
          <dl className="journal-invest-summary">
            <div><dt>当前余额</dt><dd>{balance} 枚</dd></div>
            <div><dt>还需投入</dt><dd>{remaining} 枚</dd></div>
          </dl>
          <label htmlFor="investment-amount">投入数量</label>
          <div className="journal-number-stepper">
            <button type="button" aria-label="减少一枚骰子" onClick={() => updateAmount(Number(amount) - 1)}>
              <Minus size={18} />
            </button>
            <input
              id="investment-amount"
              name="investment-amount"
              type="number"
              inputMode="numeric"
              min="1"
              max={maximum}
              step="1"
              value={amount}
              onChange={(event) => { setAmount(event.target.value); setError(''); }}
            />
            <button type="button" aria-label="增加一枚骰子" onClick={() => updateAmount(Number(amount) + 1)}>
              <Plus size={18} />
            </button>
          </div>
          <div className="journal-quick-amounts" aria-label="快捷投入数量">
            {[1, 5].map((value) => (
              <button key={value} type="button" disabled={maximum < value} onClick={() => updateAmount(value)}>
                {value} 枚
              </button>
            ))}
            <button type="button" disabled={maximum < 1} onClick={() => updateAmount(maximum)}>最大 {maximum}</button>
          </div>
          {shownError ? <p className="journal-form-error" role="alert">{shownError}</p> : null}
          <div className="journal-dialog-actions">
            <button className="journal-secondary-button" type="button" onClick={onClose}>取消</button>
            <button className="journal-primary-button" type="submit" disabled={maximum < 1}>确认投入</button>
          </div>
        </form>
      </section>
    </div>
  );
}
