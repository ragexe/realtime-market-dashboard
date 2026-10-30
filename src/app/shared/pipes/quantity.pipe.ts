import { Pipe, PipeTransform } from '@angular/core';

import { formatQuantity } from '../../../domain/numeric-formatters.utils';

@Pipe({ name: 'quantity', pure: true })
export class QuantityPipe implements PipeTransform {
  transform(quantity: number): string {
    return formatQuantity(quantity);
  }
}
