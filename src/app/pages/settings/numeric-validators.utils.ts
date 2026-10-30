import { AbstractControl, ValidationErrors } from '@angular/forms';

// TODO: Add test
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') return null;

  return Number.isInteger(value) ? null : { integer: true };
}
