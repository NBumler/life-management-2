import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { HouseholdTask } from '../../../api/model/householdTask';
import { HouseholdRoomRepository } from '../../../core/data/household-room.repository';
import { HouseholdTaskRepository } from '../../../core/data/household-task.repository';
import { matchesSearch } from '../../../shared/text-search';
import { groupHouseholdTasks, householdTaskLagDays } from './household-sections';

/** documentation/Subfeatures/Háztartási feladatok.md: hub tile list — Lejárt/Ma/Később, filters (ÉS), search, checkbox = pipálás. */
@Component({
  selector: 'app-household-task-list',
  templateUrl: 'household-task-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonInput,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdTaskListPage implements OnInit {
  private readonly taskRepository = inject(HouseholdTaskRepository);
  readonly roomRepository = inject(HouseholdRoomRepository);

  readonly EnergyLevelEnum = HouseholdTask.EnergyLevelEnum;
  readonly query = signal('');
  readonly roomFilter = signal<string | null>(null);
  readonly energyFilter = signal<HouseholdTask.EnergyLevelEnum | null>(null);
  readonly maxMinutesFilter = signal<number | null>(null);
  private readonly today = new Date().toISOString().slice(0, 10);

  private readonly roomNameById = computed(() => new Map(this.roomRepository.items().map((room) => [room.id, room.name])));

  private readonly filteredTasks = computed(() => {
    const query = this.query();
    const room = this.roomFilter();
    const energy = this.energyFilter();
    const maxMinutes = this.maxMinutesFilter();
    return this.taskRepository.items().filter((task) => {
      if (room !== null && task.roomId !== room) {
        return false;
      }
      if (energy !== null && task.energyLevel !== energy) {
        return false;
      }
      if (maxMinutes !== null && task.estimatedMinutes > maxMinutes) {
        return false;
      }
      const roomName = this.roomNameById().get(task.roomId) ?? '';
      return matchesSearch(query, task.name) || matchesSearch(query, roomName);
    });
  });

  readonly sections = computed(() => groupHouseholdTasks(this.filteredTasks(), this.roomRepository.items(), this.today));
  readonly isEmpty = computed(() => this.taskRepository.items().length === 0);
  readonly hasNoResults = computed(() => !this.isEmpty() && this.filteredTasks().length === 0);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.taskRepository.load(), this.roomRepository.load()]);
  }

  roomName(task: HouseholdTask): string {
    return this.roomNameById().get(task.roomId) ?? '';
  }

  isOverdue(task: HouseholdTask): boolean {
    return task.nextDue < this.today;
  }

  lagDays(task: HouseholdTask): number {
    return householdTaskLagDays(task.nextDue, this.today);
  }

  async complete(task: HouseholdTask): Promise<void> {
    await this.taskRepository.complete(task, this.today, new Date().toISOString());
  }
}
