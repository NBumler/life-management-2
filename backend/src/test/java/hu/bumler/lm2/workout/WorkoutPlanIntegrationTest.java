package hu.bumler.lm2.workout;

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
import hu.bumler.lm2.api.model.Exercise;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.WorkoutPlan;
import hu.bumler.lm2.api.model.WorkoutPlanExercise;
import hu.bumler.lm2.api.model.WorkoutPlanSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the three-level nested
 * aggregate diff from documentation/Subfeatures/Heti terv.md: idempotent POST replay, PUT tree
 * replace (add/remove at exercise and target-set level), the {@code active} toggle riding the plain
 * PUT, 409 ENTITY_DELETED, delete cascade + own-deleted GET 200, cross-user 404, and that the whole
 * tree shows up in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class WorkoutPlanIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private WorkoutPlan plan(UUID id, List<WorkoutPlanExercise> exercises) {
		return new WorkoutPlan(id, "Felsőtest A", true, exercises, false);
	}

	private WorkoutPlanExercise exercise(UUID id, UUID planId, UUID exerciseId, int orderIndex, List<WorkoutPlanSet> targetSets) {
		return new WorkoutPlanExercise(id, planId, exerciseId, "Fekvenyomás",
				WorkoutPlanExercise.ExerciseCategoryEnum.CHEST, WorkoutPlanExercise.ExerciseKindEnum.WEIGHTED_REPS, orderIndex,
				targetSets, false);
	}

	private WorkoutPlanSet workingSet(UUID id, UUID planExerciseId, int orderIndex, int reps, double weightKg) {
		WorkoutPlanSet set = new WorkoutPlanSet(id, planExerciseId, WorkoutPlanSet.SetTypeEnum.WORKING, orderIndex, false);
		set.reps(reps);
		set.weightKg(BigDecimal.valueOf(weightKg));
		return set;
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("wp-idempotent");
		UUID exerciseId = createExercise(token, "Fekvenyomás");
		UUID id = UUID.randomUUID();
		UUID exId = UUID.randomUUID();
		WorkoutPlan dto = plan(id, List.of(exercise(exId, id, exerciseId, 0,
				List.of(workingSet(UUID.randomUUID(), exId, 0, 8, 80)))));

		createPlan(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.exercises[0].targetSets[0].reps").value(8));
		createPlan(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.exercises.length()").value(1));
	}

	@Test
	void update_replacesTheTree_addingATargetSetAndRemovingAnExercise() throws Exception {
		String token = registerAndLogin("wp-tree-diff");
		UUID exerciseId = createExercise(token, "Fekvenyomás");
		UUID id = UUID.randomUUID();
		UUID keptExerciseId = UUID.randomUUID();
		UUID removedExerciseId = UUID.randomUUID();
		UUID keptSetId = UUID.randomUUID();
		createPlan(token, plan(id, List.of(
				exercise(keptExerciseId, id, exerciseId, 0, List.of(workingSet(keptSetId, keptExerciseId, 0, 8, 80))),
				exercise(removedExerciseId, id, exerciseId, 1, List.of(workingSet(UUID.randomUUID(), removedExerciseId, 0, 10, 40))))))
				.andExpect(status().isOk());

		UUID addedSetId = UUID.randomUUID();
		WorkoutPlan updated = plan(id, List.of(exercise(keptExerciseId, id, exerciseId, 0, List.of(
				workingSet(keptSetId, keptExerciseId, 0, 8, 82.5),
				workingSet(addedSetId, keptExerciseId, 1, 6, 85)))));

		MvcResult putResult = mockMvc.perform(put("/api/workout-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(updated)))
				.andExpect(status().isOk())
				.andReturn();
		WorkoutPlan body = objectMapper.readValue(putResult.getResponse().getContentAsString(), WorkoutPlan.class);

		assertThat(body.getExercises()).anySatisfy(e -> {
			assertThat(e.getId()).isEqualTo(removedExerciseId);
			assertThat(e.getDeleted()).isTrue();
		});
		assertThat(body.getExercises()).anySatisfy(e -> {
			assertThat(e.getId()).isEqualTo(keptExerciseId);
			assertThat(e.getDeleted()).isFalse();
			assertThat(e.getTargetSets()).filteredOn(s -> !s.getDeleted()).hasSize(2);
			assertThat(e.getTargetSets()).anySatisfy(s -> assertThat(s.getId()).isEqualTo(addedSetId));
		});
	}

	@Test
	void update_persistsTheActiveFlag_throughThePlainPut() throws Exception {
		String token = registerAndLogin("wp-deactivate");
		UUID id = UUID.randomUUID();
		createPlan(token, plan(id, List.of())).andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true));

		WorkoutPlan deactivated = plan(id, List.of());
		deactivated.active(false);
		mockMvc.perform(put("/api/workout-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(deactivated)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.active").value(false));

		mockMvc.perform(get("/api/workout-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.active").value(false));
	}

	@Test
	void update_returnsEntityDeleted_afterThePlanWasDeleted() throws Exception {
		String token = registerAndLogin("wp-entity-deleted");
		UUID id = UUID.randomUUID();
		createPlan(token, plan(id, List.of())).andExpect(status().isOk());
		mockMvc.perform(delete("/api/workout-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/workout-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(plan(id, List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_cascadesToTheTree_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("wp-delete-cascade");
		UUID exerciseId = createExercise(token, "Fekvenyomás");
		UUID id = UUID.randomUUID();
		UUID exId = UUID.randomUUID();
		createPlan(token, plan(id, List.of(exercise(exId, id, exerciseId, 0,
				List.of(workingSet(UUID.randomUUID(), exId, 0, 8, 80))))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/workout-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/workout-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/workout-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.exercises[0].deleted").value(true))
				.andExpect(jsonPath("$.exercises[0].targetSets[0].deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenPlanBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("wp-owner-a");
		String tokenB = registerAndLogin("wp-attacker-b");
		UUID id = UUID.randomUUID();
		createPlan(tokenA, plan(id, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/workout-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdPlanTree_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("wp-sync-delta");
		UUID exerciseId = createExercise(token, "Fekvenyomás");
		UUID id = UUID.randomUUID();
		UUID exId = UUID.randomUUID();
		UUID setId = UUID.randomUUID();
		createPlan(token, plan(id, List.of(exercise(exId, id, exerciseId, 0, List.of(workingSet(setId, exId, 0, 8, 80))))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"WorkoutPlan\"");
		assertThat(body).contains(exId.toString()).contains("\"entityType\":\"WorkoutPlanExercise\"");
		assertThat(body).contains(setId.toString()).contains("\"entityType\":\"WorkoutPlanSet\"");
	}

	private ResultActions createPlan(String token, WorkoutPlan dto) throws Exception {
		return mockMvc.perform(post("/api/workout-plans").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
	}

	private UUID createExercise(String token, String name) throws Exception {
		UUID id = UUID.randomUUID();
		Exercise dto = new Exercise(id, name, Exercise.CategoryEnum.CHEST, Exercise.KindEnum.WEIGHTED_REPS, false, false);
		mockMvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON)
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
