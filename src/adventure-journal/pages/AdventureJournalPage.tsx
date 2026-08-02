import { Home, Map, ReceiptText, Waves } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { V0_1_TARGETS } from '../content/v0_1';
import { DiceBalance } from '../components/DiceBalance';
import { InvestDialog } from '../components/InvestDialog';
import { LedgerDialog } from '../components/LedgerDialog';
import type { InvestmentProgress } from '../domain/types';
import { ADVENTURE_DISPLAY_VERSION } from '../moduleVersion';
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
  const [liveMessage, setLiveMessage] = useState('');
  const remaining = activeInvestment ? activeInvestment.price - activeInvestment.invested : 0;

  function openInvestment(target: InvestmentProgress) {
    setActiveInvestment(target);
    setInvestmentError(controller.diceBalance > 0 ? '' : '骰子余额不足，还差 1 枚');
  }

  function confirmInvestment(amount: number) {
    if (!activeInvestment) return;
    try {
      controller.invest(activeInvestment.targetType, activeInvestment.targetId, amount);
      const percent = Math.round(((activeInvestment.invested + amount) / activeInvestment.price) * 100);
      const name = TARGET_NAMES[activeInvestment.targetId] ?? activeInvestment.targetId;
      setLiveMessage(activeInvestment.targetType === 'route'
        ? `路线推进到 ${percent}%`
        : `${name}建设到 ${percent}%`);
      setActiveInvestment(null);
      setInvestmentError('');
    } catch (error) {
      setInvestmentError(messageOf(error));
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextTab: 'journey' | 'home' | null = null;
    if (event.key === 'ArrowRight') nextTab = controller.activeTab === 'journey' ? 'home' : 'journey';
    if (event.key === 'ArrowLeft') nextTab = controller.activeTab === 'journey' ? 'home' : 'journey';
    if (event.key === 'Home') nextTab = 'journey';
    if (event.key === 'End') nextTab = 'home';
    if (!nextTab) return;

    event.preventDefault();
    controller.setActiveTab(nextTab);
    document.getElementById(`journal-${nextTab}-tab`)?.focus();
  }

  return (
    <section className={'adventure-journal'} aria-labelledby={'adventure-journal-title'}>
      <header className={'journal-page-header'}>
        <div className={'journal-title-lockup'}>
          <div><p>ADVENTURE JOURNAL · V{ADVENTURE_DISPLAY_VERSION}</p><h1 id={'adventure-journal-title'}>冒险日志</h1></div>
        </div>
        <div className={'journal-header-tools'}>
          <DiceBalance value={controller.diceBalance} />
          <button
            className={'journal-motion-button'}
            type={'button'}
            aria-label={controller.state.preferences.reducedMotion ? '恢复动态' : '减少动态'}
            aria-pressed={controller.state.preferences.reducedMotion}
            title={controller.state.preferences.reducedMotion ? '恢复动态' : '减少动态'}
            onClick={() => controller.setReducedMotion(!controller.state.preferences.reducedMotion)}
          >
            <Waves size={18} aria-hidden={true} />
            {controller.state.preferences.reducedMotion ? '恢复动态' : '减少动态'}
          </button>
          <button className={'journal-ledger-button'} type={'button'} onClick={() => setLedgerOpen(true)}>
            <ReceiptText size={18} aria-hidden={true} /> 查看骰子账本
          </button>
        </div>
      </header>
      <p className="journal-live-message" role="status" aria-live="polite">{liveMessage}</p>
      <div className={'journal-tablist'} role={'tablist'} aria-label={'冒险日志视图'}>
        <button id={'journal-journey-tab'} type={'button'} role={'tab'} aria-selected={controller.activeTab === 'journey'}
          aria-controls={'journal-journey-panel'} tabIndex={controller.activeTab === 'journey' ? 0 : -1}
          onKeyDown={handleTabKeyDown} onClick={() => controller.setActiveTab('journey')}>
          <Map size={18} aria-hidden={true} />
          <span><strong>旅途</strong><small>JOURNEY</small></span>
        </button>
        <button id={'journal-home-tab'} type={'button'} role={'tab'} aria-selected={controller.activeTab === 'home'}
          aria-controls={'journal-home-panel'} tabIndex={controller.activeTab === 'home' ? 0 : -1}
          onKeyDown={handleTabKeyDown} onClick={() => controller.setActiveTab('home')}>
          <Home size={18} aria-hidden={true} />
          <span><strong>永久之家</strong><small>PERMANENT HOME</small></span>
        </button>
      </div>
      {controller.activeTab === 'journey' ? (
        <JourneyView route={controller.state.routeInvestments[0]}
          reducedMotion={controller.state.preferences.reducedMotion}
          arrived={controller.state.unlockedMapIds.includes('map-wind-valley')}
          onInvest={openInvestment}
          onDepart={() => {
            controller.completeRoute('route-wind-valley');
            setLiveMessage('抵达风过山谷，发现山谷风铃');
          }}
          onGoHome={() => controller.setActiveTab('home')} />
      ) : (
        <HomeView investments={controller.state.homeInvestments}
          reducedMotion={controller.state.preferences.reducedMotion}
          hasWindValleyDiscovery={controller.state.unlockedMapIds.includes('map-wind-valley')}
          onInvest={openInvestment} />
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
