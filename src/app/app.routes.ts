import { Routes } from '@angular/router';

import { Settings } from './pages/settings/settings';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'settings', component: Settings },
  { path: 'dashboard', component: Dashboard },
  { path: '**', redirectTo: 'dashboard' },
];
