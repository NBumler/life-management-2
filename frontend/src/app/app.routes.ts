import { Routes } from '@angular/router';

import { featureFlagGuard } from './core/config/feature-flag.guard';
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
            path: 'shopping',
            children: [
              { path: '', loadComponent: () => import('./pages/menu/shopping/shopping-lists.page').then((m) => m.ShoppingListsPage) },
              { path: 'new', loadComponent: () => import('./pages/menu/shopping/shopping-list-editor.page').then((m) => m.ShoppingListEditorPage) },
              { path: 'history', loadComponent: () => import('./pages/menu/shopping/shopping-history.page').then((m) => m.ShoppingHistoryPage) },
              { path: 'history/:id', loadComponent: () => import('./pages/menu/shopping/shopping-history-detail.page').then((m) => m.ShoppingHistoryDetailPage) },
              { path: ':id/complete', loadComponent: () => import('./pages/menu/shopping/shopping-list-complete.page').then((m) => m.ShoppingListCompletePage) },
              { path: ':id', loadComponent: () => import('./pages/menu/shopping/shopping-list-editor.page').then((m) => m.ShoppingListEditorPage) },
            ],
          },
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
          {
            // documentation/Features/Pénzügyek.md — Menü → Pénzügyek hub + két gyerek. Egy flag; a
            // gyerek route-ok is guardoltak (a spec "gyerek route-ok nem elérhetők" elvárása szerint).
            path: 'finance',
            canActivate: [featureFlagGuard('menu.penzugyek')],
            children: [
              {
                path: 'net-pay',
                loadComponent: () => import('./pages/menu/finance/net-pay.page').then((m) => m.NetPayPage),
              },
              {
                path: 'recurring-expenses',
                children: [
                  {
                    path: '',
                    loadComponent: () =>
                      import('./pages/menu/finance/recurring-expense-list.page').then((m) => m.RecurringExpenseListPage),
                  },
                  {
                    path: 'new',
                    loadComponent: () =>
                      import('./pages/menu/finance/recurring-expense-edit.page').then((m) => m.RecurringExpenseEditPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/menu/finance/recurring-expense-edit.page').then((m) => m.RecurringExpenseEditPage),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'tasks',
        canActivate: [featureFlagGuard('tab.feladatok')],
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
        // segmented hub, not built as an actual hub component — this redirect + the ion-segment on each
        // list page (food-list.page.html / storage-list.page.html / recipe-list.page.html /
        // meal-dashboard.page.html / kaja-stats.page.html) is the lightweight stand-in, now covering
        // all five segments, landing on Étkezés first per the spec's eventual segment order.
        path: 'food',
        canActivate: [featureFlagGuard('tab.kaja')],
        children: [
          { path: '', redirectTo: 'meal', pathMatch: 'full' },
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
          {
            path: 'meal',
            children: [
              { path: '', loadComponent: () => import('./pages/food/meal/meal-dashboard.page').then((m) => m.MealDashboardPage) },
              { path: 'new', loadComponent: () => import('./pages/food/meal/meal-edit.page').then((m) => m.MealEditPage) },
              { path: ':id', loadComponent: () => import('./pages/food/meal/meal-edit.page').then((m) => m.MealEditPage) },
            ],
          },
          {
            path: 'stats',
            children: [{ path: '', loadComponent: () => import('./pages/food/stats/kaja-stats.page').then((m) => m.KajaStatsPage) }],
          },
        ],
      },
      {
        // documentation/Features/Edzés.md: the tab root is the Edzésnapló | Heti terv | Mászás | Úszás
        // | Bicikli top segment (documentation/Architektúra/Frontend.md route map). Only `log` exists
        // as of the tab-scaffold commit; the flagged segments' routes are added by their own slices.
        path: 'workout',
        canActivate: [featureFlagGuard('tab.edzes')],
        children: [
          { path: '', redirectTo: 'log', pathMatch: 'full' },
          {
            path: 'log',
            children: [
              { path: '', loadComponent: () => import('./pages/workout/log/workout-log-list.page').then((m) => m.WorkoutLogListPage) },
              { path: 'active', loadComponent: () => import('./pages/workout/log/active-workout.page').then((m) => m.ActiveWorkoutPage) },
              { path: 'new', loadComponent: () => import('./pages/workout/log/workout-session-edit.page').then((m) => m.WorkoutSessionEditPage) },
              { path: ':id', loadComponent: () => import('./pages/workout/log/workout-session-edit.page').then((m) => m.WorkoutSessionEditPage) },
            ],
          },
          {
            // documentation/Subfeatures/Heti terv.md: the "Heti terv" segment lands on the 7-day
            // dashboard; the static-template catalog (list + nested editor) is a sub-route off it.
            path: 'weekly-plan',
            canActivate: [featureFlagGuard('edzes.hetiTerv')],
            children: [
              { path: '', loadComponent: () => import('./pages/workout/weekly-plan/weekly-plan.page').then((m) => m.WeeklyPlanPage) },
              {
                path: 'plans',
                children: [
                  { path: '', loadComponent: () => import('./pages/workout/plan/plan-list.page').then((m) => m.PlanListPage) },
                  { path: 'new', loadComponent: () => import('./pages/workout/plan/plan-edit.page').then((m) => m.PlanEditPage) },
                  { path: ':id', loadComponent: () => import('./pages/workout/plan/plan-edit.page').then((m) => m.PlanEditPage) },
                ],
              },
            ],
          },
          {
            // documentation/Features/Mászónapló.md: the "Mászás" segment — a hub with 4 context
            // tiles (Indoor/Outdoor × Boulder/Kötél), each opening its own napló flow. Only the hub
            // exists as of the M1 scaffold; the per-context logs, stats and venue-admin routes are
            // added by later Mászónapló slices.
            path: 'climbing',
            canActivate: [featureFlagGuard('edzes.maszonaplo')],
            children: [
              { path: '', loadComponent: () => import('./pages/workout/climbing/climbing-hub.page').then((m) => m.ClimbingHubPage) },
              {
                // documentation/Features/Mászónapló.md "Statisztikák (2.0 scope)" (Mászónapló M8) —
                // per-context max grade / total volume / success-rate breakdown (all-time) plus a
                // 30 / 90 / 365-day grade pyramid. Reached from the hub header chart button.
                path: 'stats',
                loadComponent: () => import('./pages/workout/climbing/stats/climbing-stats.page').then((m) => m.ClimbingStatsPage),
              },
              {
                // documentation/Features/Mászónapló.md "Terem / Helyszín Admin" — venue master CRUD.
                // M3a wires the Indoor tree (Gym + colour bands + optional indoor routes); the Outdoor
                // tree (Crag → Sector → Route | BoulderProblem) is added by M3b.
                path: 'admin',
                children: [
                  { path: '', loadComponent: () => import('./pages/workout/climbing/admin/climbing-admin.page').then((m) => m.ClimbingAdminPage) },
                  {
                    // documentation/Subfeatures/Outdoor boulder admin.md + Outdoor köteles admin.md
                    // (M3b): the shared location tree Crag -> Sector -> (Route | BoulderProblem).
                    // Fully-qualified leaf paths (no empty-path children) so every editor reads all of
                    // its ancestor ids straight from its own paramMap, with no inheritance-strategy
                    // subtlety across the two nesting levels.
                    path: 'crags',
                    children: [
                      { path: '', loadComponent: () => import('./pages/workout/climbing/admin/crag-list.page').then((m) => m.CragListPage) },
                      { path: 'new', loadComponent: () => import('./pages/workout/climbing/admin/crag-edit.page').then((m) => m.CragEditPage) },
                      { path: ':cragId', loadComponent: () => import('./pages/workout/climbing/admin/crag-edit.page').then((m) => m.CragEditPage) },
                      {
                        path: ':cragId/sectors/new',
                        loadComponent: () => import('./pages/workout/climbing/admin/sector-edit.page').then((m) => m.SectorEditPage),
                      },
                      {
                        path: ':cragId/sectors/:sectorId',
                        loadComponent: () => import('./pages/workout/climbing/admin/sector-edit.page').then((m) => m.SectorEditPage),
                      },
                      {
                        path: ':cragId/sectors/:sectorId/routes/new',
                        loadComponent: () => import('./pages/workout/climbing/admin/route-edit.page').then((m) => m.RouteEditPage),
                      },
                      {
                        path: ':cragId/sectors/:sectorId/routes/:routeId',
                        loadComponent: () => import('./pages/workout/climbing/admin/route-edit.page').then((m) => m.RouteEditPage),
                      },
                      {
                        path: ':cragId/sectors/:sectorId/problems/new',
                        loadComponent: () => import('./pages/workout/climbing/admin/boulder-problem-edit.page').then((m) => m.BoulderProblemEditPage),
                      },
                      {
                        path: ':cragId/sectors/:sectorId/problems/:problemId',
                        loadComponent: () => import('./pages/workout/climbing/admin/boulder-problem-edit.page').then((m) => m.BoulderProblemEditPage),
                      },
                    ],
                  },
                  {
                    path: 'gyms',
                    children: [
                      { path: '', loadComponent: () => import('./pages/workout/climbing/admin/gym-list.page').then((m) => m.GymListPage) },
                      { path: 'new', loadComponent: () => import('./pages/workout/climbing/admin/gym-edit.page').then((m) => m.GymEditPage) },
                      {
                        path: ':gymId',
                        children: [
                          { path: '', loadComponent: () => import('./pages/workout/climbing/admin/gym-edit.page').then((m) => m.GymEditPage) },
                          {
                            path: 'bands/new',
                            loadComponent: () => import('./pages/workout/climbing/admin/gym-color-band-edit.page').then((m) => m.GymColorBandEditPage),
                          },
                          {
                            path: 'bands/:id',
                            loadComponent: () => import('./pages/workout/climbing/admin/gym-color-band-edit.page').then((m) => m.GymColorBandEditPage),
                          },
                          {
                            path: 'routes/new',
                            loadComponent: () => import('./pages/workout/climbing/admin/indoor-route-edit.page').then((m) => m.IndoorRouteEditPage),
                          },
                          {
                            path: 'routes/:id',
                            loadComponent: () => import('./pages/workout/climbing/admin/indoor-route-edit.page').then((m) => m.IndoorRouteEditPage),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                // documentation/Subfeatures/Indoor boulder napló.md (Mászónapló M4) — the reference
                // kontextus-napló: a per-context session list + create/edit form. Context is fixed
                // by the route (`data.contextKey`), not a form field. M5 adds indoor-rope, M6
                // outdoor-boulder, M7 outdoor-rope.
                path: 'indoor-boulder',
                children: [
                  {
                    path: '',
                    data: { contextKey: 'indoor-boulder' },
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/climbing-session-list.page').then((m) => m.ClimbingSessionListPage),
                  },
                  {
                    path: 'new',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/indoor-boulder-session-edit.page').then((m) => m.IndoorBoulderSessionEditPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/indoor-boulder-session-edit.page').then((m) => m.IndoorBoulderSessionEditPage),
                  },
                ],
              },
              {
                // documentation/Subfeatures/Indoor köteles napló.md (Mászónapló M5) — the INDOOR + ROPE
                // kontextus-napló. Same shared list page (`data.contextKey`), its own edit form
                // (safety chip, grade parser, wall-height length default, no colour bands, no pitches).
                path: 'indoor-rope',
                children: [
                  {
                    path: '',
                    data: { contextKey: 'indoor-rope' },
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/climbing-session-list.page').then((m) => m.ClimbingSessionListPage),
                  },
                  {
                    path: 'new',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/indoor-rope-session-edit.page').then((m) => m.IndoorRopeSessionEditPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/indoor-rope-session-edit.page').then((m) => m.IndoorRopeSessionEditPage),
                  },
                ],
              },
              {
                // documentation/Subfeatures/Outdoor boulder napló.md (Mászónapló M6) — the OUTDOOR +
                // BOULDER kontextus-napló. Same shared list page (`data.contextKey`), its own edit
                // form (crag + sector location picker, optional master BoulderProblem or ad-hoc name
                // with "save to catalog", session-level rockType, sector-inherited aspect, weather
                // chip; no colour bands, no pitches).
                path: 'outdoor-boulder',
                children: [
                  {
                    path: '',
                    data: { contextKey: 'outdoor-boulder' },
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/climbing-session-list.page').then((m) => m.ClimbingSessionListPage),
                  },
                  {
                    path: 'new',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/outdoor-boulder-session-edit.page').then((m) => m.OutdoorBoulderSessionEditPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/outdoor-boulder-session-edit.page').then((m) => m.OutdoorBoulderSessionEditPage),
                  },
                ],
              },
              {
                // documentation/Subfeatures/Outdoor köteles napló.md (Mászónapló M7) — the OUTDOOR +
                // ROPE kontextus-napló, the last of the four. Same shared list page
                // (`data.contextKey`), its own edit form: the outdoor crag + sector picker (snapshot
                // names, session-level rockType / aspect, weather chip, optional master Route or
                // ad-hoc name with "save to catalog") + the rope grade parser, TOPROPE|LEAD|TRAD
                // safety chip, length + failure point, and an optional per-attempt PitchLog editor.
                path: 'outdoor-rope',
                children: [
                  {
                    path: '',
                    data: { contextKey: 'outdoor-rope' },
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/climbing-session-list.page').then((m) => m.ClimbingSessionListPage),
                  },
                  {
                    path: 'new',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/outdoor-rope-session-edit.page').then((m) => m.OutdoorRopeSessionEditPage),
                  },
                  {
                    path: ':id',
                    loadComponent: () =>
                      import('./pages/workout/climbing/naplo/outdoor-rope-session-edit.page').then((m) => m.OutdoorRopeSessionEditPage),
                  },
                ],
              },
            ],
          },
          {
            // documentation/Features/Úszás napló.md: the "Úszás" segment — flat swim-session CRUD
            // (list / create / edit). Mirrors the `log` sub-tree's shape.
            path: 'swimming',
            canActivate: [featureFlagGuard('edzes.uszas')],
            children: [
              { path: '', loadComponent: () => import('./pages/workout/swimming/swim-log-list.page').then((m) => m.SwimLogListPage) },
              { path: 'new', loadComponent: () => import('./pages/workout/swimming/swim-log-edit.page').then((m) => m.SwimLogEditPage) },
              { path: ':id', loadComponent: () => import('./pages/workout/swimming/swim-log-edit.page').then((m) => m.SwimLogEditPage) },
            ],
          },
          {
            // documentation/Features/Biciklizés napló.md: the "Bicikli" segment — flat bike-ride CRUD
            // (list / create / edit). Mirrors the swim slice's shape.
            path: 'cycling',
            canActivate: [featureFlagGuard('edzes.bicikli')],
            children: [
              { path: '', loadComponent: () => import('./pages/workout/cycling/bike-ride-log-list.page').then((m) => m.BikeRideLogListPage) },
              { path: 'new', loadComponent: () => import('./pages/workout/cycling/bike-ride-log-edit.page').then((m) => m.BikeRideLogEditPage) },
              { path: ':id', loadComponent: () => import('./pages/workout/cycling/bike-ride-log-edit.page').then((m) => m.BikeRideLogEditPage) },
            ],
          },
          {
            // documentation/Features/Edzés.md: Gyakorlat törzsadat opens from the workout header
            // (fogaskerék), not a segment. Gated by tab.edzes along with the rest of the tab.
            path: 'exercises',
            children: [
              { path: '', loadComponent: () => import('./pages/workout/exercises/exercise-list.page').then((m) => m.ExerciseListPage) },
              { path: 'new', loadComponent: () => import('./pages/workout/exercises/exercise-edit.page').then((m) => m.ExerciseEditPage) },
              { path: ':id', loadComponent: () => import('./pages/workout/exercises/exercise-edit.page').then((m) => m.ExerciseEditPage) },
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
