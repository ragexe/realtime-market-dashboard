import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';

import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MarketDataService } from '../../core/market-data/market-data.service';
import { ImbalancePipe } from '../../shared/pipes/imbalance.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { QuantityPipe } from '../../shared/pipes/quantity.pipe';
import { RatioPipe } from '../../shared/pipes/ratio.pipe';
import { SpreadPipe } from '../../shared/pipes/spread.pipe';
import { VwapPipe } from '../../shared/pipes/vwap.pipe';

@Component({
  imports: [MatButton, PricePipe, QuantityPipe, RatioPipe, ImbalancePipe, SpreadPipe, VwapPipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly marketDataService = inject(MarketDataService);

  protected readonly instruments = toSignal(
    this.marketDataService.instrumentsStore$.pipe(map(({ instruments }) => instruments)),
  );

  protected readonly runId = toSignal(
    this.marketDataService.runId$,
  );

  protected readonly status = toSignal(
    this.marketDataService.statusStore$.pipe(map(({ status }) => status)),
  );

  protected readonly error = toSignal(
    this.marketDataService.statusStore$.pipe(
      map((status) => {
        if ('message' in status) return status.message;

        return null;
      }),
    ),
  );

  protected togglePause(): void {
    switch (this.status()) {
      case 'running':
        this.marketDataService.pause();
        return;

      case 'paused':
        this.marketDataService.resume();
        return;

      case 'starting':
      case 'error':
      case 'idle':
        return;
    }
  }
}
