import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { MARKET_WORKER_FACTORY } from '../../core/market-data/market-worker.utils';
import { FakeMarketWorker } from '../../core/market-data/testing/fake-market-worker';
import { DashboardPage } from './dashboard.page';

describe('Dashboard', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let worker: FakeMarketWorker;
  let host: HTMLElement;

  beforeEach(async () => {
    worker = new FakeMarketWorker();

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: MARKET_WORKER_FACTORY, useValue: () => worker }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    host = fixture.nativeElement;
    await fixture.whenStable();
  });

  function rows(): NodeListOf<HTMLTableRowElement> {
    return host.querySelectorAll('tbody tr');
  }

  it('shows a placeholder row per instrument before the first snapshot', () => {
    expect(rows()).toHaveLength(5);
    expect(rows()[0].textContent).toContain('ALPH');
  });

  it('shows only the error, without rows, when the producer fails', async () => {
    worker.emit({ type: 'error', runId: 1, message: 'Market generator failed to load (HTTP 404)' });
    await fixture.whenStable();

    expect(rows()).toHaveLength(0);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('HTTP 404');
  });
});
