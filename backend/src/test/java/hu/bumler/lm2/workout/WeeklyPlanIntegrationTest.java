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

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.WeeklyPlan;
import hu.bumler.lm2.api.model.WeeklyPlanSlot;
import hu.bumler.lm2.api.model.WorkoutPlan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the two-level nested
 * aggregate diff from documentation/Subfeatures/Heti terv.md: idempotent POST replay, a re-create for
 * the same week reviving a tombstoned row, PUT slot replace (add/remove), 409 ENTITY_DELETED, delete
 * cascade + own-deleted GET 200, cross-user 404, delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class WeeklyPlanIntegrationTest {

	/** 2026-08-24 is a Monday. */
	private static final LocalDate WEEK_START = LocalDate.parse("2026-08-24");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private WeeklyPlan weeklyPlan(UUID id, List<WeeklyPlanSlot> slots) {
		return new WeeklyPlan(id, WEEK_START, slots, false);
	}

	private WeeklyPlanSlot slot(UUID id, UUID weeklyPlanId, WeeklyPlanSlot.DayOfWeekEnum day, UUID planId) {
		return new WeeklyPlanSlot(id, weeklyPlanId, day, planId, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("wkp-idempotent");
		UUID planId = createWorkoutPlan(token);
		UUID id = UUID.randomUUID();
		WeeklyPlan dto = weeklyPlan(id, List.of(slot(UUID.randomUUID(), id, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, planId)));

		createWeeklyPlan(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.slots.length()").value(1));
		createWeeklyPlan(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.slots.length()").value(1));
	}

	@Test
	void create_revivesATombstonedWeek_whenReCreatedWithTheSameId() throws Exception {
		String token = registerAndLogin("wkp-revive");
		UUID planId = createWorkoutPlan(token);
		UUID id = UUID.randomUUID();
		createWeeklyPlan(token, weeklyPlan(id, List.of())).andExpect(status().isOk());
		mockMvc.perform(delete("/api/weekly-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		createWeeklyPlan(token, weeklyPlan(id, List.of(slot(UUID.randomUUID(), id, WeeklyPlanSlot.DayOfWeekEnum.TUESDAY, planId))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(false))
				.andExpect(jsonPath("$.slots.length()").value(1));
	}

	@Test
	void update_replacesTheSlots_addingOneAndRemovingAnother() throws Exception {
		String token = registerAndLogin("wkp-tree-diff");
		UUID planId = createWorkoutPlan(token);
		UUID id = UUID.randomUUID();
		UUID keptSlotId = UUID.randomUUID();
		UUID removedSlotId = UUID.randomUUID();
		createWeeklyPlan(token, weeklyPlan(id, List.of(
				slot(keptSlotId, id, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, planId),
				slot(removedSlotId, id, WeeklyPlanSlot.DayOfWeekEnum.WEDNESDAY, planId))))
				.andExpect(status().isOk());

		UUID addedSlotId = UUID.randomUUID();
		WeeklyPlan updated = weeklyPlan(id, List.of(
				slot(keptSlotId, id, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, planId),
				slot(addedSlotId, id, WeeklyPlanSlot.DayOfWeekEnum.FRIDAY, planId)));

		MvcResult putResult = mockMvc.perform(put("/api/weekly-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(updated)))
				.andExpect(status().isOk())
				.andReturn();
		WeeklyPlan body = objectMapper.readValue(putResult.getResponse().getContentAsString(), WeeklyPlan.class);

		assertThat(body.getSlots()).anySatisfy(s -> {
			assertThat(s.getId()).isEqualTo(removedSlotId);
			assertThat(s.getDeleted()).isTrue();
		});
		assertThat(body.getSlots()).filteredOn(s -> !s.getDeleted()).anySatisfy(s -> assertThat(s.getId()).isEqualTo(addedSlotId));
	}

	@Test
	void update_returnsEntityDeleted_afterTheWeeklyPlanWasDeleted() throws Exception {
		String token = registerAndLogin("wkp-entity-deleted");
		UUID id = UUID.randomUUID();
		createWeeklyPlan(token, weeklyPlan(id, List.of())).andExpect(status().isOk());
		mockMvc.perform(delete("/api/weekly-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/weekly-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(weeklyPlan(id, List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_cascadesToSlots_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("wkp-delete-cascade");
		UUID planId = createWorkoutPlan(token);
		UUID id = UUID.randomUUID();
		createWeeklyPlan(token, weeklyPlan(id, List.of(slot(UUID.randomUUID(), id, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, planId))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/weekly-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/weekly-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/weekly-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.slots[0].deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenWeeklyPlanBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("wkp-owner-a");
		String tokenB = registerAndLogin("wkp-attacker-b");
		UUID id = UUID.randomUUID();
		createWeeklyPlan(tokenA, weeklyPlan(id, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/weekly-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdWeeklyPlanTree_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("wkp-sync-delta");
		UUID planId = createWorkoutPlan(token);
		UUID id = UUID.randomUUID();
		UUID slotId = UUID.randomUUID();
		createWeeklyPlan(token, weeklyPlan(id, List.of(slot(slotId, id, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, planId))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"WeeklyPlan\"");
		assertThat(body).contains(slotId.toString()).contains("\"entityType\":\"WeeklyPlanSlot\"");
	}

	private ResultActions createWeeklyPlan(String token, WeeklyPlan dto) throws Exception {
		return mockMvc.perform(post("/api/weekly-plans").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
	}

	private UUID createWorkoutPlan(String token) throws Exception {
		UUID id = UUID.randomUUID();
		WorkoutPlan dto = new WorkoutPlan(id, "Felsőtest A", true, List.of(), false);
		mockMvc.perform(post("/api/workout-plans").contentType(MediaType.APPLICATION_JSON)
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
