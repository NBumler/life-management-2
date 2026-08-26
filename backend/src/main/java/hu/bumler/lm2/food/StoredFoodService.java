package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.StoredFood;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md — per-user storage inventory. The "felbontás"
 * (opened) expiry recompute and the meal-time consumption/FIFO deduction are client-side business
 * logic against the already-locally-synced Food catalog (same pattern as HouseholdTask.nextDue
 * being rolled forward by the client) — this service just stores whatever full record it's sent.
 */
@Service
class StoredFoodService {

	private final StoredFoodRepository repository;
	private final FoodRepository foodRepository;
	private final StoredFoodMapper mapper;

	StoredFoodService(StoredFoodRepository repository, FoodRepository foodRepository, StoredFoodMapper mapper) {
		this.repository = repository;
		this.foodRepository = foodRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<StoredFood> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByExpiresOnAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	StoredFood get(UUID userId, UUID id) {
		StoredFoodEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stored food"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	StoredFood create(UUID userId, StoredFood dto) {
		StoredFoodEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new StoredFoodEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Full replace (last-write-wins) — quantity/location/expiry edits and the opened flag all arrive this way. */
	@Transactional
	StoredFood update(UUID userId, UUID id, StoredFood dto) {
		StoredFoodEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stored food"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Stored food already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	StoredFood delete(UUID userId, UUID id) {
		StoredFoodEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stored food"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(StoredFoodEntity entity, StoredFood dto) {
		requireLiveFood(dto.getFoodId());
		entity.setFoodId(dto.getFoodId());
		entity.setQuantity(dto.getQuantityAmount(), dto.getQuantityUnit());
		entity.setStorageLocation(dto.getStorageLocation().getValue());
		entity.setExpiresOn(dto.getExpiresOn());
		entity.setOpened(dto.getOpened(), dto.getOpenedAt().orElse(null));
	}

	/** documentation/Subfeatures/Élelmiszer tárolás.md: only the (global) catalog decides which foods are pickable. */
	private void requireLiveFood(UUID foodId) {
		FoodEntity food = foodRepository.findById(foodId).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (food.isDeleted()) {
			throw new EntityNotFoundException("No such food");
		}
	}

	private static StoredFoodEntity requireOwner(StoredFoodEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such stored food");
		}
		return entity;
	}
}
