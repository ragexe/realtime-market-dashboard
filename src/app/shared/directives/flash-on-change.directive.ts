import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { prefersReducedMotion } from './prefers-reduced-motion.utils';

export type FlashMode = 'direction' | 'change';

const FLASH_COLORS = {
  up: 'var(--positive)',
  down: 'var(--negative)',
  change: 'var(--mat-sys-primary)',
} as const;

@Directive({ selector: '[appFlashOnChange]' })
export class FlashOnChangeDirective {
  readonly appFlashOnChange = input.required<number | null>();
  readonly flashMode = input<FlashMode>('direction');

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private previous: number | null = null;

  constructor() {
    effect(() => {
      const current = this.appFlashOnChange();
      const previous = this.previous;
      this.previous = current;

      if (previous === null || current === null || current === previous) return;

      this.flash(this.colorFor(current, previous));
    });
  }

  private colorFor(current: number, previous: number): string {
    if (this.flashMode() === 'change') return FLASH_COLORS.change;

    return current > previous ? FLASH_COLORS.up : FLASH_COLORS.down;
  }

  private flash(color: string): void {
    if (prefersReducedMotion()) return;

    this.element.animate(
      [
        { backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` },
        { backgroundColor: 'transparent' },
      ],
      { duration: 800, easing: 'ease-out' },
    );
  }
}
