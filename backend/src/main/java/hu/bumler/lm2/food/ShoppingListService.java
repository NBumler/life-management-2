package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.ShoppingList;
import hu.bumler.lm2.api.model.ShoppingListCompleteFoodEntry;
import hu.bumler.lm2.api.model.ShoppingListCompleteNewList;
import hu.bumler.lm2.api.model.ShoppingListCompleteRequest;
import hu.bumler.lm2.api.model.ShoppingListCompleteResponse;
import hu.bumler.lm2.api.model.ShoppingListItem;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/Bevásárlólista írás.md — per-user active shopping list: nested
 * aggregate PUT like MealService/RecipeService/PackingTemplateService. Unlike Meal, an empty item
 * list is valid (the spec's own "Üres aktív lista" flow deletes it manually instead of forbidding
 * it), so — unlike MealService.saveTree — there is no "at least one live item" check here.
 * Archiving (status → ARCHIVED) only ever happens via {@link #complete} — see
 * documentation/Subfeatures/Bevásárlás teljesítve.md.
 */
@Service
class ShoppingListService {

	private static final String COMPLETE_ENDPOINT = "POST /api/shopping-lists/{id}/complete";

	private final ShoppingListRepository repository;
	private final ShoppingListItemRepository itemRepository;
	private final FoodRepository foodRepository;
	private final StoredFoodRepository storedFoodRepository;
	private final IdempotencyKeyRepository idempotencyKeyRepository;
	private final ShoppingListMapper mapper;
	private final ShoppingListItemMapper itemMapper;
	private final ObjectMapper objectMapper;

	ShoppingListService(ShoppingListRepository repository, ShoppingListItemRepository itemRepository, FoodRepository foodRepository,
			StoredFoodRepository storedFoodRepository, IdempotencyKeyRepository idempotencyKeyRepository, ShoppingListMapper mapper,
			ShoppingListItemMapper itemMapper, ObjectMapper objectMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.foodRepository = foodRepository;
		this.storedFoodRepository = storedFoodRepository;
		this.idempotencyKeyRepository = idempotencyKeyRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
		this.objectMapper = objectMapper;
	}

	@Transactional(readOnly = true)
	List<ShoppingList> list(UUID userId) {
		List<ShoppingListEntity> lists = repository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId);
		var itemsByList = groupByShoppingListId(itemRepository.findByShoppingListIdIn(lists.stream().map(ShoppingListEntity::getId).toList()));
		return lists.stream().map(list -> toDto(list, itemsByList.getOrDefault(list.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	ShoppingList get(UUID userId, UUID id) {
		ShoppingListEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	ShoppingList create(UUID userId, ShoppingList dto) {
		ShoppingListEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new ShoppingListEntity(dto.getId(), userId));
		return saveTree(entity, dto);
	}

	@Transactional
	ShoppingList update(UUID userId, UUID id, ShoppingList dto) {
		ShoppingListEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Shopping list already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live item on the list. */
	@Transactional
	ShoppingList delete(UUID userId, UUID id) {
		ShoppingListEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (ShoppingListItemEntity item : itemRepository.findByShoppingListIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code items} list
	 * is the complete desired live tree — an item's presence/absence by id is the only signal.
	 * Items missing from the incoming list are soft-deleted; the response always lists every row,
	 * live or tombstoned (ShoppingList.yaml). {@code status}/{@code completedAt} are read-only here
	 * (see class javadoc) — only {@code name} is ever written from this endpoint.
	 */
	private ShoppingList saveTree(ShoppingListEntity entity, ShoppingList dto) {
		entity.setName(dto.getName().orElse(null));
		repository.saveAndFlush(entity);

		List<ShoppingListItemEntity> existingItems = itemRepository.findByShoppingListId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		List<ShoppingListItemEntity> incomingLive = new ArrayList<>();
		for (ShoppingListItem itemDto : dto.getItems()) {
			if (itemDto.getDeleted()) {
				continue;
			}
			incomingIds.add(itemDto.getId());
			ShoppingListItemEntity itemEntity = resolveItem(entity.getId(), existingItems, itemDto.getId());
			applyItem(itemEntity, itemDto);
			incomingLive.add(itemEntity);
		}

		for (ShoppingListItemEntity itemEntity : incomingLive) {
			itemRepository.save(itemEntity);
		}
		for (ShoppingListItemEntity existing : existingItems) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				itemRepository.save(existing);
			}
		}
		itemRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with MealService.resolveItem / RecipeService.resolveIngredient / PackingTemplateService.resolveItem. */
	private ShoppingListItemEntity resolveItem(UUID shoppingListId, List<ShoppingListItemEntity> existingItems, UUID itemId) {
		return NestedChildResolver.resolve(itemId, existingItems, ShoppingListItemEntity::getId, ShoppingListItemEntity::isDeleted,
				ShoppingListItemEntity::undelete, itemRepository::existsById,
				() -> new ShoppingListItemEntity(itemId, shoppingListId, ShoppingListItem.TypeEnum.NON_FOOD.getValue(), 0), "No such shopping list item");
	}

	/** documentation/Subfeatures/Bevásárlólista írás.md "Tétel hozzáadása": per-type required fields; unused fields on the entity are cleared. */
	private void applyItem(ShoppingListItemEntity entity, ShoppingListItem dto) {
		ShoppingListItem.TypeEnum type = dto.getType();
		entity.setType(type.getValue());
		entity.setFoodId(null);
		entity.setName(null);
		entity.setNote(null);
		entity.setQuantity(null, null);

		switch (type) {
			case FOOD -> {
				UUID foodId = dto.getFoodId().orElseThrow(() -> new ValidationException("foodId is required for FOOD items", "foodId"));
				requireLiveFood(foodId);
				BigDecimal amount = dto.getQuantityAmount()
						.orElseThrow(() -> new ValidationException("quantityAmount is required for FOOD items", "quantityAmount"));
				String unit = dto.getQuantityUnit().orElseThrow(() -> new ValidationException("quantityUnit is required for FOOD items", "quantityUnit"));
				entity.setFoodId(foodId);
				entity.setQuantity(amount, unit);
			}
			case NON_FOOD -> {
				String name = dto.getName().orElseThrow(() -> new ValidationException("name is required for NON_FOOD items", "name"));
				entity.setName(name);
				entity.setNote(dto.getNote().orElse(null));
				entity.setQuantity(dto.getQuantityAmount().orElse(null), dto.getQuantityUnit().orElse(null));
			}
		}

		entity.setChecked(dto.getChecked());
		entity.setSortOrder(dto.getSortOrder());
	}

	/** documentation/Subfeatures/Bevásárlólista írás.md: a FOOD item may only reference a live Food. */
	private FoodEntity requireLiveFood(UUID foodId) {
		FoodEntity food = foodRepository.findById(foodId).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (food.isDeleted()) {
			throw new EntityNotFoundException("No such food");
		}
		return food;
	}

	// --- complete ("Bevásárlás vége") ---

	/**
	 * documentation/Subfeatures/Bevásárlás teljesítve.md — the atomic multi-entity completion flow
	 * (documentation/Architektúra/Backend-offline first.md §11): creates StoredFood rows for the
	 * checked FOOD items, archives this list, and optionally spins off a new active list from the
	 * leftover unchecked items. Replay-safe via {@code idempotencyKey} — a second call with the same
	 * key returns the first call's stored response instead of running any of this again.
	 */
	@Transactional
	ShoppingListCompleteResponse complete(UUID userId, UUID id, UUID idempotencyKey, ShoppingListCompleteRequest request) {
		return idempotencyKeyRepository.findById(idempotencyKey).map(this::readCachedResponse)
				.orElseGet(() -> runComplete(userId, id, idempotencyKey, request));
	}

	private ShoppingListCompleteResponse readCachedResponse(IdempotencyKeyEntity cached) {
		try {
			return objectMapper.readValue(cached.getResponseBody(), ShoppingListCompleteResponse.class);
		} catch (Exception e) {
			throw new IllegalStateException("Corrupt cached idempotency response for key " + cached.getKey(), e);
		}
	}

	private ShoppingListCompleteResponse runComplete(UUID userId, UUID id, UUID idempotencyKey, ShoppingListCompleteRequest request) {
		ShoppingListEntity list = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		if (!"ACTIVE".equals(list.getStatus())) {
			throw new EntityDeletedException("Shopping list is not active");
		}

		Map<UUID, ShoppingListItemEntity> liveItemsById = itemRepository.findByShoppingListIdAndDeletedFalse(id).stream()
				.collect(Collectors.toMap(ShoppingListItemEntity::getId, it -> it));
		Set<UUID> checkedFoodItemIds = liveItemsById.values().stream()
				.filter(it -> it.isChecked() && "FOOD".equals(it.getType()))
				.map(ShoppingListItemEntity::getId)
				.collect(Collectors.toSet());

		List<UUID> createdStorageEntryIds = new ArrayList<>();
		Set<UUID> coveredItemIds = new HashSet<>();
		for (ShoppingListCompleteFoodEntry entry : request.getCheckedFoodEntries()) {
			ShoppingListItemEntity item = liveItemsById.get(entry.getShoppingListItemId());
			if (item == null || !checkedFoodItemIds.contains(item.getId())) {
				throw new ValidationException("checkedFoodEntries references an item that isn't a checked FOOD item on this list",
						"checkedFoodEntries");
			}
			coveredItemIds.add(item.getId());
			createdStorageEntryIds.addAll(createStorageEntries(userId, item, entry));
		}
		if (!coveredItemIds.equals(checkedFoodItemIds)) {
			throw new ValidationException("Every checked FOOD item needs exactly one checkedFoodEntries entry", "checkedFoodEntries");
		}

		list.setStatus("ARCHIVED");
		list.setCompletedAt(OffsetDateTime.now());
		repository.saveAndFlush(list);

		UUID newActiveListId = null;
		ShoppingListCompleteNewList newActiveList = request.getNewActiveList();
		if (newActiveList != null) {
			ShoppingListEntity newList = new ShoppingListEntity(newActiveList.getId(), userId);
			newList.setName(newActiveList.getName().orElse(null));
			repository.saveAndFlush(newList);
			for (ShoppingListItem itemDto : newActiveList.getItems()) {
				ShoppingListItemEntity newItem = new ShoppingListItemEntity(itemDto.getId(), newList.getId(), itemDto.getType().getValue(),
						itemDto.getSortOrder());
				applyItem(newItem, itemDto);
				itemRepository.save(newItem);
			}
			itemRepository.flush();
			newActiveListId = newList.getId();
		}

		ShoppingListCompleteResponse response = new ShoppingListCompleteResponse(id, createdStorageEntryIds);
		response.newActiveListId(newActiveListId);
		cacheResponse(idempotencyKey, userId, response);
		return response;
	}

	/**
	 * documentation/Subfeatures/Élelmiszer tárolás.md "Létrehozás — bevásárlásból": a `db`-unit item
	 * with `amount = N` splits into N separate rows (one catalog package each); any other unit is one
	 * row with the list item's own quantity. Storage location / expiry resolution:
	 * documentation/Subfeatures/Bevásárlás teljesítve.md — exactly one catalog-allowed location can be
	 * defaulted (location and, via {@link ShelfLifeCalculator}, expiry); more than one (or none
	 * configured, which behaves like "all three") requires the client to have supplied both.
	 */
	private List<UUID> createStorageEntries(UUID userId, ShoppingListItemEntity item, ShoppingListCompleteFoodEntry entry) {
		FoodEntity food = requireLiveFood(item.getFoodId());
		List<String> allowed = ShelfLifeCalculator.allowedStorageLocations(food);

		ShoppingListCompleteFoodEntry.StorageLocationEnum requestedLocation = entry.getStorageLocation().orElse(null);
		String storageLocation = requestedLocation != null ? requestedLocation.getValue() : null;
		if (storageLocation == null) {
			if (allowed.size() != 1) {
				throw new ValidationException("storageLocation is required when more than one location is allowed", "storageLocation");
			}
			storageLocation = allowed.get(0);
		} else if (!allowed.contains(storageLocation)) {
			throw new ValidationException("storageLocation is not one of the catalog's allowed locations", "storageLocation");
		}

		LocalDate expirationDate = entry.getExpirationDate().orElse(null);
		if (expirationDate == null) {
			BigDecimal durationAmount = ShelfLifeCalculator.catalogDurationAmount(food, storageLocation);
			String durationUnit = ShelfLifeCalculator.catalogDurationUnit(food, storageLocation);
			if (durationAmount == null || durationUnit == null) {
				throw new ValidationException("expirationDate is required (the catalog has no duration for this location)", "expirationDate");
			}
			expirationDate = ShelfLifeCalculator.addDurationToDate(LocalDate.now(), durationAmount, durationUnit);
		}

		int splitCount = "db".equals(item.getQuantityUnit()) ? item.getQuantityAmount().intValue() : 1;
		if (entry.getStorageEntryIds().size() != splitCount) {
			throw new ValidationException("storageEntryIds must have exactly " + splitCount + " id(s) for this item", "storageEntryIds");
		}

		BigDecimal rowAmount;
		String rowUnit;
		if (splitCount > 1) {
			BigDecimal netAmount = food.getNetAmount();
			rowAmount = netAmount != null ? netAmount : BigDecimal.ONE;
			rowUnit = netAmount != null ? food.getNetUnit() : "db";
		} else {
			rowAmount = item.getQuantityAmount();
			rowUnit = item.getQuantityUnit();
		}

		List<UUID> ids = new ArrayList<>();
		for (UUID storageEntryId : entry.getStorageEntryIds()) {
			StoredFoodEntity storedFood = new StoredFoodEntity(storageEntryId, userId);
			storedFood.setFoodId(food.getId());
			storedFood.setQuantity(rowAmount, rowUnit);
			storedFood.setStorageLocation(storageLocation);
			storedFood.setExpiresOn(expirationDate);
			storedFood.setOpened(false, null);
			storedFoodRepository.save(storedFood);
			ids.add(storageEntryId);
		}
		return ids;
	}

	private void cacheResponse(UUID idempotencyKey, UUID userId, ShoppingListCompleteResponse response) {
		try {
			String json = objectMapper.writeValueAsString(response);
			idempotencyKeyRepository.save(new IdempotencyKeyEntity(idempotencyKey, userId, COMPLETE_ENDPOINT, 200, json));
		} catch (Exception e) {
			throw new IllegalStateException("Failed to serialize ShoppingListCompleteResponse for caching", e);
		}
	}

	private ShoppingList toDto(ShoppingListEntity entity) {
		return toDto(entity, itemRepository.findByShoppingListId(entity.getId()));
	}

	private ShoppingList toDto(ShoppingListEntity entity, List<ShoppingListItemEntity> items) {
		return mapper.toDto(entity, items.stream().map(itemMapper::toDto).toList());
	}

	private static Map<UUID, List<ShoppingListItemEntity>> groupByShoppingListId(List<ShoppingListItemEntity> items) {
		return items.stream().collect(Collectors.groupingBy(ShoppingListItemEntity::getShoppingListId));
	}

	private static ShoppingListEntity requireOwner(ShoppingListEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such shopping list");
		}
		return entity;
	}
}
