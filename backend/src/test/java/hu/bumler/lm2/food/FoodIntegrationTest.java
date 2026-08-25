package hu.bumler.lm2.food;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Subfeatures/Élelmiszerek.md: unlike every other integration test in this repo,
 * Food has no owner — a second user must see, edit, and delete the first user's rows (no 404, no
 * "another user" case at all), which is exactly what this test exercises in addition to the usual
 * idempotent-POST / 409 / 410 / delta-pull cases from documentation/Architektúra/Backend.md.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class FoodIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("food-idempotent");
		UUID id = UUID.randomUUID();
		Food item = new Food(id, "Tej", false);

		createFood(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Tej"));
		createFood(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Tej"));
	}

	@Test
	void create_returnsUniqueViolation_whenEveryFieldMatchesALiveItem() throws Exception {
		String token = registerAndLogin("food-unique");
		createFood(token, new Food(UUID.randomUUID(), "Kenyér", false)).andExpect(status().isOk());

		createFood(token, new Food(UUID.randomUUID(), "Kenyér", false))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"));
	}

	@Test
	void create_allowsPartialMatch_whenAnotherFieldDiffers() throws Exception {
		String token = registerAndLogin("food-partial-match");
		createFood(token, new Food(UUID.randomUUID(), "Kenyér", false).store("Aldi")).andExpect(status().isOk());

		createFood(token, new Food(UUID.randomUUID(), "Kenyér", false).store("Lidl")).andExpect(status().isOk());
	}

	@Test
	void anyAuthenticatedUser_canEditAnotherUsersCreatedFood_becauseTheCatalogIsShared() throws Exception {
		String tokenA = registerAndLogin("food-shared-a");
		String tokenB = registerAndLogin("food-shared-b");
		UUID id = UUID.randomUUID();
		createFood(tokenA, new Food(id, "Sajt", false)).andExpect(status().isOk());

		mockMvc.perform(put("/api/foods/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
				.content(json(new Food(id, "Sajt (átírva)", false))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Sajt (átírva)"));
	}

	@Test
	void anyAuthenticatedUser_canSeeAndDeleteAnotherUsersCreatedFood() throws Exception {
		String tokenA = registerAndLogin("food-shared-get-a");
		String tokenB = registerAndLogin("food-shared-get-b");
		UUID id = UUID.randomUUID();
		createFood(tokenA, new Food(id, "Vaj", false)).andExpect(status().isOk());

		mockMvc.perform(get("/api/foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Vaj"));

		mockMvc.perform(delete("/api/foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void update_returnsEntityDeleted_afterTheItemWasDeleted() throws Exception {
		String token = registerAndLogin("food-entity-deleted");
		UUID id = UUID.randomUUID();
		createFood(token, new Food(id, "Joghurt", false)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/foods/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/foods/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new Food(id, "Joghurt (átírva)", false))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void get_returnsNotFound_whenIdUnknown() throws Exception {
		String token = registerAndLogin("food-not-found");

		mockMvc.perform(get("/api/foods/" + UUID.randomUUID()).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdFood_appearsInEveryUsersDeltaPull_becauseTheCatalogIsGlobal() throws Exception {
		String creator = registerAndLogin("food-sync-creator");
		String otherUser = registerAndLogin("food-sync-other");
		UUID id = UUID.randomUUID();
		createFood(creator, new Food(id, "Répa", false)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherUser))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"Food\"");
	}

	private ResultActions createFood(String token, Food item) throws Exception {
		return mockMvc.perform(post("/api/foods").contentType(MediaType.APPLICATION_JSON)
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
