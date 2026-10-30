import { Pipe, PipeTransform } from '@angular/core';

import { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { vwapCents } from '../../../domain/metric-evaluators.utils';

@Pipe({ name: 'vwap', pure: true })
export class VwapPipe implements PipeTransform {
  transform(snapshot: Pick<InstrumentSnapshot, 'notionalCents' | 'volume'>): number | null {
    return vwapCents(snapshot);
  }
}
