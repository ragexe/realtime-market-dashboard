import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';

import { MarketDataService } from '../../core/market-data/market-data.service';
import { FlashOnChangeDirective } from '../../shared/directives/flash-on-change.directive';
import { ImbalancePipe } from '../../shared/pipes/imbalance.pipe';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { QuantityPipe } from '../../shared/pipes/quantity.pipe';
import { RatioPipe } from '../../shared/pipes/ratio.pipe';
import { SpreadPipe } from '../../shared/pipes/spread.pipe';
import { VwapPipe } from '../../shared/pipes/vwap.pipe';

@Component({
  imports: [
    MatButton,
    PricePipe,
    QuantityPipe,
    RatioPipe,
    ImbalancePipe,
    SpreadPipe,
    VwapPipe,
    FlashOnChangeDirective,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly marketDataService = inject(MarketDataService);

  protected readonly instruments = this.marketDataService.instruments;
  protected readonly runId = this.marketDataService.runId;
  protected readonly status = this.marketDataService.status;
  protected readonly error = this.marketDataService.error;

  protected togglePause(): void {
    switch (this.status()) {
      case 'running':
        this.marketDataService.pauseWorker();
        return;

      case 'paused':
        this.marketDataService.resumeWorker();
        return;

      case 'starting':
      case 'error':
        return;
    }
  }
}
