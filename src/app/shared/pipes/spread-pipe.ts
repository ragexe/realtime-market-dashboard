import { Pipe, PipeTransform } from '@angular/core';

import { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { spreadCents } from '../../../domain/metric-evaluators.utils';

@Pipe({ name: 'spread', pure: true })
export class SpreadPipe implements PipeTransform {
  transform(snapshot: Pick<InstrumentSnapshot, 'askCents' | 'bidCents'>): number | null {
    return spreadCents(snapshot);
  }
}
