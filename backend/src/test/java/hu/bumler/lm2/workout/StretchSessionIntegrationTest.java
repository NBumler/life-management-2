package hu.bumler.lm2.workout;

import java.time.LocalDate;
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
import hu.bumler.lm2.api.model.StretchPlan;
import hu.bumler.lm2.api.model.StretchSession;
import hu.bumler.lm2.api.model.StretchSessionItem;
import hu.bumler.lm2.api.model.WorkoutSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * backlog/169 — documentation/Subfeatures/Nyújtás.md: the nested StretchSession tree (create / replay /
 * item diff / cascade delete / ENTITY_DELETED / cross-user 404 on the session and on its plan / workout
 * links / duration cap) and both entity types in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class StretchSessionIntegrationTest {

	private static final LocalDate DAY = LocalDate.parse("2026-10-17");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static StretchSessionItem item(UUID id, UUID sessionId, int orderIndex, boolean completed) {
		return new StretchSessionItem(id, sessionId, "Combhajlító nyújtás", StretchSessionItem.StretchCategoryEnum.LEGS, orderIndex, 30,
				true, 1, completed, false);
	}

	private static StretchSession session(UUID id, List<StretchSessionItem> items) {
		return new StretchSession(id, DAY, 12, false, items).startTime("19:00").endTime("19:12");
	}

	@Test
	void createIsIdempotent_andEchoesTheTree() throws Exception {
		String token = registerAndLogin("ss-create");
		UUID id = UUID.randomUUID();
		StretchSession dto = session(id, List.of(item(UUID.randomUUID(), id, 0, true), item(UUID.randomUUID(), id, 1, false)));

		createSession(token, dto).andExpect(status().isOk());
		createSession(token, dto).andExpect(status().isOk())
				.andExpect(jsonPath("$.durationMinutes").value(12))
				.andExpect(jsonPath("$.startTime").value("19:00"))
				.andExpect(jsonPath("$.items.length()").value(2))
				.andExpect(jsonPath("$.items[?(@.orderIndex == 1)].completed").value(false));
	}

	@Test
	void links_toOwnPlanAndWorkout_areStored_foreignOnesAreNotFound() throws Exception {
		String owner = registerAndLogin("ss-links-owner");
		String other = registerAndLogin("ss-links-other");
		UUID planId = createStretchPlan(owner);
		UUID workoutId = createWorkoutSession(owner);
		UUID id = UUID.randomUUID();

		createSession(owner, session(id, List.of()).stretchPlanId(planId).workoutSessionId(workoutId)).andExpect(status().isOk())
				.andExpect(jsonPath("$.stretchPlanId").value(planId.toString()))
				.andExpect(jsonPath("$.workoutSessionId").value(workoutId.toString()));

		createSession(other, session(UUID.randomUUID(), List.of()).stretchPlanId(planId)).andExpect(status().isNotFound());
		createSession(other, session(UUID.randomUUID(), List.of()).workoutSessionId(workoutId)).andExpect(status().isNotFound());
	}

	@Test
	void durationOver240_isRejected() throws Exception {
		String token = registerAndLogin("ss-cap");
		StretchSession dto = new StretchSession(UUID.randomUUID(), DAY, 241, false, List.of());

		createSession(token, dto).andExpect(status().isBadRequest());
	}

	@Test
	void update_softDeletesMissingItems_andDeleteCascades() throws Exception {
		String token = registerAndLogin("ss-diff");
		UUID id = UUID.randomUUID();
		UUID keep = UUID.randomUUID();
		UUID drop = UUID.randomUUID();
		createSession(token, session(id, List.of(item(keep, id, 0, true), item(drop, id, 1, true)))).andExpect(status().isOk());

		mockMvc.perform(put("/api/stretch-sessions/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(session(id, List.of(item(keep, id, 0, true))))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[?(@.id == '" + drop + "')].deleted").value(true));

		mockMvc.perform(delete("/api/stretch-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.items[?(@.id == '" + keep + "')].deleted").value(true));
		mockMvc.perform(put("/api/stretch-sessions/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(session(id, List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void get_returnsNotFound_forAnotherUsersSession() throws Exception {
		String owner = registerAndLogin("ss-owner");
		String other = registerAndLogin("ss-other");
		UUID id = UUID.randomUUID();
		createSession(owner, session(id, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/stretch-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + other))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdTree_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("ss-sync");
		UUID id = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createSession(token, session(id, List.of(item(itemId, id, 0, true)))).andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains("\"entityType\":\"StretchSession\"").contains(id.toString())
				.contains("\"entityType\":\"StretchSessionItem\"").contains(itemId.toString());
	}

	private ResultActions createSession(String token, StretchSession dto) throws Exception {
		return mockMvc.perform(post("/api/stretch-sessions").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
	}

	private UUID createStretchPlan(String token) throws Exception {
		UUID id = UUID.randomUUID();
		mockMvc.perform(post("/api/stretch-plans").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(new StretchPlan(id, "Esti", true, false, List.of()))))
				.andExpect(status().isOk());
		return id;
	}

	private UUID createWorkoutSession(String token) throws Exception {
		UUID id = UUID.randomUUID();
		WorkoutSession dto = new WorkoutSession(id, DAY, WorkoutSession.WorkoutTypeEnum.GENERAL_WEIGHTS, List.of(), false);
		mockMvc.perform(post("/api/workout-sessions").contentType(MediaType.APPLICATION_JSON)
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
