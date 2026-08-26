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
              {
                path: 'sessions',
                children: [
                  {
                    path: '',
                    loadComponent: () => import('./pages/menu/gear/sessions/packing-sessions.page').then((m) => m.PackingSessionsPage),
                  },
                  {
                    path: 'start',
                    loadComponent: () =>
                      import('./pages/menu/gear/sessions/packing-session-start.page').then((m) => m.PackingSessionStartPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/menu/gear/sessions/packing-session-detail.page').then((m) => m.PackingSessionDetailPage),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'tasks',
        children: [
          { path: '', loadComponent: () => import('./pages/tasks/tennivalok-hub.page').then((m) => m.TennivalokHubPage) },
          {
            path: 'life-plans',
            children: [
              { path: '', loadComponent: () => import('./pages/tasks/life-plans/life-plan-list.page').then((m) => m.LifePlanListPage) },
              { path: 'new', loadComponent: () => import('./pages/tasks/life-plans/life-plan-edit.page').then((m) => m.LifePlanEditPage) },
              { path: ':id', loadComponent: () => import('./pages/tasks/life-plans/life-plan-edit.page').then((m) => m.LifePlanEditPage) },
            ],
          },
          {
            path: 'household',
            children: [
              { path: '', loadComponent: () => import('./pages/tasks/household/household-task-list.page').then((m) => m.HouseholdTaskListPage) },
              { path: 'new', loadComponent: () => import('./pages/tasks/household/household-task-edit.page').then((m) => m.HouseholdTaskEditPage) },
              { path: 'rooms', loadComponent: () => import('./pages/tasks/household/household-room-manager.page').then((m) => m.HouseholdRoomManagerPage) },
              { path: ':id', loadComponent: () => import('./pages/tasks/household/household-task-edit.page').then((m) => m.HouseholdTaskEditPage) },
            ],
          },
          {
            path: 'events',
            children: [
              { path: '', loadComponent: () => import('./pages/tasks/events/event-list.page').then((m) => m.EventListPage) },
              { path: 'new', loadComponent: () => import('./pages/tasks/events/event-edit.page').then((m) => m.EventEditPage) },
              { path: ':id', loadComponent: () => import('./pages/tasks/events/event-edit.page').then((m) => m.EventEditPage) },
            ],
          },
          {
            path: 'calendar',
            children: [
              { path: '', loadComponent: () => import('./pages/tasks/calendar/calendar-month.page').then((m) => m.CalendarMonthPage) },
              { path: ':date', loadComponent: () => import('./pages/tasks/calendar/calendar-day.page').then((m) => m.CalendarDayPage) },
            ],
          },
        ],
      },
      {
        // documentation/Features/Kaja.md: the tab's real root is the Étkezés|Tárolás|Katalógus|Recept|Stat
        // segmented hub, not built yet (`tab.kaja` stays off until that full core segment set exists —
        // see Frontend.md's flag registry). Until then this redirect + the ion-segment on each list page
        // (food-list.page.html / storage-list.page.html / recipe-list.page.html) is the lightweight
        // stand-in for the three segments that do exist so far (Katalógus, Tárolás, Recept).
        path: 'food',
        children: [
          { path: '', redirectTo: 'catalog', pathMatch: 'full' },
          {
            path: 'catalog',
            children: [
              { path: '', loadComponent: () => import('./pages/food/catalog/food-list.page').then((m) => m.FoodListPage) },
              { path: 'new', loadComponent: () => import('./pages/food/catalog/food-edit.page').then((m) => m.FoodEditPage) },
              { path: 'import', loadComponent: () => import('./pages/food/catalog/food-import.page').then((m) => m.FoodImportPage) },
              { path: ':id', loadComponent: () => import('./pages/food/catalog/food-edit.page').then((m) => m.FoodEditPage) },
            ],
          },
          {
            path: 'storage',
            children: [
              { path: '', loadComponent: () => import('./pages/food/storage/storage-list.page').then((m) => m.StorageListPage) },
              { path: 'new', loadComponent: () => import('./pages/food/storage/storage-edit.page').then((m) => m.StorageEditPage) },
              { path: ':id', loadComponent: () => import('./pages/food/storage/storage-edit.page').then((m) => m.StorageEditPage) },
            ],
          },
          {
            path: 'recipe',
            children: [
              { path: '', loadComponent: () => import('./pages/food/recipe/recipe-list.page').then((m) => m.RecipeListPage) },
              { path: 'new', loadComponent: () => import('./pages/food/recipe/recipe-edit.page').then((m) => m.RecipeEditPage) },
              { path: ':id', loadComponent: () => import('./pages/food/recipe/recipe-edit.page').then((m) => m.RecipeEditPage) },
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
