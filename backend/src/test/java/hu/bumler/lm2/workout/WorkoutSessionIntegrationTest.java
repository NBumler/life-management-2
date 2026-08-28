package hu.bumler.lm2.workout;

import java.math.BigDecimal;
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

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.WorkoutExerciseEntry;
import hu.bumler.lm2.api.model.WorkoutSession;
import hu.bumler.lm2.api.model.WorkoutSetEntry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the three-level nested
 * aggregate diff from documentation/Subfeatures/Edzésnapló.md: idempotent POST replay, PUT tree
 * replace (add/remove at exercise and set level), 409 ENTITY_DELETED, delete cascade + own-deleted
 * GET 200, cross-user 404, and that the whole tree shows up in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class WorkoutSessionIntegrationTest {

	private static final LocalDate DATE = LocalDate.parse("2026-08-28");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private WorkoutSession session(UUID id, List<WorkoutExerciseEntry> exercises) {
		return new WorkoutSession(id, DATE, WorkoutSession.WorkoutTypeEnum.GENERAL_WEIGHTS, exercises, false);
	}

	private WorkoutExerciseEntry exercise(UUID id, UUID sessionId, int orderIndex, List<WorkoutSetEntry> sets) {
		return new WorkoutExerciseEntry(id, sessionId, "Fekvenyomás", WorkoutExerciseEntry.ExerciseCategoryEnum.CHEST,
				WorkoutExerciseEntry.ExerciseKindEnum.WEIGHTED_REPS, orderIndex, sets, false);
	}

	private WorkoutSetEntry workingSet(UUID id, UUID exerciseEntryId, int setNumber, int reps, double weightKg) {
		WorkoutSetEntry set = new WorkoutSetEntry(id, exerciseEntryId, setNumber, WorkoutSetEntry.SetTypeEnum.WORKING, true,
				setNumber - 1, false);
		set.reps(reps);
		set.weightKg(BigDecimal.valueOf(weightKg));
		return set;
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("ws-idempotent");
		UUID id = UUID.randomUUID();
		UUID exId = UUID.randomUUID();
		WorkoutSession dto = session(id, List.of(exercise(exId, id, 0, List.of(workingSet(UUID.randomUUID(), exId, 1, 8, 80)))));

		createSession(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.exercises[0].sets[0].reps").value(8));
		createSession(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.exercises.length()").value(1));
	}

	@Test
	void update_replacesTheTree_addingASetAndRemovingAnExercise() throws Exception {
		String token = registerAndLogin("ws-tree-diff");
		UUID id = UUID.randomUUID();
		UUID keptExerciseId = UUID.randomUUID();
		UUID removedExerciseId = UUID.randomUUID();
		UUID keptSetId = UUID.randomUUID();
		createSession(token, session(id, List.of(
				exercise(keptExerciseId, id, 0, List.of(workingSet(keptSetId, keptExerciseId, 1, 8, 80))),
				exercise(removedExerciseId, id, 1, List.of(workingSet(UUID.randomUUID(), removedExerciseId, 1, 10, 40))))))
				.andExpect(status().isOk());

		UUID addedSetId = UUID.randomUUID();
		WorkoutSession updated = session(id, List.of(exercise(keptExerciseId, id, 0, List.of(
				workingSet(keptSetId, keptExerciseId, 1, 8, 82.5),
				workingSet(addedSetId, keptExerciseId, 2, 6, 85)))));

		MvcResult putResult = mockMvc.perform(put("/api/workout-sessions/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(updated)))
				.andExpect(status().isOk())
				.andReturn();
		WorkoutSession body = objectMapper.readValue(putResult.getResponse().getContentAsString(), WorkoutSession.class);

		assertThat(body.getExercises()).anySatisfy(e -> {
			assertThat(e.getId()).isEqualTo(removedExerciseId);
			assertThat(e.getDeleted()).isTrue();
		});
		assertThat(body.getExercises()).anySatisfy(e -> {
			assertThat(e.getId()).isEqualTo(keptExerciseId);
			assertThat(e.getDeleted()).isFalse();
			assertThat(e.getSets()).filteredOn(s -> !s.getDeleted()).hasSize(2);
			assertThat(e.getSets()).anySatisfy(s -> assertThat(s.getId()).isEqualTo(addedSetId));
		});
	}

	@Test
	void update_returnsEntityDeleted_afterTheSessionWasDeleted() throws Exception {
		String token = registerAndLogin("ws-entity-deleted");
		UUID id = UUID.randomUUID();
		createSession(token, session(id, List.of())).andExpect(status().isOk());
		mockMvc.perform(delete("/api/workout-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/workout-sessions/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(session(id, List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_cascadesToTheTree_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("ws-delete-cascade");
		UUID id = UUID.randomUUID();
		UUID exId = UUID.randomUUID();
		createSession(token, session(id, List.of(exercise(exId, id, 0, List.of(workingSet(UUID.randomUUID(), exId, 1, 8, 80))))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/workout-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/workout-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/workout-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.exercises[0].deleted").value(true))
				.andExpect(jsonPath("$.exercises[0].sets[0].deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenSessionBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("ws-owner-a");
		String tokenB = registerAndLogin("ws-attacker-b");
		UUID id = UUID.randomUUID();
		createSession(tokenA, session(id, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/workout-sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdSessionTree_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("ws-sync-delta");
		UUID id = UUID.randomUUID();
		UUID exId = UUID.randomUUID();
		UUID setId = UUID.randomUUID();
		createSession(token, session(id, List.of(exercise(exId, id, 0, List.of(workingSet(setId, exId, 1, 8, 80))))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"WorkoutSession\"");
		assertThat(body).contains(exId.toString()).contains("\"entityType\":\"WorkoutExerciseEntry\"");
		assertThat(body).contains(setId.toString()).contains("\"entityType\":\"WorkoutSetEntry\"");
	}

	private ResultActions createSession(String token, WorkoutSession dto) throws Exception {
		return mockMvc.perform(post("/api/workout-sessions").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
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
