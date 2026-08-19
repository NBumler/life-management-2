import { Routes } from '@angular/router';

import { authGuard } from './core/session/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'menu',
        children: [
          { path: '', loadComponent: () => import('./pages/menu/menu.page').then((m) => m.MenuPage) },
          { path: 'profile', loadComponent: () => import('./pages/menu/profile/profile.page').then((m) => m.ProfilePage) },
          { path: 'theme', loadComponent: () => import('./pages/menu/theme/theme.page').then((m) => m.ThemePage) },
          { path: 'language', loadComponent: () => import('./pages/menu/language/language.page').then((m) => m.LanguagePage) },
          { path: 'sync', loadComponent: () => import('./pages/menu/sync/sync.page').then((m) => m.SyncPage) },
          {
            path: 'gear',
            children: [
              { path: '', loadComponent: () => import('./pages/menu/gear/gear-check.page').then((m) => m.GearCheckPage) },
              { path: 'items', loadComponent: () => import('./pages/menu/gear/items/gear-items.page').then((m) => m.GearItemsPage) },
              {
                path: 'templates',
                children: [
                  {
                    path: '',
                    loadComponent: () => import('./pages/menu/gear/templates/packing-templates.page').then((m) => m.PackingTemplatesPage),
                  },
                  {
                    path: 'new',
                    loadComponent: () =>
                      import('./pages/menu/gear/templates/packing-template-editor.page').then((m) => m.PackingTemplateEditorPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/menu/gear/templates/packing-template-editor.page').then((m) => m.PackingTemplateEditorPage),
                  },
                ],
              },
            ],
          },
        ],
      },
      // documentation/Architektúra/Frontend.md "Login utáni default tab": Menü is the only enabled
      // tab until a feature flag turns Kaja/Edzés/Feladatok on.
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'tabs', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs' },
];
