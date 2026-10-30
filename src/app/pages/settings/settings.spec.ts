import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Settings } from './settings';

type FieldKey = 'instrumentCount' | 'updatesPerBatch' | 'batchIntervalMs';

const FIELD_ORDER = [
  'instrumentCount',
  'updatesPerBatch',
  'batchIntervalMs',
] as const satisfies FieldKey[];

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    host = fixture.nativeElement;
    await fixture.whenStable();
  });

  function input(key: FieldKey): HTMLInputElement {
    const inputs = host.querySelectorAll<HTMLInputElement>('input[type="number"]');

    return inputs[FIELD_ORDER.indexOf(key)];
  }

  function errorText(key: FieldKey): string | undefined {
    const fields = host.querySelectorAll('mat-form-field');

    return fields[FIELD_ORDER.indexOf(key)].querySelector('mat-error')?.textContent?.trim();
  }

  async function type(key: FieldKey, value: string): Promise<void> {
    const element = input(key);
    element.value = value;
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(new Event('blur'));

    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    await fixture.whenStable();
  }

  function appliedSettings() {
    return component['appliedSettings']();
  }

  it('starts with the default settings', () => {
    expect(input('instrumentCount').value).toBe('5');
    expect(input('updatesPerBatch').value).toBe('100');
    expect(input('batchIntervalMs').value).toBe('500');
    expect(component['form'].valid).toBe(true);
  });

  it('shows the nominal rate across all instruments', () => {
    expect(host.querySelector('.rate')?.textContent).toContain('200');
  });

  describe('validation', () => {
    const limits: Record<FieldKey, { min: number; max: number }> = {
      instrumentCount: { min: 1, max: 50 },
      updatesPerBatch: { min: 1, max: 1000 },
      batchIntervalMs: { min: 50, max: 2000 },
    };

    describe.each(FIELD_ORDER)('%s', (key) => {
      const { min, max } = limits[key];

      it.each([min, max])('accepts boundary value %i', async (value) => {
        await type(key, String(value));

        expect(component['form'].controls[key].valid).toBe(true);
        expect(errorText(key)).toBeUndefined();
      });

      it.each([min - 1, max + 1])('rejects out-of-range value %i', async (value) => {
        await type(key, String(value));

        expect(component['form'].controls[key].hasError(value < min ? 'min' : 'max')).toBe(true);
        expect(errorText(key)).toBe(`Allowed range: ${min}–${max}`);
      });

      it('rejects a fractional value', async () => {
        await type(key, String(min + 0.5));

        expect(component['form'].controls[key].hasError('integer')).toBe(true);
        expect(errorText(key)).toBe('Must be a whole number');
      });

      it('rejects an empty value', async () => {
        await type(key, '');

        expect(component['form'].controls[key].hasError('required')).toBe(true);
        expect(errorText(key)).toBe('Required');
      });
    });
  });

  describe('apply', () => {
    it('does not affect applied settings while editing', async () => {
      await type('instrumentCount', '20');

      expect(appliedSettings().instrumentCount).toBe(5);
    });

    it('applies valid settings on submit', async () => {
      await type('instrumentCount', '20');
      await type('updatesPerBatch', '1000');
      await type('batchIntervalMs', '50');
      await submit();

      expect(appliedSettings()).toEqual({
        instrumentCount: 20,
        updatesPerBatch: 1000,
        batchIntervalMs: 50,
      });
    });

    it('keeps previous settings and reveals errors when the form is invalid', async () => {
      input('updatesPerBatch').value = '0';
      input('updatesPerBatch').dispatchEvent(new Event('input'));

      await fixture.whenStable();

      expect(errorText('updatesPerBatch')).toBeUndefined();

      await submit();

      expect(appliedSettings().updatesPerBatch).toBe(100);
      expect(errorText('updatesPerBatch')).toBe('Allowed range: 1–1000');
    });
  });
});
