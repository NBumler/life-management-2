package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.GearItem;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class GearItemServiceTest {

	private GearItemRepository repository;
	private GearItemService service;

	@BeforeEach
	void setUp() {
		repository = mock(GearItemRepository.class);
		service = new GearItemService(repository, new GearItemMapper());
	}

	private static GearItemEntity entity(UUID id, UUID userId) {
		GearItemEntity entity = new GearItemEntity(id, userId);
		entity.rename("Kötél", "kötél");
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewItem_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		GearItem dto = new GearItem(id, "Bundazsák", false);
		GearItem saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Bundazsák");

		ArgumentCaptor<GearItemEntity> captor = ArgumentCaptor.forClass(GearItemEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getNameNormalized()).isEqualTo("bundazsák");
	}

	@Test
	void create_updatesOwnExistingItem_whenIdBelongsToCallingUser() {
		UUID userId = UUID.randomUUID();
		GearItemEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		GearItem dto = new GearItem(existing.getId(), "Fejlámpa", false);
		GearItem saved = service.create(userId, dto);

		assertThat(saved.getName()).isEqualTo("Fejlámpa");
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void create_rejectsForeignItem_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		GearItemEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		GearItem dto = new GearItem(existing.getId(), "Kötél", false);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenNameAlreadyLiveForUser() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		GearItemEntity conflict = entity(UUID.randomUUID(), userId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "kötél")).thenReturn(Optional.of(conflict));

		GearItem dto = new GearItem(id, "Kötél", false);

		assertThatThrownBy(() -> service.create(userId, dto))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("name");
					assertThat(uve.getConflictingId()).isEqualTo(conflict.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_allowsKeepingItsOwnName_whenRenamingToTheSameValue() {
		// The uniqueness check must exclude the entity being saved from its own conflict search.
		UUID userId = UUID.randomUUID();
		GearItemEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "kötél")).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		GearItem dto = new GearItem(existing.getId(), "Kötél", false);
		GearItem saved = service.update(userId, existing.getId(), dto);

		assertThat(saved.getName()).isEqualTo("Kötél");
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenItemBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update ---

	@Test
	void update_throwsEntityDeleted_whenItemAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		GearItemEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		GearItem dto = new GearItem(existing.getId(), "Kötél", false);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenItemNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		GearItemEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		GearItem deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenItemAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		GearItemEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		GearItem deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedItemsForUser() {
		UUID userId = UUID.randomUUID();
		GearItemEntity e1 = entity(UUID.randomUUID(), userId);
		GearItemEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<GearItem> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(GearItem::getId).containsExactly(e1.getId(), e2.getId());
	}
}
