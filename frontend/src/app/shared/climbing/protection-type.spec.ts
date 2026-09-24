import { AscentAttempt } from '../../api/model/ascentAttempt';
import { Route } from '../../api/model/route';
import { safetyStyleForProtection } from './protection-type';

describe('safetyStyleForProtection (backlog/118)', () => {
  it('maps every protection type to the suggested attempt safety style', () => {
    expect(safetyStyleForProtection(Route.ProtectionTypeEnum.Bolted)).toBe(AscentAttempt.SafetyStyleEnum.Lead);
    expect(safetyStyleForProtection(Route.ProtectionTypeEnum.Trad)).toBe(AscentAttempt.SafetyStyleEnum.Trad);
    expect(safetyStyleForProtection(Route.ProtectionTypeEnum.Clean)).toBe(AscentAttempt.SafetyStyleEnum.Trad);
    expect(safetyStyleForProtection(Route.ProtectionTypeEnum.Toprope)).toBe(AscentAttempt.SafetyStyleEnum.Toprope);
  });

  it('suggests nothing when the route has no protection type', () => {
    expect(safetyStyleForProtection(null)).toBeNull();
    expect(safetyStyleForProtection(undefined)).toBeNull();
  });
});
