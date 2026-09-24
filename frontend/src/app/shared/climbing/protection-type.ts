import { AscentAttempt } from '../../api/model/ascentAttempt';
import { Route } from '../../api/model/route';

/**
 * backlog/118 — the attempt `safetyStyle` a route's `protectionType` suggests in the outdoor rope
 * napló: bolted → lead, trad / clean → trad, top-rope-only → toprope. Only a prefill: the climber may
 * still toprope a trad line or lead a route someone rigged, so the napló keeps the field editable.
 */
export function safetyStyleForProtection(
  protectionType: Route.ProtectionTypeEnum | null | undefined,
): AscentAttempt.SafetyStyleEnum | null {
  switch (protectionType) {
    case Route.ProtectionTypeEnum.Bolted:
      return AscentAttempt.SafetyStyleEnum.Lead;
    case Route.ProtectionTypeEnum.Trad:
    case Route.ProtectionTypeEnum.Clean:
      return AscentAttempt.SafetyStyleEnum.Trad;
    case Route.ProtectionTypeEnum.Toprope:
      return AscentAttempt.SafetyStyleEnum.Toprope;
    default:
      return null;
  }
}
