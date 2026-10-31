import { Subject } from 'rxjs';

import type { WorkerAction } from '../../../../domain/worker-action.model';
import type { WorkerEvent } from '../../../../domain/worker-event.model';
import type { MarketWorker } from '../market-worker.utils';

export class FakeMarketWorker implements MarketWorker {
  private readonly eventsSubject = new Subject<WorkerEvent>();
  private readonly failuresSubject = new Subject<string>();

  readonly posted: WorkerAction[] = [];
  readonly events$ = this.eventsSubject.asObservable();
  readonly failures$ = this.failuresSubject.asObservable();

  terminated = false;

  post(action: WorkerAction): void {
    this.posted.push(action);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(event: WorkerEvent): void {
    this.eventsSubject.next(event);
  }

  fail(message: string): void {
    this.failuresSubject.next(message);
  }
}
