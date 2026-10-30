import { Pipe, PipeTransform } from '@angular/core';

import { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { imbalance } from '../../../domain/metric-evaluators.utils';

@Pipe({ name: 'imbalance', pure: true })
export class ImbalancePipe implements PipeTransform {
  transform(snapshot: Pick<InstrumentSnapshot, 'bidQuantity' | 'askQuantity'>): number | null {
    return imbalance(snapshot);
  }
}
