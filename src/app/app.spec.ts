import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render navigation links to both pages', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('nav a'),
    );

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/dashboard', '/settings']);
  });

  it('should render a router outlet for page content', () => {
    const fixture = TestBed.createComponent(App);
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
  });
});
