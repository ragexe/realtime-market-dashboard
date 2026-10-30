import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

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
  instrumentCount: 42,
  updatesPerBatch: 42,
  batchIntervalMs: 42,
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
    instrumentCount: [this.appliedSettings().instrumentCount, []],
    updatesPerBatch: [this.appliedSettings().updatesPerBatch, []],
    batchIntervalMs: [this.appliedSettings().batchIntervalMs, []],
  });

  protected apply(): void {
    // TODO: tbd
  }
}
