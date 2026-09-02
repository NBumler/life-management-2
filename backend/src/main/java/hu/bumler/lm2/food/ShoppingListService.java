package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
import hu.bumler.lm2.common.IdempotencyKeyEntity;
import hu.bumler.lm2.common.IdempotencyKeyRepository;
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
			// One bulk UPDATE for the whole item cascade — the BEFORE-UPDATE trigger still stamps
			// updated_at on every affected row, which the delta pull relies on (CLAUDE.md).
			itemRepository.softDeleteByShoppingListIdAndDeletedFalse(id);
		}
		return toDto(entity, itemRepository.findByShoppingListId(id));
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code items} list
	 * is the complete desired live tree — an item's presence/absence by id is the only signal.
	 * Items missing from the incoming list are soft-deleted; the response always lists every row,
	 * live or tombstoned (ShoppingList.yaml). {@code status}/{@code completedAt} are read-only here
	 * (see class javadoc) — only {@code name} is ever written from this endpoint.
	 */
	private ShoppingList saveTree(ShoppingListEntity entity, ShoppingList dto) {
		if (!"ACTIVE".equals(entity.getStatus())) {
			// documentation/Subfeatures/Bevásárlás előzmény.md: an ARCHIVED list is read-only history.
			// The editor never opens one (shopping-list-editor.page.ts bails on a non-ACTIVE list); this
			// guards a stale client or a second device from silently rewriting a completed shopping trip.
			throw new EntityDeletedException("Shopping list is archived and cannot be edited");
		}
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
		// The response echoes every row (live or tombstoned — ShoppingList.yaml). Build it from the rows
		// already in hand rather than re-SELECTing: incoming-live plus every existing row not in the
		// incoming set (which includes the ones just soft-deleted here and any already-dead ones).
		List<ShoppingListItemEntity> echoRows = new ArrayList<>(incomingLive);
		for (ShoppingListItemEntity existing : existingItems) {
			if (!incomingIds.contains(existing.getId())) {
				if (!existing.isDeleted()) {
					existing.softDelete();
					itemRepository.save(existing);
				}
				echoRows.add(existing);
			}
		}
		itemRepository.flush();

		return toDto(entity, echoRows);
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
		// Take the row-level write lock FIRST, so two concurrent completions of the same list serialize
		// (documentation/Subfeatures/Bevásárlás teljesítve.md "Idempotencia"). 404 for an unknown or
		// foreign list, ahead of any replay/state check.
		ShoppingListEntity list = repository.findByIdAndUserIdForUpdate(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such shopping list"));

		// Now that we hold the lock the replay check is race-free: a concurrent call with the same key
		// has either already committed (→ return its stored response) or is still blocked behind us.
		var cached = idempotencyKeyRepository.findById(idempotencyKey);
		if (cached.isPresent()) {
			return readCachedResponse(cached.get(), userId);
		}

		if (list.isDeleted() || !"ACTIVE".equals(list.getStatus())) {
			// Not ACTIVE: already completed (possibly from another device with a different key) or deleted.
			throw new EntityDeletedException("Shopping list is not active");
		}
		return runComplete(userId, idempotencyKey, request, list);
	}

	private ShoppingListCompleteResponse readCachedResponse(IdempotencyKeyEntity cached, UUID userId) {
		if (!userId.equals(cached.getUserId()) || !COMPLETE_ENDPOINT.equals(cached.getEndpoint())) {
			// The idempotency_key table is keyed by the client UUID alone — a value colliding across
			// tenants or endpoints must never serve another party's stored response.
			throw new ValidationException("Idempotency-Key already used for a different request", "Idempotency-Key");
		}
		try {
			return objectMapper.readValue(cached.getResponseBody(), ShoppingListCompleteResponse.class);
		} catch (Exception e) {
			throw new IllegalStateException("Corrupt cached idempotency response for key " + cached.getKey(), e);
		}
	}

	private ShoppingListCompleteResponse runComplete(UUID userId, UUID idempotencyKey, ShoppingListCompleteRequest request, ShoppingListEntity list) {
		UUID id = list.getId();
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
			if (!coveredItemIds.add(item.getId())) {
				throw new ValidationException("checkedFoodEntries has more than one entry for the same item", "checkedFoodEntries");
			}
			createdStorageEntryIds.addAll(createStorageEntries(userId, item, entry));
		}
		if (!coveredItemIds.equals(checkedFoodItemIds)) {
			throw new ValidationException("Every checked FOOD item needs exactly one checkedFoodEntries entry", "checkedFoodEntries");
		}

		list.setStatus("ARCHIVED");
		list.setCompletedAt(OffsetDateTime.now());
		repository.saveAndFlush(list);

		ShoppingListCompleteNewList newActiveList = request.getNewActiveList();
		UUID newActiveListId = newActiveList != null ? createSpunOffList(userId, newActiveList) : null;

		ShoppingListCompleteResponse response = new ShoppingListCompleteResponse(id, createdStorageEntryIds);
		response.newActiveListId(newActiveListId);
		cacheResponse(idempotencyKey, userId, response);
		return response;
	}

	/**
	 * documentation/Subfeatures/Bevásárlás teljesítve.md 3. — the leftover-items list. Every id is
	 * client-generated and must be genuinely new: unlike {@link #saveTree} (which upserts through
	 * {@link NestedChildResolver}), a collision here means a client bug or a replay that slipped past
	 * the idempotency guard, so it is rejected rather than merged — {@code JpaRepository.save()} on an
	 * assigned id {@code merge()}s, which would otherwise hijack the colliding row's parent/owner.
	 * Checkboxes always start empty ("üres pipákkal"), regardless of what the client sent.
	 */
	private UUID createSpunOffList(UUID userId, ShoppingListCompleteNewList newActiveList) {
		UUID newListId = newActiveList.getId();
		if (repository.existsById(newListId)) {
			throw new ValidationException("newActiveList.id already exists", "newActiveList");
		}
		ShoppingListEntity newList = new ShoppingListEntity(newListId, userId);
		newList.setName(newActiveList.getName().orElse(null));
		repository.saveAndFlush(newList);

		Set<UUID> seenItemIds = new HashSet<>();
		for (ShoppingListItem itemDto : newActiveList.getItems()) {
			if (!seenItemIds.add(itemDto.getId())) {
				throw new ValidationException("newActiveList has a duplicate item id", "newActiveList");
			}
			if (itemRepository.existsById(itemDto.getId())) {
				throw new ValidationException("newActiveList item id already exists", "newActiveList");
			}
			ShoppingListItemEntity newItem = new ShoppingListItemEntity(itemDto.getId(), newListId, itemDto.getType().getValue(),
					itemDto.getSortOrder());
			applyItem(newItem, itemDto);
			newItem.setChecked(false);
			itemRepository.save(newItem);
		}
		itemRepository.flush();
		return newListId;
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

		int splitCount = splitCountFor(item);
		if (entry.getStorageEntryIds().size() != splitCount) {
			throw new ValidationException("storageEntryIds must have exactly " + splitCount + " id(s) for this item", "storageEntryIds");
		}

		BigDecimal rowAmount;
		String rowUnit;
		if (splitCount > 1) {
			BigDecimal netAmount = food.getNetAmount();
			rowAmount = netAmount != null ? netAmount : BigDecimal.ONE;
			rowUnit = netAmount != null ? food.getNetUnit() : "cs";
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

	/**
	 * documentation/Subfeatures/Élelmiszer tárolás.md — bit-identical to shopping-list-complete.ts's
	 * {@code splitCountFor()}: `cs` + whole amount → that many rows; `cs` + fractional amount → 1 row;
	 * legacy `db` (no longer selectable, backlog/063) → rounded up to whole packages (`1 db = 1 cs`);
	 * every other unit → 1 row. Floored at 1 (the editor blocks a non-positive FOOD quantity).
	 */
	private static int splitCountFor(ShoppingListItemEntity item) {
		BigDecimal amount = item.getQuantityAmount();
		if (amount == null) {
			return 1;
		}
		if ("db".equals(item.getQuantityUnit())) {
			return Math.max(1, amount.setScale(0, RoundingMode.CEILING).intValueExact());
		}
		if ("cs".equals(item.getQuantityUnit())) {
			return amount.stripTrailingZeros().scale() <= 0 ? Math.max(1, amount.intValueExact()) : 1;
		}
		return 1;
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
