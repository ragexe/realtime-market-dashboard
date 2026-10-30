import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';

import type { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import type { ProducerStatus } from '../../../domain/producer-status.model';
import { ImbalancePipe } from '../../shared/pipes/imbalance.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { QuantityPipe } from '../../shared/pipes/quantity.pipe';
import { RatioPipe } from '../../shared/pipes/ratio.pipe';
import { SpreadPipe } from '../../shared/pipes/spread.pipe';
import { VwapPipe } from '../../shared/pipes/vwap.pipe';
import { MarketDataService } from '../../core/market-data/market-data.service';

const MOCK_INSTRUMENTS: InstrumentSnapshot[] = [
  {
    symbol: 'AAPL',
    lastPriceCents: 10200,
    bidCents: 10196,
    askCents: 10200,
    bidQuantity: 600,
    askQuantity: 400,
    volume: 40,
    notionalCents: 406000,
  },
  {
    symbol: 'BA',
    lastPriceCents: null,
    bidCents: null,
    askCents: null,
    bidQuantity: null,
    askQuantity: null,
    volume: 0,
    notionalCents: 0,
  },
  {
    symbol: 'C',
    lastPriceCents: 5010,
    bidCents: 5005,
    askCents: 5010,
    bidQuantity: 0,
    askQuantity: 0,
    volume: 120,
    notionalCents: 601000,
  },
];

@Component({
  imports: [MatButton, PricePipe, QuantityPipe, RatioPipe, ImbalancePipe, SpreadPipe, VwapPipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly MarketDataService = inject(MarketDataService);
  protected readonly instruments: WritableSignal<InstrumentSnapshot[]> = signal([
    ...MOCK_INSTRUMENTS,
  ]);

  protected readonly status = signal<ProducerStatus | 'error' | 'starting'>('running');
  protected readonly runId = signal(1);
  protected readonly error = signal<string | null>(null);

  protected togglePause(): void {
    this.status.update((current) => (current === 'paused' ? 'running' : 'paused'));
  }
}
