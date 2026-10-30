import { Routes } from '@angular/router';

import { SettingsPage } from './pages/settings/settings.page';
import { DashboardPage } from './pages/dashboard/dashboard.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'settings', component: SettingsPage, title: '⚙️ Settings' },
  { path: 'dashboard', component: DashboardPage, title: '📈 Dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
