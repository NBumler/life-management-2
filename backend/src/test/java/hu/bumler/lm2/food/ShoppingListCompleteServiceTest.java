package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.Food;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.ShoppingList;
import hu.bumler.lm2.api.model.ShoppingListCompleteFoodEntry;
import hu.bumler.lm2.api.model.ShoppingListCompleteNewList;
import hu.bumler.lm2.api.model.ShoppingListCompleteRequest;
import hu.bumler.lm2.api.model.ShoppingListItem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — the atomic "Bevásárlás vége" endpoint.
 * MockMvc-level (not a plain unit test) because the interesting behavior spans three entities in
 * one transaction and depends on the generated `Idempotency-Key` header binding actually working.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class ShoppingListCompleteServiceTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void complete_createsStoredFoodAndArchivesList_forNonDbUnitCheckedFoodItem() throws Exception {
		String token = registerAndLogin("complete-basic");
		UUID foodId = createFoodWithSingleAllowedLocation(token, "Tej");
		UUID listId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createList(token, listId, foodItemDto(itemId, listId, foodId, BigDecimal.ONE, "kg", true));

		UUID storageEntryId = UUID.randomUUID();
		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(
				List.of(new ShoppingListCompleteFoodEntry(itemId, List.of(storageEntryId))));

		complete(token, listId, UUID.randomUUID(), request)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.archivedListId").value(listId.toString()))
				.andExpect(jsonPath("$.createdStorageEntryIds[0]").value(storageEntryId.toString()))
				.andExpect(jsonPath("$.newActiveListId").doesNotExist());

		mockMvc.perform(get("/api/shopping-lists/" + listId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ARCHIVED"));

		String storedFoods = mockMvc.perform(get("/api/stored-foods").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		assertThat(storedFoods).contains(storageEntryId.toString()).contains(foodId.toString());
	}

	@Test
	void complete_splitsDbUnitItemIntoOneStoredFoodRowPerUnit() throws Exception {
		String token = registerAndLogin("complete-split");
		UUID foodId = createFoodWithNetAmount(token, "Ásványvíz", BigDecimal.valueOf(0.5), "l");
		UUID listId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createList(token, listId, foodItemDto(itemId, listId, foodId, BigDecimal.valueOf(3), "db", true));

		List<UUID> storageEntryIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(
				List.of(new ShoppingListCompleteFoodEntry(itemId, storageEntryIds)));

		complete(token, listId, UUID.randomUUID(), request)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.createdStorageEntryIds.length()").value(3));

		String storedFoods = mockMvc.perform(get("/api/stored-foods").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		for (UUID id : storageEntryIds) {
			assertThat(storedFoods).contains(id.toString());
		}
	}

	@Test
	void complete_requiresExplicitStorageLocation_whenMultipleAreAllowed() throws Exception {
		String token = registerAndLogin("complete-multi-location");
		Food food = new Food(UUID.randomUUID(), "Sajt", false).shelfRoomAmount(BigDecimal.TEN).shelfRoomUnit("nap")
				.shelfFridgeAmount(BigDecimal.valueOf(20)).shelfFridgeUnit("nap");
		UUID foodId = createFood(token, food);
		UUID listId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createList(token, listId, foodItemDto(itemId, listId, foodId, BigDecimal.ONE, "kg", true));

		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(
				List.of(new ShoppingListCompleteFoodEntry(itemId, List.of(UUID.randomUUID()))));

		complete(token, listId, UUID.randomUUID(), request)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("storageLocation"));
	}

	@Test
	void complete_createsNewActiveList_fromLeftoverUncheckedItems() throws Exception {
		String token = registerAndLogin("complete-leftover");
		UUID foodId = createFoodWithSingleAllowedLocation(token, "Vaj");
		UUID listId = UUID.randomUUID();
		UUID checkedItemId = UUID.randomUUID();
		UUID uncheckedItemId = UUID.randomUUID();
		createList(token, listId,
				List.of(foodItemDto(checkedItemId, listId, foodId, BigDecimal.ONE, "kg", true), nonFoodItemDto(uncheckedItemId, listId, "Mosószer", false)));

		UUID newListId = UUID.randomUUID();
		UUID newItemId = UUID.randomUUID();
		ShoppingListCompleteNewList newActiveList = new ShoppingListCompleteNewList(newListId,
				List.of(nonFoodItemDto(newItemId, newListId, "Mosószer", false)));
		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(
				List.of(new ShoppingListCompleteFoodEntry(checkedItemId, List.of(UUID.randomUUID()))));
		request.newActiveList(newActiveList);

		complete(token, listId, UUID.randomUUID(), request)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.newActiveListId").value(newListId.toString()));

		mockMvc.perform(get("/api/shopping-lists/" + newListId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ACTIVE"))
				.andExpect(jsonPath("$.items[0].name").value("Mosószer"))
				.andExpect(jsonPath("$.items[0].checked").value(false));
	}

	@Test
	void complete_returnsEntityDeleted_whenTheListIsNoLongerActive() throws Exception {
		String token = registerAndLogin("complete-not-active");
		UUID foodId = createFoodWithSingleAllowedLocation(token, "Joghurt");
		UUID listId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createList(token, listId, foodItemDto(itemId, listId, foodId, BigDecimal.ONE, "kg", true));
		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(
				List.of(new ShoppingListCompleteFoodEntry(itemId, List.of(UUID.randomUUID()))));
		complete(token, listId, UUID.randomUUID(), request).andExpect(status().isOk());

		complete(token, listId, UUID.randomUUID(), request)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void complete_isIdempotent_whenTheSameKeyIsReplayed() throws Exception {
		String token = registerAndLogin("complete-replay");
		UUID foodId = createFoodWithSingleAllowedLocation(token, "Kávé");
		UUID listId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createList(token, listId, foodItemDto(itemId, listId, foodId, BigDecimal.ONE, "kg", true));
		UUID storageEntryId = UUID.randomUUID();
		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(
				List.of(new ShoppingListCompleteFoodEntry(itemId, List.of(storageEntryId))));
		UUID idempotencyKey = UUID.randomUUID();

		MvcResult first = complete(token, listId, idempotencyKey, request).andExpect(status().isOk()).andReturn();
		MvcResult second = complete(token, listId, idempotencyKey, request).andExpect(status().isOk()).andReturn();

		assertThat(second.getResponse().getContentAsString()).isEqualTo(first.getResponse().getContentAsString());
		String storedFoods = mockMvc.perform(get("/api/stored-foods").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		assertThat(countOccurrences(storedFoods, storageEntryId.toString())).isEqualTo(1);
	}

	@Test
	void complete_returnsValidationError_whenACheckedFoodItemHasNoMatchingEntry() throws Exception {
		String token = registerAndLogin("complete-missing-entry");
		UUID foodId = createFoodWithSingleAllowedLocation(token, "Alma");
		UUID listId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createList(token, listId, foodItemDto(itemId, listId, foodId, BigDecimal.ONE, "kg", true));

		ShoppingListCompleteRequest request = new ShoppingListCompleteRequest(List.of());

		complete(token, listId, UUID.randomUUID(), request)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	// --- helpers ---

	private ResultActions complete(String token, UUID listId, UUID idempotencyKey, ShoppingListCompleteRequest request) throws Exception {
		return mockMvc.perform(post("/api/shopping-lists/" + listId + "/complete").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.header("Idempotency-Key", idempotencyKey.toString())
				.content(json(request)));
	}

	private void createList(String token, UUID listId, ShoppingListItem item) throws Exception {
		createList(token, listId, List.of(item));
	}

	private void createList(String token, UUID listId, List<ShoppingListItem> items) throws Exception {
		mockMvc.perform(post("/api/shopping-lists").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new ShoppingList(listId, items, false))))
				.andExpect(status().isOk());
	}

	private ShoppingListItem foodItemDto(UUID id, UUID listId, UUID foodId, BigDecimal amount, String unit, boolean checked) {
		ShoppingListItem item = new ShoppingListItem(id, listId, ShoppingListItem.TypeEnum.FOOD, checked, 0, false);
		item.foodId(foodId);
		item.quantityAmount(amount);
		item.quantityUnit(unit);
		return item;
	}

	private ShoppingListItem nonFoodItemDto(UUID id, UUID listId, String name, boolean checked) {
		ShoppingListItem item = new ShoppingListItem(id, listId, ShoppingListItem.TypeEnum.NON_FOOD, checked, 0, false);
		item.name(name);
		return item;
	}

	/** A single allowed storage location (fridge only) with a real duration, so the server-side default branch is exercised. */
	private UUID createFoodWithSingleAllowedLocation(String token, String name) throws Exception {
		Food food = new Food(UUID.randomUUID(), name, false).shelfFridgeAmount(BigDecimal.valueOf(5)).shelfFridgeUnit("nap");
		return createFood(token, food);
	}

	private UUID createFoodWithNetAmount(String token, String name, BigDecimal netAmount, String netUnit) throws Exception {
		Food food = new Food(UUID.randomUUID(), name, false).shelfFridgeAmount(BigDecimal.valueOf(30)).shelfFridgeUnit("nap")
				.netAmount(netAmount).netUnit(netUnit);
		return createFood(token, food);
	}

	private UUID createFood(String token, Food food) throws Exception {
		mockMvc.perform(post("/api/foods").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(food)))
				.andExpect(status().isOk());
		return food.getId();
	}

	private String registerAndLogin(String usernamePrefix) throws Exception {
		String username = usernamePrefix + "-" + UUID.randomUUID().toString().substring(0, 8);
		String password = "correct-horse-battery";
		mockMvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key")
				.content(json(new AdminCreateUserRequest(username, password))))
				.andExpect(status().isCreated());

		MvcResult login = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content(json(new LoginRequest(username, password))))
				.andExpect(status().isOk()).andReturn();
		return objectMapper.readValue(login.getResponse().getContentAsString(), AuthTokens.class).getAccessToken();
	}

	private String json(Object body) throws Exception {
		return objectMapper.writeValueAsString(body);
	}

	private static int countOccurrences(String haystack, String needle) {
		int count = 0;
		int index = 0;
		while ((index = haystack.indexOf(needle, index)) != -1) {
			count++;
			index += needle.length();
		}
		return count;
	}
}
