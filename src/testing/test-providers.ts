import { Provider } from '@angular/core';
import { FakeMarketWorker } from '../app/core/market-data/testing/fake-market-worker';
import { MARKET_WORKER_FACTORY } from '../app/core/market-data/market-worker';

const providers: Provider[] = [
  { provide: MARKET_WORKER_FACTORY, useValue: () => new FakeMarketWorker() },
];

export default providers;
