package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.HouseholdRoom;
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
class HouseholdRoomServiceTest {

	private HouseholdRoomRepository repository;
	private HouseholdTaskRepository taskRepository;
	private HouseholdRoomService service;

	@BeforeEach
	void setUp() {
		repository = mock(HouseholdRoomRepository.class);
		taskRepository = mock(HouseholdTaskRepository.class);
		when(taskRepository.findByRoomIdAndUserIdAndDeletedFalse(any(), any())).thenReturn(List.of());
		service = new HouseholdRoomService(repository, taskRepository, new HouseholdRoomMapper());
	}

	private static HouseholdRoomEntity entity(UUID id, UUID userId) {
		HouseholdRoomEntity entity = new HouseholdRoomEntity(id, userId);
		entity.rename("Konyha", "konyha");
		entity.setSortOrder(0);
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewRoom_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdRoom dto = new HouseholdRoom(id, "Fürdő", 0, false);
		HouseholdRoom saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Fürdő");

		ArgumentCaptor<HouseholdRoomEntity> captor = ArgumentCaptor.forClass(HouseholdRoomEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getNameNormalized()).isEqualTo("fürdő");
	}

	@Test
	void create_rejectsForeignRoom_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		HouseholdRoomEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		HouseholdRoom dto = new HouseholdRoom(existing.getId(), "Konyha", 0, false);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenNameAlreadyLiveForUser() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		HouseholdRoomEntity conflict = entity(UUID.randomUUID(), userId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "konyha")).thenReturn(Optional.of(conflict));

		HouseholdRoom dto = new HouseholdRoom(id, "Konyha", 0, false);

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
		UUID userId = UUID.randomUUID();
		HouseholdRoomEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "konyha")).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdRoom dto = new HouseholdRoom(existing.getId(), "Konyha", 1, false);
		HouseholdRoom saved = service.update(userId, existing.getId(), dto);

		assertThat(saved.getName()).isEqualTo("Konyha");
		assertThat(saved.getSortOrder()).isEqualTo(1);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenRoomBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update ---

	@Test
	void update_throwsEntityDeleted_whenRoomAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		HouseholdRoomEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		HouseholdRoom dto = new HouseholdRoom(existing.getId(), "Konyha", 0, false);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- delete (soft, idempotent, cascades to tasks) ---

	@Test
	void delete_softDeletes_whenRoomNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		HouseholdRoomEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdRoom deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_cascadesToLiveTasksInTheRoom() {
		UUID userId = UUID.randomUUID();
		HouseholdRoomEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		HouseholdTaskEntity task = new HouseholdTaskEntity(UUID.randomUUID(), userId);
		when(taskRepository.findByRoomIdAndUserIdAndDeletedFalse(existing.getId(), userId)).thenReturn(List.of(task));

		service.delete(userId, existing.getId());

		assertThat(task.isDeleted()).isTrue();
		verify(taskRepository).save(task);
	}

	@Test
	void delete_isIdempotent_whenRoomAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		HouseholdRoomEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		HouseholdRoom deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedRoomsForUser() {
		UUID userId = UUID.randomUUID();
		HouseholdRoomEntity e1 = entity(UUID.randomUUID(), userId);
		HouseholdRoomEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderBySortOrderAsc(userId)).thenReturn(List.of(e1, e2));

		List<HouseholdRoom> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(HouseholdRoom::getId).containsExactly(e1.getId(), e2.getId());
	}
}
