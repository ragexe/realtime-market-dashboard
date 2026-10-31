import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlashOnChangeDirective, type FlashMode } from './flash-on-change.directive';

@Component({
  imports: [FlashOnChangeDirective],
  template: `<span [appFlashOnChange]="value()" [flashMode]="mode()"></span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly value = signal<number | null>(null);
  readonly mode = signal<FlashMode>('direction');
}

describe('FlashOnChangeDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let animate: ReturnType<typeof vi.fn>;

  async function setValue(value: number | null): Promise<void> {
    fixture.componentInstance.value.set(value);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);

    // jsdom has no Web Animations API
    animate = vi.fn();
    const element: HTMLElement = fixture.nativeElement.querySelector('span');
    Object.defineProperty(element, 'animate', { value: animate });

    await fixture.whenStable();
  });

  function flashedColor(): string {
    const [keyframes] = animate.mock.lastCall as [Keyframe[]];
    return String(keyframes[0]['backgroundColor']);
  }

  it('does not flash for the first value', async () => {
    await setValue(100);

    expect(animate).not.toHaveBeenCalled();
  });

  it('flashes positive color when the value goes up', async () => {
    await setValue(100);
    await setValue(101);

    expect(animate).toHaveBeenCalledTimes(1);
    expect(flashedColor()).toContain('var(--positive)');
  });

  it('flashes negative color when the value goes down', async () => {
    await setValue(100);
    await setValue(99);

    expect(flashedColor()).toContain('var(--negative)');
  });

  it('does not flash when the value is unchanged', async () => {
    await setValue(100);
    await setValue(100);

    expect(animate).not.toHaveBeenCalled();
  });

  it('does not flash when the value becomes unavailable or reappears', async () => {
    await setValue(100);
    await setValue(null);
    await setValue(100);

    expect(animate).not.toHaveBeenCalled();
  });

  it('uses one neutral color in change mode', async () => {
    fixture.componentInstance.mode.set('change');
    await setValue(100);
    await setValue(99);

    expect(flashedColor()).toContain('var(--mat-sys-primary)');
  });
});
