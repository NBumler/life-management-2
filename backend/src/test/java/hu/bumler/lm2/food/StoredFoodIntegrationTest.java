package hu.bumler.lm2.food;

import java.time.LocalDate;
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
import hu.bumler.lm2.api.model.StoredFood;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the
 * per-user ownership and Food-catalog cascade rules from
 * documentation/Subfeatures/Élelmiszer tárolás.md.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class StoredFoodIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("stored-idempotent");
		UUID foodId = createFood(token, "Tej");
		UUID id = UUID.randomUUID();
		StoredFood item = storedFood(id, foodId, LocalDate.of(2026, 9, 1));

		createStoredFood(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.foodId").value(foodId.toString()));
		createStoredFood(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.foodId").value(foodId.toString()));
	}

	@Test
	void create_returnsNotFound_whenFoodIdDoesNotExist() throws Exception {
		String token = registerAndLogin("stored-food-missing");

		createStoredFood(token, storedFood(UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 9, 1)))
				.andExpect(status().isNotFound());
	}

	@Test
	void get_returnsNotFound_whenItemBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("stored-owner-a");
		String tokenB = registerAndLogin("stored-attacker-b");
		UUID foodId = createFood(tokenA, "Sajt");
		UUID id = UUID.randomUUID();
		createStoredFood(tokenA, storedFood(id, foodId, LocalDate.of(2026, 9, 1))).andExpect(status().isOk());

		mockMvc.perform(get("/api/stored-foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void update_persistsTheClientRecomputedOpenExpiry() throws Exception {
		// documentation/Subfeatures/Élelmiszer tárolás.md "Felbontás": the client computes the new
		// expiry (min(today + after-opening duration, previous expiry)) and PUTs the full record.
		String token = registerAndLogin("stored-open");
		UUID foodId = createFood(token, "Joghurt");
		UUID id = UUID.randomUUID();
		createStoredFood(token, storedFood(id, foodId, LocalDate.of(2026, 9, 20))).andExpect(status().isOk());

		StoredFood opened = storedFood(id, foodId, LocalDate.of(2026, 9, 5));
		opened.opened(true);
		opened.openedAt(java.time.OffsetDateTime.parse("2026-08-26T09:00:00Z"));

		mockMvc.perform(put("/api/stored-foods/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(opened)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.opened").value(true))
				.andExpect(jsonPath("$.expiresOn").value("2026-09-05"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheItemWasDeleted() throws Exception {
		String token = registerAndLogin("stored-entity-deleted");
		UUID foodId = createFood(token, "Vaj");
		UUID id = UUID.randomUUID();
		createStoredFood(token, storedFood(id, foodId, LocalDate.of(2026, 9, 1))).andExpect(status().isOk());
		mockMvc.perform(delete("/api/stored-foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/stored-foods/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(storedFood(id, foodId, LocalDate.of(2026, 9, 2)))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("stored-delete-idemp");
		UUID foodId = createFood(token, "Alma");
		UUID id = UUID.randomUUID();
		createStoredFood(token, storedFood(id, foodId, LocalDate.of(2026, 9, 1))).andExpect(status().isOk());

		mockMvc.perform(delete("/api/stored-foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/stored-foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/stored-foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void deletingTheCatalogFood_cascadesToLiveStoredFoodItems() throws Exception {
		// documentation/Subfeatures/Élelmiszer tárolás.md "Törlés".
		String token = registerAndLogin("stored-cascade");
		UUID foodId = createFood(token, "Túró");
		UUID id = UUID.randomUUID();
		createStoredFood(token, storedFood(id, foodId, LocalDate.of(2026, 9, 1))).andExpect(status().isOk());

		mockMvc.perform(delete("/api/foods/" + foodId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/stored-foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void createdStoredFood_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("stored-sync-delta");
		UUID foodId = createFood(token, "Répa");
		UUID id = UUID.randomUUID();
		createStoredFood(token, storedFood(id, foodId, LocalDate.of(2026, 9, 1))).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"StoredFood\"");
	}

	private StoredFood storedFood(UUID id, UUID foodId, LocalDate expiresOn) {
		return new StoredFood(id, foodId, java.math.BigDecimal.ONE, "l", StoredFood.StorageLocationEnum.FRIDGE, expiresOn, false, false);
	}

	/**
	 * documentation/Architektúra/Névegyediség.md: Food dedup is global (not user-scoped), so every
	 * test in the whole suite shares one catalog — the name must be unique across all of them, not
	 * just within this test.
	 */
	private UUID createFood(String token, String name) throws Exception {
		UUID id = UUID.randomUUID();
		String uniqueName = name + "-" + UUID.randomUUID().toString().substring(0, 8);
		mockMvc.perform(post("/api/foods").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(new Food(id, uniqueName, false))))
				.andExpect(status().isOk());
		return id;
	}

	private ResultActions createStoredFood(String token, StoredFood item) throws Exception {
		return mockMvc.perform(post("/api/stored-foods").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(item)));
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
}
