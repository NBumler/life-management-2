import { ActionSheetController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

/**
 * The ⋮ menu on an exercise row of the workout editors (plan-edit, workout-session-edit,
 * active-workout): Move up / Move down / Remove. On a ~360 px phone the three inline buttons took
 * half the row and wrapped the exercise name, so they live in an action sheet instead.
 */
export async function presentExerciseActions(
  sheets: ActionSheetController,
  translate: TranslateService,
  options: { header: string; isFirst: boolean; isLast: boolean; move: (delta: -1 | 1) => void; remove: () => void },
): Promise<void> {
  const sheet = await sheets.create({
    header: options.header,
    buttons: [
      ...(options.isFirst ? [] : [{ text: translate.instant('COMMON.MOVE_UP'), handler: () => options.move(-1) }]),
      ...(options.isLast ? [] : [{ text: translate.instant('COMMON.MOVE_DOWN'), handler: () => options.move(1) }]),
      { text: translate.instant('COMMON.REMOVE'), role: 'destructive', handler: () => options.remove() },
      { text: translate.instant('COMMON.CANCEL'), role: 'cancel' },
    ],
  });
  await sheet.present();
}
