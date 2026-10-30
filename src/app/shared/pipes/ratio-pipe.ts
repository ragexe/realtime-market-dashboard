import { Pipe, PipeTransform } from '@angular/core';

import { formatSignedRatio } from '../../domain/numeric-formatters.utils';

@Pipe({ name: 'ratio', pure: true })
export class RatioPipe implements PipeTransform {
  transform(ratio: number | null): string {
    return formatSignedRatio(ratio);
  }
}
