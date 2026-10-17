package hu.bumler.lm2.workout;

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

import tools.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.StretchExercise;
import hu.bumler.lm2.api.model.StretchPlan;
import hu.bumler.lm2.api.model.StretchPlanItem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * backlog/168 — documentation/Subfeatures/Heti terv.md "Nyújtó sablonok": the nested StretchPlan tree
 * (create / idempotent replay / item diff / cascade delete / ENTITY_DELETED / cross-user 404) and both
 * entity types in the delta pull. Name is not unique (same as WorkoutPlan).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class StretchPlanIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static StretchPlanItem item(UUID id, UUID planId, UUID stretchExerciseId, int orderIndex) {
		return new StretchPlanItem(id, planId, stretchExerciseId, "Combhajlító nyújtás", StretchPlanItem.StretchCategoryEnum.LEGS,
				orderIndex, 30, true, 2, false);
	}

	@Test
	void createIsIdempotent_andEchoesEveryItemField() throws Exception {
		String token = registerAndLogin("sp-create");
		UUID stretchId = createStretchExercise(token);
		UUID id = UUID.randomUUID();
		StretchPlan dto = new StretchPlan(id, "Esti nyújtás", true, false,
				List.of(item(UUID.randomUUID(), id, stretchId, 0).notes("lassan")));
		dto.goalLabel("Regeneráció");

		createStretchPlan(token, dto).andExpect(status().isOk());
		createStretchPlan(token, dto).andExpect(status().isOk())
				.andExpect(jsonPath("$.goalLabel").value("Regeneráció"))
				.andExpect(jsonPath("$.items.length()").value(1))
				.andExpect(jsonPath("$.items[0].holdSeconds").value(30))
				.andExpect(jsonPath("$.items[0].perSide").value(true))
				.andExpect(jsonPath("$.items[0].repetitions").value(2))
				.andExpect(jsonPath("$.items[0].notes").value("lassan"));
	}

	@Test
	void sameName_isAllowedTwice() throws Exception {
		String token = registerAndLogin("sp-name");
		createStretchPlan(token, new StretchPlan(UUID.randomUUID(), "Reggeli", true, false, List.of())).andExpect(status().isOk());
		createStretchPlan(token, new StretchPlan(UUID.randomUUID(), "Reggeli", true, false, List.of())).andExpect(status().isOk());
	}

	@Test
	void update_softDeletesItemsMissingFromTheIncomingTree() throws Exception {
		String token = registerAndLogin("sp-diff");
		UUID stretchId = createStretchExercise(token);
		UUID id = UUID.randomUUID();
		UUID keep = UUID.randomUUID();
		UUID drop = UUID.randomUUID();
		createStretchPlan(token, new StretchPlan(id, "Teljes", true, false,
				List.of(item(keep, id, stretchId, 0), item(drop, id, stretchId, 1)))).andExpect(status().isOk());

		mockMvc.perform(put("/api/stretch-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new StretchPlan(id, "Teljes", false, false, List.of(item(keep, id, stretchId, 0))))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.active").value(false))
				.andExpect(jsonPath("$.items[?(@.id == '" + drop + "')].deleted").value(true))
				.andExpect(jsonPath("$.items[?(@.id == '" + keep + "')].deleted").value(false));
	}

	@Test
	void delete_cascadesToItems_andAPutAfterwardsIsEntityDeleted() throws Exception {
		String token = registerAndLogin("sp-delete");
		UUID stretchId = createStretchExercise(token);
		UUID id = UUID.randomUUID();
		StretchPlan dto = new StretchPlan(id, "Törlendő", true, false, List.of(item(UUID.randomUUID(), id, stretchId, 0)));
		createStretchPlan(token, dto).andExpect(status().isOk());

		mockMvc.perform(delete("/api/stretch-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.items[0].deleted").value(true));
		mockMvc.perform(put("/api/stretch-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void get_returnsNotFound_whenPlanBelongsToAnotherUser() throws Exception {
		String owner = registerAndLogin("sp-owner");
		String other = registerAndLogin("sp-other");
		UUID id = UUID.randomUUID();
		createStretchPlan(owner, new StretchPlan(id, "Saját", true, false, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/stretch-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + other))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdTree_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("sp-sync");
		UUID stretchId = createStretchExercise(token);
		UUID id = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createStretchPlan(token, new StretchPlan(id, "Sync", true, false, List.of(item(itemId, id, stretchId, 0))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"StretchPlan\"")
				.contains(itemId.toString()).contains("\"entityType\":\"StretchPlanItem\"");
	}

	private ResultActions createStretchPlan(String token, StretchPlan dto) throws Exception {
		return mockMvc.perform(post("/api/stretch-plans").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
	}

	private UUID createStretchExercise(String token) throws Exception {
		UUID id = UUID.randomUUID();
		StretchExercise dto = new StretchExercise(id, "Combhajlító nyújtás", StretchExercise.CategoryEnum.LEGS, false, 30, true, false);
		mockMvc.perform(post("/api/stretch-exercises").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)))
				.andExpect(status().isOk());
		return id;
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
