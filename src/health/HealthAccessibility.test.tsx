import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { HealthModule } from './HealthModule';

async function expectNoBlocking(container: HTMLElement) {
  const results=await axe.run(container,{rules:{'color-contrast':{enabled:false}}});
  expect(results.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>v.id)).toEqual([]);
}
describe('HealthModule accessibility gate',()=>{
  beforeEach(()=>window.localStorage.clear());
  it('has no serious or critical issues on the dashboard and each section',async()=>{
    const {container}=render(<main id="main-content"><HealthModule/></main>);
    await expectNoBlocking(container);
    for(const name of ['身体状态','饮食记录','日常健康','运动健身']){
      fireEvent.click(screen.getByRole('button',{name:new RegExp(name)}));
      await expectNoBlocking(container);
      fireEvent.click(screen.getByRole('button',{name:'返回健康首页'}));
    }
  });
});
