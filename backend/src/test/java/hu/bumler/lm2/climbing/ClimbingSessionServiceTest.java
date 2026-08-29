package hu.bumler.lm2.climbing;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.AscentAttempt;
import hu.bumler.lm2.api.model.ClimbingSession;
import hu.bumler.lm2.api.model.PitchLog;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). Tree-diff over a real DB is covered by ClimbingSessionIntegrationTest. */
class ClimbingSessionServiceTest {

	private static final LocalDate DATE = LocalDate.parse("2026-08-29");

	private ClimbingSessionRepository repository;
	private AscentAttemptRepository attemptRepository;
	private PitchLogRepository pitchRepository;
	private ClimbingSessionService service;

	@BeforeEach
	void setUp() {
		repository = mock(ClimbingSessionRepository.class);
		attemptRepository = mock(AscentAttemptRepository.class);
		pitchRepository = mock(PitchLogRepository.class);
		service = new ClimbingSessionService(repository, attemptRepository, pitchRepository, new ClimbingSessionMapper(),
				new AscentAttemptMapper(), new PitchLogMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(attemptRepository.findBySessionIdIn(any())).thenReturn(List.of());
		when(pitchRepository.findByAttemptIdIn(any())).thenReturn(List.of());
		when(pitchRepository.findByAttemptId(any())).thenReturn(List.of());
	}

	private static ClimbingSessionEntity sessionEntity(UUID id, UUID userId) {
		ClimbingSessionEntity entity = new ClimbingSessionEntity(id, userId);
		entity.setDate(DATE);
		entity.setLocationType("OUTDOOR");
		entity.setDiscipline("ROPE");
		return entity;
	}

	private static AscentAttemptEntity attemptEntity(UUID id, UUID sessionId) {
		return new AscentAttemptEntity(id, sessionId);
	}

	private static PitchLogEntity pitchEntity(UUID id, UUID attemptId) {
		return new PitchLogEntity(id, attemptId);
	}

	private static ClimbingSession session(UUID id, List<AscentAttempt> attempts) {
		return new ClimbingSession(id, DATE, ClimbingSession.LocationTypeEnum.OUTDOOR, ClimbingSession.DisciplineEnum.ROPE,
				attempts, false);
	}

	private static AscentAttempt attempt(UUID id, UUID sessionId, int orderIndex, List<PitchLog> pitches) {
		return new AscentAttempt(id, sessionId, true, orderIndex, pitches, false);
	}

	private static PitchLog pitch(UUID id, UUID attemptId, int pitchNumber) {
		return new PitchLog(id, attemptId, pitchNumber, true, pitchNumber - 1, false);
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewSession_withAttemptAndPitchTree() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		UUID attemptId = UUID.randomUUID();
		UUID pitchId = UUID.randomUUID();
		when(repository.findById(sessionId)).thenReturn(Optional.empty());
		when(attemptRepository.findBySessionId(sessionId)).thenReturn(List.of());

		ClimbingSession dto = session(sessionId,
				List.of(attempt(attemptId, sessionId, 0, List.of(pitch(pitchId, attemptId, 1)))));
		dto.rockType("mészkő");
		ClimbingSession saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(sessionId);
		ArgumentCaptor<ClimbingSessionEntity> sessionCaptor = ArgumentCaptor.forClass(ClimbingSessionEntity.class);
		verify(repository).saveAndFlush(sessionCaptor.capture());
		assertThat(sessionCaptor.getValue().getUserId()).isEqualTo(userId);
		assertThat(sessionCaptor.getValue().getRockType()).isEqualTo("mészkő");

		ArgumentCaptor<AscentAttemptEntity> attemptCaptor = ArgumentCaptor.forClass(AscentAttemptEntity.class);
		verify(attemptRepository).save(attemptCaptor.capture());
		assertThat(attemptCaptor.getValue().getId()).isEqualTo(attemptId);
		assertThat(attemptCaptor.getValue().isSuccess()).isTrue();

		ArgumentCaptor<PitchLogEntity> pitchCaptor = ArgumentCaptor.forClass(PitchLogEntity.class);
		verify(pitchRepository).save(pitchCaptor.capture());
		assertThat(pitchCaptor.getValue().getId()).isEqualTo(pitchId);
		assertThat(pitchCaptor.getValue().getAttemptId()).isEqualTo(attemptId);
	}

	@Test
	void create_rejectsForeignSession_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		ClimbingSessionEntity existing = sessionEntity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, session(existing.getId(), List.of())))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update: tree diff ---

	@Test
	void update_addsAttempt_softDeletesMissingAttempt_andCascadesToItsPitches() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		ClimbingSessionEntity existing = sessionEntity(sessionId, userId);
		UUID keptAttemptId = UUID.randomUUID();
		UUID removedAttemptId = UUID.randomUUID();
		AscentAttemptEntity kept = attemptEntity(keptAttemptId, sessionId);
		AscentAttemptEntity removed = attemptEntity(removedAttemptId, sessionId);
		PitchLogEntity removedPitch = pitchEntity(UUID.randomUUID(), removedAttemptId);

		when(repository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(existing));
		when(attemptRepository.findBySessionId(sessionId)).thenReturn(List.of(kept, removed));
		when(pitchRepository.findByAttemptId(removedAttemptId)).thenReturn(List.of(removedPitch));

		UUID addedAttemptId = UUID.randomUUID();
		ClimbingSession dto = session(sessionId,
				List.of(attempt(keptAttemptId, sessionId, 0, List.of()), attempt(addedAttemptId, sessionId, 1, List.of())));
		service.update(userId, sessionId, dto);

		assertThat(removed.isDeleted()).isTrue();
		assertThat(removedPitch.isDeleted()).isTrue();
		ArgumentCaptor<AscentAttemptEntity> captor = ArgumentCaptor.forClass(AscentAttemptEntity.class);
		verify(attemptRepository, times(3)).save(captor.capture());
		assertThat(captor.getAllValues()).anySatisfy(a -> assertThat(a.getId()).isEqualTo(addedAttemptId));
	}

	@Test
	void update_revivesTombstonedPitch_whenItsIdReappearsInIncomingLiveList() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		UUID attemptId = UUID.randomUUID();
		ClimbingSessionEntity existing = sessionEntity(sessionId, userId);
		AscentAttemptEntity attemptEntity = attemptEntity(attemptId, sessionId);
		PitchLogEntity tombstonedPitch = pitchEntity(UUID.randomUUID(), attemptId);
		tombstonedPitch.softDelete();

		when(repository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(existing));
		when(attemptRepository.findBySessionId(sessionId)).thenReturn(List.of(attemptEntity));
		when(pitchRepository.findByAttemptId(attemptId)).thenReturn(List.of(tombstonedPitch));

		ClimbingSession dto = session(sessionId,
				List.of(attempt(attemptId, sessionId, 0, List.of(pitch(tombstonedPitch.getId(), attemptId, 1)))));
		service.update(userId, sessionId, dto);

		assertThat(tombstonedPitch.isDeleted()).isFalse();
		verify(pitchRepository).save(tombstonedPitch);
	}

	@Test
	void update_throwsEntityDeleted_whenSessionAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		ClimbingSessionEntity existing = sessionEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), session(existing.getId(), List.of())))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenSessionBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesSession_andCascadesToLiveAttemptsAndPitches() {
		UUID userId = UUID.randomUUID();
		ClimbingSessionEntity existing = sessionEntity(UUID.randomUUID(), userId);
		AscentAttemptEntity attempt = attemptEntity(UUID.randomUUID(), existing.getId());
		PitchLogEntity pitch = pitchEntity(UUID.randomUUID(), attempt.getId());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(attemptRepository.findBySessionIdAndDeletedFalse(existing.getId())).thenReturn(List.of(attempt));
		when(attemptRepository.findBySessionId(existing.getId())).thenReturn(List.of(attempt));
		when(pitchRepository.findByAttemptId(attempt.getId())).thenReturn(List.of(pitch));

		ClimbingSession deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(attempt.isDeleted()).isTrue();
		assertThat(pitch.isDeleted()).isTrue();
		verify(attemptRepository).save(attempt);
		verify(pitchRepository).save(pitch);
	}

	@Test
	void delete_isIdempotent_whenSessionAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		ClimbingSessionEntity existing = sessionEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(attemptRepository.findBySessionId(existing.getId())).thenReturn(List.of());

		ClimbingSession deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(attemptRepository, never()).findBySessionIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedSessionsForUser() {
		UUID userId = UUID.randomUUID();
		ClimbingSessionEntity s1 = sessionEntity(UUID.randomUUID(), userId);
		ClimbingSessionEntity s2 = sessionEntity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(userId)).thenReturn(List.of(s1, s2));

		List<ClimbingSession> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(ClimbingSession::getId).containsExactly(s1.getId(), s2.getId());
	}
}
