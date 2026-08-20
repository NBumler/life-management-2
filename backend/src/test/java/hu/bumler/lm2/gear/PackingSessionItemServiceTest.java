package hu.bumler.lm2.gear;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.PackingSessionItem;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class PackingSessionItemServiceTest {

	private PackingSessionItemRepository repository;
	private PackingSessionRepository sessionRepository;
	private GearItemRepository gearItemRepository;
	private PackingSessionItemService service;

	@BeforeEach
	void setUp() {
		repository = mock(PackingSessionItemRepository.class);
		sessionRepository = mock(PackingSessionRepository.class);
		gearItemRepository = mock(GearItemRepository.class);
		service = new PackingSessionItemService(repository, sessionRepository, gearItemRepository, new PackingSessionItemMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private static PackingSessionEntity session(UUID id, UUID userId) {
		return new PackingSessionEntity(id, userId);
	}

	private void ownGearItem(UUID userId, UUID gearItemId) {
		when(gearItemRepository.findByIdAndUserId(gearItemId, userId)).thenReturn(Optional.of(new GearItemEntity(gearItemId, userId)));
	}

	private static PackingSessionItem itemDto(UUID id, UUID sessionId, UUID gearId, PackingSessionItem.StatusEnum status, int sortOrder) {
		return new PackingSessionItem(id, sessionId, gearId, status, sortOrder, false);
	}

	// --- create ("extra eszköz" add) ---

	@Test
	void create_addsNewItem_whenSessionExistsOwnedAndLive() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity ownedSession = session(UUID.randomUUID(), userId);
		UUID id = UUID.randomUUID();
		UUID gearId = UUID.randomUUID();
		when(sessionRepository.findByIdAndUserId(ownedSession.getId(), userId)).thenReturn(Optional.of(ownedSession));
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findBySessionIdAndGearItemIdAndDeletedFalse(ownedSession.getId(), gearId)).thenReturn(Optional.empty());
		ownGearItem(userId, gearId);

		PackingSessionItem saved = service.create(userId, itemDto(id, ownedSession.getId(), gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 3));

		assertThat(saved.getGearItemId()).isEqualTo(gearId);
		assertThat(saved.getSortOrder()).isEqualTo(3);
	}

	@Test
	void create_throwsNotFound_whenSessionBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(sessionRepository.findByIdAndUserId(sessionId, attacker)).thenReturn(Optional.empty());

		PackingSessionItem dto = itemDto(id, sessionId, UUID.randomUUID(), PackingSessionItem.StatusEnum.NOT_PACKED, 0);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsEntityDeleted_whenSessionAlreadyClosed() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity closedSession = session(UUID.randomUUID(), userId);
		closedSession.softDelete();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(sessionRepository.findByIdAndUserId(closedSession.getId(), userId)).thenReturn(Optional.of(closedSession));

		PackingSessionItem dto = itemDto(id, closedSession.getId(), UUID.randomUUID(), PackingSessionItem.StatusEnum.NOT_PACKED, 0);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(EntityDeletedException.class);
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenGearItemAlreadyLiveOnSession() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity ownedSession = session(UUID.randomUUID(), userId);
		UUID gearId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		PackingSessionItemEntity conflict = new PackingSessionItemEntity(UUID.randomUUID(), userId, ownedSession.getId(), gearId, "PACKED", 0);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(sessionRepository.findByIdAndUserId(ownedSession.getId(), userId)).thenReturn(Optional.of(ownedSession));
		when(repository.findBySessionIdAndGearItemIdAndDeletedFalse(ownedSession.getId(), gearId)).thenReturn(Optional.of(conflict));
		ownGearItem(userId, gearId);

		PackingSessionItem dto = itemDto(id, ownedSession.getId(), gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0);

		assertThatThrownBy(() -> service.create(userId, dto))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("gearItemId");
					assertThat(uve.getConflictingId()).isEqualTo(conflict.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_rejectsNewItem_whenGearItemNotOwnedByCaller() {
		UUID userId = UUID.randomUUID();
		PackingSessionEntity ownedSession = session(UUID.randomUUID(), userId);
		UUID id = UUID.randomUUID();
		UUID foreignGearId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(sessionRepository.findByIdAndUserId(ownedSession.getId(), userId)).thenReturn(Optional.of(ownedSession));
		when(gearItemRepository.findByIdAndUserId(foreignGearId, userId)).thenReturn(Optional.empty());

		PackingSessionItem dto = itemDto(id, ownedSession.getId(), foreignGearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0);

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update (status / sortOrder change) ---

	@Test
	void update_appliesNewStatusAndSortOrder() {
		UUID userId = UUID.randomUUID();
		PackingSessionItemEntity existing = new PackingSessionItemEntity(UUID.randomUUID(), userId, UUID.randomUUID(), UUID.randomUUID(),
				"NOT_PACKED", 0);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		PackingSessionItem dto = itemDto(existing.getId(), existing.getSessionId(), existing.getGearItemId(), PackingSessionItem.StatusEnum.PACKED,
				5);
		PackingSessionItem updated = service.update(userId, existing.getId(), dto);

		assertThat(updated.getStatus()).isEqualTo(PackingSessionItem.StatusEnum.PACKED);
		assertThat(updated.getSortOrder()).isEqualTo(5);
	}

	@Test
	void update_throwsEntityDeleted_whenItemAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		PackingSessionItemEntity existing = new PackingSessionItemEntity(UUID.randomUUID(), userId, UUID.randomUUID(), UUID.randomUUID(),
				"NOT_PACKED", 0);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		PackingSessionItem dto = itemDto(existing.getId(), existing.getSessionId(), existing.getGearItemId(), PackingSessionItem.StatusEnum.PACKED,
				0);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto)).isInstanceOf(EntityDeletedException.class);
	}

	@Test
	void update_throwsNotFound_whenItemBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		PackingSessionItem dto = itemDto(id, UUID.randomUUID(), UUID.randomUUID(), PackingSessionItem.StatusEnum.PACKED, 0);

		assertThatThrownBy(() -> service.update(attacker, id, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenItemBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}
}
