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
import hu.bumler.lm2.api.model.Recipe;
import hu.bumler.lm2.api.model.RecipeIngredient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the
 * shared/global-ownership and duplicate rules from documentation/Subfeatures/Recept.md.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class RecipeIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("recipe-idempotent");
		UUID id = UUID.randomUUID();
		Recipe recipe = recipe(id, "Rántotta-idemp", List.of());

		createRecipe(token, recipe).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Rántotta-idemp"));
		createRecipe(token, recipe).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Rántotta-idemp"));
	}

	@Test
	void anyAuthenticatedUser_canEditAnotherUsersRecipe() throws Exception {
		// documentation/Subfeatures/Recept.md "Ownership: shared" — no per-user scoping at all.
		String owner = registerAndLogin("recipe-owner");
		String other = registerAndLogin("recipe-other");
		UUID id = UUID.randomUUID();
		createRecipe(owner, recipe(id, "Közös leves", List.of())).andExpect(status().isOk());

		mockMvc.perform(put("/api/recipes/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + other).content(json(recipe(id, "Közös leves", List.of()).note("átírva"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.note").value("átírva"));
	}

	@Test
	void create_returnsUniqueViolation_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("recipe-name-conflict");
		createRecipe(token, recipe(UUID.randomUUID(), "Gulyás-conflict", List.of())).andExpect(status().isOk());

		createRecipe(token, recipe(UUID.randomUUID(), "Gulyás-conflict", List.of()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"));
	}

	@Test
	void create_returnsUniqueViolation_whenLiveIngredientSetMatchesAnotherRecipe() throws Exception {
		String token = registerAndLogin("recipe-ingr-conflict");
		UUID foodId = createFood(token, "Tojás");
		UUID firstId = UUID.randomUUID();
		createRecipe(token,
				recipe(firstId, "Rántotta A", List.of(ingredient(UUID.randomUUID(), firstId, foodId, BigDecimal.valueOf(3), "cs", 0))))
				.andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createRecipe(token,
				recipe(secondId, "Rántotta B", List.of(ingredient(UUID.randomUUID(), secondId, foodId, BigDecimal.valueOf(3), "cs", 0))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("ingredients"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void create_returnsNotFound_whenIngredientFoodDoesNotExist() throws Exception {
		String token = registerAndLogin("recipe-food-missing");
		UUID id = UUID.randomUUID();

		createRecipe(token, recipe(id, "Hiányos", List.of(ingredient(UUID.randomUUID(), id, UUID.randomUUID(), BigDecimal.ONE, "cs", 0))))
				.andExpect(status().isNotFound());
	}

	@Test
	void update_addsIngredient_andRemovesOneMissingFromTheBody() throws Exception {
		String token = registerAndLogin("recipe-update-ingr");
		UUID foodA = createFood(token, "Liszt");
		UUID foodB = createFood(token, "Cukor");
		UUID id = UUID.randomUUID();
		UUID ingredientAId = UUID.randomUUID();
		createRecipe(token, recipe(id, "Palacsinta", List.of(ingredient(ingredientAId, id, foodA, BigDecimal.valueOf(20), "dkg", 0))))
				.andExpect(status().isOk());

		UUID ingredientBId = UUID.randomUUID();
		MvcResult putResult = mockMvc.perform(put("/api/recipes/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(recipe(id, "Palacsinta", List.of(ingredient(ingredientBId, id, foodB, BigDecimal.valueOf(5), "dkg", 0))))))
				.andExpect(status().isOk())
				.andReturn();
		Recipe updated = objectMapper.readValue(putResult.getResponse().getContentAsString(), Recipe.class);

		assertThat(updated.getIngredients()).anySatisfy(i -> {
			assertThat(i.getId()).isEqualTo(ingredientBId);
			assertThat(i.getDeleted()).isFalse();
		});
		assertThat(updated.getIngredients()).anySatisfy(i -> {
			assertThat(i.getId()).isEqualTo(ingredientAId);
			assertThat(i.getDeleted()).isTrue();
		});
	}

	@Test
	void update_returnsEntityDeleted_afterTheRecipeWasDeleted() throws Exception {
		String token = registerAndLogin("recipe-entity-deleted");
		UUID id = UUID.randomUUID();
		createRecipe(token, recipe(id, "Törölt recept", List.of())).andExpect(status().isOk());
		mockMvc.perform(delete("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/recipes/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(recipe(id, "Törölt recept", List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("recipe-delete-idemp");
		UUID id = UUID.randomUUID();
		createRecipe(token, recipe(id, "Törlendő", List.of())).andExpect(status().isOk());

		mockMvc.perform(delete("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());

		mockMvc.perform(get("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void delete_cascadesToLiveIngredients() throws Exception {
		String token = registerAndLogin("recipe-cascade");
		UUID foodId = createFood(token, "Kakaó");
		UUID id = UUID.randomUUID();
		UUID ingredientId = UUID.randomUUID();
		createRecipe(token, recipe(id, "Kakaós süti", List.of(ingredient(ingredientId, id, foodId, BigDecimal.TEN, "dkg", 0))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());

		mockMvc.perform(get("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.ingredients[0].deleted").value(true));
	}

	@Test
	void deletingTheCatalogFood_cascadesToLiveRecipeIngredients() throws Exception {
		// documentation/Subfeatures/Élelmiszerek.md "Törlés".
		String token = registerAndLogin("recipe-food-cascade");
		UUID foodId = createFood(token, "Vaj-recept");
		UUID id = UUID.randomUUID();
		UUID ingredientId = UUID.randomUUID();
		createRecipe(token, recipe(id, "Vajas kenyér", List.of(ingredient(ingredientId, id, foodId, BigDecimal.ONE, "dkg", 0))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/foods/" + foodId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());

		mockMvc.perform(get("/api/recipes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(false))
				.andExpect(jsonPath("$.ingredients[0].deleted").value(true));
	}

	@Test
	void createdRecipeAndIngredient_appearInTheDeltaPull() throws Exception {
		String token = registerAndLogin("recipe-sync-delta");
		UUID foodId = createFood(token, "Répa-recept");
		UUID id = UUID.randomUUID();
		UUID ingredientId = UUID.randomUUID();
		createRecipe(token, recipe(id, "Répasaláta", List.of(ingredient(ingredientId, id, foodId, BigDecimal.valueOf(2), "cs", 0))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"Recipe\"");
		assertThat(body).contains(ingredientId.toString()).contains("\"entityType\":\"RecipeIngredient\"");
	}

	private Recipe recipe(UUID id, String name, List<RecipeIngredient> ingredients) {
		return new Recipe(id, name, false, ingredients);
	}

	private RecipeIngredient ingredient(UUID id, UUID recipeId, UUID foodId, BigDecimal amount, String unit, int sortOrder) {
		return new RecipeIngredient(id, recipeId, foodId, amount, unit, sortOrder, false);
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

	private ResultActions createRecipe(String token, Recipe recipe) throws Exception {
		return mockMvc.perform(post("/api/recipes").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(recipe)));
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
