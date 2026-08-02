import { Dices } from 'lucide-react';

export function DiceBalance({ value }: { value: number }) {
  return (
    <div className="journal-dice-balance" aria-label={`成长骰子余额 ${value}`}>
      <span className="journal-dice-icon" aria-hidden="true"><Dices size={20} /></span>
      <span>
        <small>成长骰子</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
