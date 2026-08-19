package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.PackingSession;
import hu.bumler.lm2.api.model.PackingSessionDetail;
import hu.bumler.lm2.api.model.PackingSessionItem;
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

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class PackingSessionServiceTest {

	private PackingSessionRepository repository;
	private PackingSessionItemRepository itemRepository;
	private PackingSessionService service;

	@BeforeEach
	void setUp() {
		repository = mock(PackingSessionRepository.class);
		itemRepository = mock(PackingSessionItemRepository.class);
		service = new PackingSessionService(repository, itemRepository, new PackingSessionMapper(), new PackingSessionItemMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private static PackingSessionEntity session(UUID id, UUID userId) {
		return new PackingSessionEntity(id, userId);
	}

	// --- create (nested, idempotent upsert) ---

	@Test
	void create_insertsSessionAndItsInitialItems_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		UUID templateId = UUID.randomUUID();
		UUID gearId = UUID.randomUUID();
		when(repository.findById(sessionId)).thenReturn(Optional.empty());
		when(itemRepository.findById(any())).thenReturn(Optional.empty());
		when(itemRepository.findBySessionId(sessionId)).thenReturn(List.of());

		PackingSessionItem itemDto = new PackingSessionItem(UUID.randomUUID(), sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false);
		PackingSessionDetail dto = new PackingSessionDetail(sessionId, false, List.of(itemDto)).destination("Tátra")
				.sourceTemplateIds(List.of(templateId));

		PackingSessionDetail saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(sessionId);
		ArgumentCaptor<PackingSessionEntity> sessionCaptor = ArgumentCaptor.forClass(PackingSessionEntity.class);
		verify(repository).saveAndFlush(sessionCaptor.capture());
		assertThat(sessionCaptor.getValue().getDestination()).isEqualTo("Tátra");
		assertThat(sessionCaptor.getValue().getSourceTemplateIds()).containsExactly(templateId);

		ArgumentCaptor<PackingSessionItemEntity> itemCaptor = ArgumentCaptor.forClass(PackingSessionItemEntity.class);
		verify(itemRepository).save(itemCaptor.capture());
		assertThat(itemCaptor.getValue().getGearItemId()).isEqualTo(gearId);
		assertThat(itemCaptor.getValue().getStatus()).isEqualTo("NOT_PACKED");
	}

	@Test
	void create_rejectsForeignSession_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		PackingSessionEntity existing = session(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		PackingSessionDetail dto = new PackingSessionDetail(existing.getId(), false, List.of());

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update (session-level fields only) ---

	@Test
	void update_appliesDestinationOnly_leavingItemsUntouched() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity existing = session(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		PackingSession dto = new PackingSession(existing.getId(), false).destination("Kőszikla");
		PackingSession updated = service.update(userId, existing.getId(), dto);

		assertThat(updated.getDestination().orElse(null)).isEqualTo("Kőszikla");
		verify(itemRepository, never()).save(any());
	}

	@Test
	void update_throwsEntityDeleted_whenSessionAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity existing = session(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		PackingSession dto = new PackingSession(existing.getId(), false).destination("X");

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto)).isInstanceOf(EntityDeletedException.class);
	}

	@Test
	void update_throwsNotFound_whenSessionBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		PackingSession dto = new PackingSession(id, false);

		assertThatThrownBy(() -> service.update(attacker, id, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenSessionBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent — "Lezárás") ---

	@Test
	void delete_softDeletesSessionAndCascadesToLiveItems() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity existing = session(UUID.randomUUID(), userId);
		PackingSessionItemEntity liveItem = new PackingSessionItemEntity(UUID.randomUUID(), userId, existing.getId(), UUID.randomUUID(),
				"PACKED", 0);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findBySessionIdAndDeletedFalse(existing.getId())).thenReturn(List.of(liveItem));

		PackingSession deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(liveItem.isDeleted()).isTrue();
		verify(itemRepository).save(liveItem);
	}

	@Test
	void delete_isIdempotent_whenSessionAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity existing = session(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		PackingSession deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(itemRepository, never()).findBySessionIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedSessionsForUser() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity s1 = session(UUID.randomUUID(), userId);
		PackingSessionEntity s2 = session(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)).thenReturn(List.of(s1, s2));

		List<PackingSession> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(PackingSession::getId).containsExactly(s1.getId(), s2.getId());
	}
}
