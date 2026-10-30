import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { map } from 'rxjs';

import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from '../../../domain/producer-settings.const';
import { ProducerSettings } from '../../../domain/producer-settings.model';
import { integerValidator } from './numeric-validators.utils';

const FIELDS = [
  { key: 'instrumentCount', label: 'Instrument count', hint: 'Number of fictional instruments' },
  { key: 'updatesPerBatch', label: 'Updates per batch', hint: 'Total updates in each batch' },
  { key: 'batchIntervalMs', label: 'Batch interval, ms', hint: 'Requested time between batches' },
] as const satisfies { key: keyof ProducerSettings; label: string; hint: string }[];

@Component({
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatButton,
    MatSlider,
    MatSliderThumb,
    DecimalPipe,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly appliedSettings = signal<ProducerSettings>(DEFAULT_SETTINGS);
  protected readonly fields = FIELDS;
  protected readonly limits = SETTINGS_LIMITS;

  protected readonly form = this.formBuilder.group({
    instrumentCount: [
      this.appliedSettings().instrumentCount,
      [
        Validators.required,
        Validators.min(this.limits['instrumentCount'].min),
        Validators.max(this.limits['instrumentCount'].max),
        integerValidator,
      ],
    ],

    updatesPerBatch: [
      this.appliedSettings().updatesPerBatch,
      [
        Validators.required,
        Validators.min(this.limits['updatesPerBatch'].min),
        Validators.max(this.limits['updatesPerBatch'].max),
        integerValidator,
      ],
    ],

    batchIntervalMs: [
      this.appliedSettings().batchIntervalMs,
      [
        Validators.required,
        Validators.min(this.limits['batchIntervalMs'].min),
        Validators.max(this.limits['batchIntervalMs'].max),
        integerValidator,
      ],
    ],
  });

  protected readonly nominalRate = toSignal(
    this.form.valueChanges.pipe(map(() => this.computeNominalRate())),
    { initialValue: this.computeNominalRate() },
  );

  protected apply(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.appliedSettings.set(this.form.getRawValue());
  }

  private computeNominalRate(): number | null {
    if (this.form.invalid) return null;

    const { updatesPerBatch, batchIntervalMs } = this.form.getRawValue();

    return (updatesPerBatch * 1000) / batchIntervalMs;
  }
}
