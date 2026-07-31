import { X } from 'lucide-react';

export function RewardChest({ dice, title, onClose }: { dice: number; title: string; onClose: () => void }) {
  return (
    <div className="reward-chest-backdrop" role="presentation">
      <section className="reward-chest" role="dialog" aria-modal="true" aria-label="奖励已领取">
        <button type="button" className="task-icon-button reward-close" onClick={onClose} aria-label="关闭奖励">
          <X size={18} />
        </button>
        <div className="reward-rays" aria-hidden="true" />
        <div className="pixel-chest" aria-hidden="true"><span>🎁</span></div>
        <span className="task-kicker">REWARD UNLOCKED</span>
        <h2>{title}</h2>
        <strong>+{dice} 🎲</strong>
        <p>奖励已经进入骰子账本，只记录这次新增的差额。</p>
        <button type="button" className="task-button primary" onClick={onClose}>收下奖励</button>
      </section>
    </div>
  );
}
