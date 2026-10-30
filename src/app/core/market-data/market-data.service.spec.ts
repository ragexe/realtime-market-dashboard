import { TestBed } from '@angular/core/testing';

import { MarketDataService } from './market-data.service';
import { MARKET_WORKER_FACTORY } from './market-worker';
import { FakeMarketWorker } from './testing/fake-market-worker';

let fakeMarketWorker: FakeMarketWorker;

beforeEach(() => {
  fakeMarketWorker = new FakeMarketWorker();

  TestBed.configureTestingModule({
    providers: [{ provide: MARKET_WORKER_FACTORY, useValue: () => fakeMarketWorker }],
  });
});

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MarketDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
