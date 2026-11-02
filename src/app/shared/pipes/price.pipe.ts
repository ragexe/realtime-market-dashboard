import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

import { formatPriceCents } from '../../../domain/numeric-formatters.utils';

@Pipe({ name: 'price', pure: true })
export class PricePipe implements PipeTransform {
  transform(cents: number | null): string {
    return formatPriceCents(cents);
  }
}
