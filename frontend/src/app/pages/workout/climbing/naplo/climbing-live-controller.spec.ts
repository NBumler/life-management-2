import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { formatElapsed, fromLocalInputValue, liveDraftToSession, liveDurationMinutes, toLocalInputValue } from './climbing-live-controller';

describe('climbing live controller helpers (backlog/122)', () => {
  it('liveDurationMinutes rounds to whole minutes, never below 1', () => {
    expect(liveDurationMinutes(0, 90 * 60_000)).toBe(90);
    expect(liveDurationMinutes(0, 89.6 * 60_000)).toBe(90);
    expect(liveDurationMinutes(0, 10_000)).toBe(1);
  });

  it('formatElapsed renders mm:ss, with hours when needed', () => {
    expect(formatElapsed(65_000)).toBe('01:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-5)).toBe('00:00');
  });

  it('datetime-local values round-trip on the local calendar', () => {
    const ms = new Date(2026, 8, 24, 17, 5).getTime();
    expect(toLocalInputValue(ms)).toBe('2026-09-24T17:05');
    expect(fromLocalInputValue('2026-09-24T17:05')).toBe(ms);
    expect(fromLocalInputValue('')).toBeNull();
    expect(fromLocalInputValue('nonsense')).toBeNull();
  });

  it('liveDraftToSession turns the persisted draft back into a loadable ClimbingSession', () => {
    const draft = {
      id: 's1',
      date: '2026-09-24',
      locationType: 'INDOOR',
      discipline: 'ROPE',
      attempts: [{ id: 'a1', orderIndex: 0, isSuccess: true, pitches: [{ id: 'p1', pitchNumber: 1, isLead: true, orderIndex: 0 }] }],
    } as unknown as ClimbingSessionDraft;

    const session = liveDraftToSession(draft);
    expect(session.deleted).toBeFalse();
    expect(session.attempts[0].sessionId).toBe('s1');
    expect(session.attempts[0].deleted).toBeFalse();
    expect(session.attempts[0].pitches[0].attemptId).toBe('a1');
  });
});
