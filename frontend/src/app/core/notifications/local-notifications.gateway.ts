import { Injectable } from '@angular/core';
import { LocalNotifications, PermissionStatus, PendingResult, ScheduleOptions, Channel } from '@capacitor/local-notifications';
import { PluginListenerHandle } from '@capacitor/core';

/**
 * Thin injectable wrapper over `@capacitor/local-notifications`. Exists for the same reason as
 * `core/health/HealthConnectStepSource`: Capacitor's `registerPlugin` returns a Proxy whose methods
 * can't be `spyOn`-ed, so the scheduler can only be unit-tested against a seam like this one. No
 * logic here — every method forwards straight to the plugin.
 */
@Injectable({ providedIn: 'root' })
export class LocalNotificationsGateway {
  checkPermissions(): Promise<PermissionStatus> {
    return LocalNotifications.checkPermissions();
  }

  requestPermissions(): Promise<PermissionStatus> {
    return LocalNotifications.requestPermissions();
  }

  schedule(options: ScheduleOptions): Promise<void> {
    return LocalNotifications.schedule(options).then(() => undefined);
  }

  cancelIds(ids: number[]): Promise<void> {
    return LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  }

  getPending(): Promise<PendingResult> {
    return LocalNotifications.getPending();
  }

  createChannel(channel: Channel): Promise<void> {
    return LocalNotifications.createChannel(channel);
  }

  addActionPerformedListener(handler: (route: string | undefined) => void): Promise<PluginListenerHandle> {
    return LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      handler((action.notification.extra as { route?: string } | undefined)?.route);
    });
  }
}
