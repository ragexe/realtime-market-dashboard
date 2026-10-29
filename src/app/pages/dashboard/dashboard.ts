import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';

import { InstrumentSnapshot } from '../../domain/instrument-snapshot.model';

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
  selector: 'app-dashboard',
  imports: [MatButton],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly instruments: WritableSignal<InstrumentSnapshot[]> = signal([
    ...MOCK_INSTRUMENTS,
  ]);

  protected readonly status = signal<'starting' | 'running' | 'paused' | 'error'>('running'); // TODO: Move to type
  protected readonly runId = signal(1);
  protected readonly error = signal<string | null>(null);

  protected togglePause(): void {
    this.status.update((current) => (current === 'paused' ? 'running' : 'paused'));
  }
}
