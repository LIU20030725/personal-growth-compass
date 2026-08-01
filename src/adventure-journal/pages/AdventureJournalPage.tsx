import { BookOpenText, Home, Map, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { V0_1_TARGETS } from '../content/v0_1';
import { DiceBalance } from '../components/DiceBalance';
import { InvestDialog } from '../components/InvestDialog';
import { LedgerDialog } from '../components/LedgerDialog';
import type { InvestmentProgress } from '../domain/types';
import '../styles/AdventureJournal.css';
import { useAdventureJournal, type AdventureJournalOptions } from '../useAdventureJournal';
import { HomeView } from './HomeView';
import { JourneyView } from './JourneyView';

const TARGET_NAMES = Object.fromEntries(
  V0_1_TARGETS.map((target) => [target.targetId, target.title])
) as Record<string, string>;

type AdventureJournalPageProps = { options?: AdventureJournalOptions };
const messageOf = (error: unknown) => error instanceof Error ? error.message : '投入失败，请稍后重试';

export function AdventureJournalPage({ options }: AdventureJournalPageProps) {
  const controller = useAdventureJournal(options);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [activeInvestment, setActiveInvestment] = useState<InvestmentProgress | null>(null);
  const [investmentError, setInvestmentError] = useState('');
  const remaining = activeInvestment ? activeInvestment.price - activeInvestment.invested : 0;

  function openInvestment(target: InvestmentProgress) {
    setActiveInvestment(target);
    setInvestmentError(controller.diceBalance > 0 ? '' : '骰子余额不足，还差 1 枚');
  }

  function confirmInvestment(amount: number) {
    if (!activeInvestment) return;
    try {
      controller.invest(activeInvestment.targetType, activeInvestment.targetId, amount);
      setActiveInvestment(null);
      setInvestmentError('');
    } catch (error) {
      setInvestmentError(messageOf(error));
    }
  }

  return (
    <section className={'adventure-journal'} aria-labelledby={'adventure-journal-title'}>
      <header className={'journal-page-header'}>
        <div className={'journal-title-lockup'}>
          <span className={'journal-title-icon'} aria-hidden={true}><BookOpenText size={24} /></span>
          <div>
            <p>DOCUMENTARY ADVENTURE SYSTEM · V0.1.0</p>
            <h1 id={'adventure-journal-title'}>冒险日志</h1>
            <span>把现实中的成长，变成一段可以回看的旅途。</span>
          </div>
        </div>
        <div className={'journal-header-tools'}>
          <DiceBalance value={controller.diceBalance} />
          <button className={'journal-ledger-button'} type={'button'} onClick={() => setLedgerOpen(true)}>
            <ReceiptText size={18} aria-hidden={true} /> 查看骰子账本
          </button>
        </div>
      </header>
      <div className={'journal-tablist'} role={'tablist'} aria-label={'冒险日志视图'}>
        <button type={'button'} role={'tab'} aria-selected={controller.activeTab === 'journey'}
          aria-controls={'journal-journey-panel'} onClick={() => controller.setActiveTab('journey')}>
          <Map size={18} aria-hidden={true} />
          <span><strong>旅途</strong><small>JOURNEY</small></span>
        </button>
        <button type={'button'} role={'tab'} aria-selected={controller.activeTab === 'home'}
          aria-controls={'journal-home-panel'} onClick={() => controller.setActiveTab('home')}>
          <Home size={18} aria-hidden={true} />
          <span><strong>永久之家</strong><small>PERMANENT HOME</small></span>
        </button>
      </div>
      {controller.activeTab === 'journey' ? (
        <JourneyView route={controller.state.routeInvestments[0]}
          reducedMotion={controller.state.preferences.reducedMotion} onInvest={openInvestment} />
      ) : (
        <HomeView investments={controller.state.homeInvestments}
          reducedMotion={controller.state.preferences.reducedMotion} onInvest={openInvestment} />
      )}
      <InvestDialog open={activeInvestment !== null}
        targetName={activeInvestment ? TARGET_NAMES[activeInvestment.targetId] ?? activeInvestment.targetId : ''}
        balance={controller.diceBalance} remaining={remaining} externalError={investmentError}
        onClose={() => { setActiveInvestment(null); setInvestmentError(''); }} onConfirm={confirmInvestment} />
      <LedgerDialog open={ledgerOpen} transactions={controller.ledgerTransactions}
        onClose={() => setLedgerOpen(false)} />
    </section>
  );
}
