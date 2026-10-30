import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { map } from 'rxjs';

// TODO: Move to model?
interface ProducerSettings {
  /**
   * Total updates in each batch
   */
  instrumentCount: number;

  /**
   * Total updates in each batch
   */
  updatesPerBatch: number;

  /**
   * Requested batches interval in millis
   */
  batchIntervalMs: number;
}

// TODO: Move to domain?
const DEFAULT_SETTINGS = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
} as const satisfies ProducerSettings;

const FIELDS = [
  { key: 'instrumentCount', label: 'Instrument count', hint: 'Number of fictional instruments' },
  { key: 'updatesPerBatch', label: 'Updates per batch', hint: 'Total updates in each batch' },
  { key: 'batchIntervalMs', label: 'Batch interval, ms', hint: 'Requested time between batches' },
] as const satisfies { key: keyof typeof DEFAULT_SETTINGS; label: string; hint: string }[];

// TODO: Move to domain
const LIMITS = {
  instrumentCount: { min: 1, max: 50 },
  updatesPerBatch: { min: 1, max: 1000 },
  batchIntervalMs: { min: 50, max: 2000 },
} as const satisfies Record<
  keyof typeof DEFAULT_SETTINGS,
  {
    min: number;
    max: number;
  }
>;

function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') return null;

  return Number.isInteger(value) ? null : { integer: true };
}

@Component({
  selector: 'app-settings',
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
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly appliedSettings = signal<ProducerSettings>(DEFAULT_SETTINGS);
  protected readonly fields = FIELDS;
  protected readonly limits = LIMITS;

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
