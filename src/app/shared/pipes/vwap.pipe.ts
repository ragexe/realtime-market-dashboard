import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

import type { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { vwapCents } from '../../../domain/metric-evaluators.utils';

@Pipe({ name: 'vwap', pure: true })
export class VwapPipe implements PipeTransform {
  transform(snapshot: Pick<InstrumentSnapshot, 'notionalCents' | 'volume'>): number | null {
    return vwapCents(snapshot);
  }
}
