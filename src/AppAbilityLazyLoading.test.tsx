import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

it('loads the ability module only after the user opens ability', async () => {
  let abilityLoaded = false;
  vi.doMock('./ability/AbilityModule', () => {
    abilityLoaded = true;
    return { AbilityModule: () => <section aria-label="延迟能力模块">能力模块已加载</section> };
  });

  const { default: App } = await import('./App');
  expect(abilityLoaded).toBe(false);
  render(<App />);
  expect(abilityLoaded).toBe(false);

  fireEvent.click(screen.getByRole('button', { name: /能力属性/ }));
  await waitFor(() => expect(screen.getByLabelText('延迟能力模块')).toBeInTheDocument());
  expect(abilityLoaded).toBe(true);
});
