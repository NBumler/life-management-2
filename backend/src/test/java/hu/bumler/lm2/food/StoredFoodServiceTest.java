package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.StoredFood;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class StoredFoodServiceTest {

	private StoredFoodRepository repository;
	private FoodRepository foodRepository;
	private StoredFoodService service;

	@BeforeEach
	void setUp() {
		repository = mock(StoredFoodRepository.class);
		foodRepository = mock(FoodRepository.class);
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		service = new StoredFoodService(repository, foodRepository, new StoredFoodMapper());
	}

	private static FoodEntity liveFood(UUID id) {
		FoodEntity food = new FoodEntity(id);
		food.rename("Tej", "tej");
		return food;
	}

	private static StoredFoodEntity entity(UUID id, UUID userId) {
		StoredFoodEntity entity = new StoredFoodEntity(id, userId);
		entity.setFoodId(UUID.randomUUID());
		entity.setQuantity(BigDecimal.ONE, "l");
		entity.setStorageLocation("FRIDGE");
		entity.setExpiresOn(LocalDate.of(2026, 9, 1));
		return entity;
	}

	private static StoredFood dto(UUID id, UUID foodId) {
		return new StoredFood(id, foodId, BigDecimal.ONE, "l", StoredFood.StorageLocationEnum.FRIDGE, LocalDate.of(2026, 9, 1), false, false);
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewStoredFood_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(liveFood(foodId)));

		StoredFood saved = service.create(userId, dto(id, foodId));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getFoodId()).isEqualTo(foodId);
		assertThat(saved.getStorageLocation()).isEqualTo(StoredFood.StorageLocationEnum.FRIDGE);
	}

	@Test
	void create_throwsNotFound_whenFoodIdDoesNotExist() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(foodRepository.findById(foodId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(userId, dto(id, foodId))).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsNotFound_whenFoodIsDeleted() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		FoodEntity deletedFood = liveFood(foodId);
		deletedFood.softDelete();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(deletedFood));

		assertThatThrownBy(() -> service.create(userId, dto(id, foodId))).isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void create_rejectsForeignItem_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		StoredFoodEntity existing = new StoredFoodEntity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), foodId))).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update ---

	@Test
	void update_appliesOpenedFlagAndRecomputedExpiry_asSentByTheClient() {
		// documentation/Subfeatures/Élelmiszer tárolás.md "Felbontás": the client recomputes and sends
		// the full record — the server just stores it (same pattern as HouseholdTask.nextDue).
		UUID userId = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		StoredFoodEntity existing = new StoredFoodEntity(UUID.randomUUID(), userId);
		existing.setFoodId(foodId);
		existing.setQuantity(BigDecimal.ONE, "l");
		existing.setStorageLocation("FRIDGE");
		existing.setExpiresOn(LocalDate.of(2026, 9, 10));
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(foodRepository.findById(foodId)).thenReturn(Optional.of(liveFood(foodId)));

		StoredFood opened = new StoredFood(existing.getId(), foodId, BigDecimal.ONE, "l", StoredFood.StorageLocationEnum.FRIDGE,
				LocalDate.of(2026, 9, 5), true, false);
		opened.openedAt(OffsetDateTime.parse("2026-08-26T09:00:00Z"));

		StoredFood saved = service.update(userId, existing.getId(), opened);

		assertThat(saved.getOpened()).isTrue();
		assertThat(saved.getExpiresOn()).isEqualTo(LocalDate.of(2026, 9, 5));
		assertThat(saved.getOpenedAt().get()).isEqualTo(OffsetDateTime.parse("2026-08-26T09:00:00Z"));
	}

	@Test
	void update_throwsEntityDeleted_whenAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		UUID foodId = UUID.randomUUID();
		StoredFoodEntity existing = new StoredFoodEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), foodId)))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenItemBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		StoredFoodEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		StoredFood deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		StoredFoodEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		StoredFood deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsLiveItemsForUser_orderedByExpiry() {
		UUID userId = UUID.randomUUID();
		StoredFoodEntity a = entity(UUID.randomUUID(), userId);
		StoredFoodEntity b = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByExpiresOnAsc(userId)).thenReturn(List.of(a, b));

		List<StoredFood> result = service.list(userId);

		assertThat(result).extracting(StoredFood::getId).containsExactly(a.getId(), b.getId());
	}
}
