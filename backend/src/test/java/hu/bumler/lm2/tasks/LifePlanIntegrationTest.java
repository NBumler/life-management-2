package hu.bumler.lm2.tasks;

import java.time.OffsetDateTime;
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
import hu.bumler.lm2.api.model.LifePlan;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek" that apply to a
 * fresh entity: idempotent POST replay, 409 ENTITY_DELETED on a PUT after delete, cross-user 404,
 * a create shows up in the delta pull, and the status/completedAt 400 validation
 * (documentation/Subfeatures/Élet tervek.md "Állapotgép").
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class LifePlanIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("lifeplan-idempotent");
		UUID id = UUID.randomUUID();
		LifePlan plan = new LifePlan(id, "Motoros jogosítvány", LifePlan.StatusEnum.PLANNED, false);

		createLifePlan(token, plan).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Motoros jogosítvány"));
		createLifePlan(token, plan).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Motoros jogosítvány"));
	}

	@Test
	void create_rejectsDoneStatus_withoutCompletedAt() throws Exception {
		String token = registerAndLogin("lifeplan-validation");
		UUID id = UUID.randomUUID();
		LifePlan plan = new LifePlan(id, "Maraton", LifePlan.StatusEnum.DONE, false);

		createLifePlan(token, plan)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("completedAt"));
	}

	@Test
	void create_acceptsDoneStatus_withCompletedAt() throws Exception {
		String token = registerAndLogin("lifeplan-done");
		UUID id = UUID.randomUUID();
		LifePlan plan = new LifePlan(id, "Maraton", LifePlan.StatusEnum.DONE, false);
		plan.completedAt(OffsetDateTime.now());

		createLifePlan(token, plan).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DONE"));
	}

	@Test
	void update_returnsEntityDeleted_afterThePlanWasDeleted() throws Exception {
		String token = registerAndLogin("lifeplan-entity-deleted");
		UUID id = UUID.randomUUID();
		createLifePlan(token, new LifePlan(id, "Rope-solo tanfolyam", LifePlan.StatusEnum.PLANNED, false))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/life-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/life-plans/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new LifePlan(id, "Rope-solo tanfolyam (átírva)", LifePlan.StatusEnum.PLANNED, false))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("lifeplan-del-idempotent");
		UUID id = UUID.randomUUID();
		createLifePlan(token, new LifePlan(id, "Költözés", LifePlan.StatusEnum.PLANNED, false)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/life-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/life-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/life-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenPlanBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("lifeplan-owner-a");
		String tokenB = registerAndLogin("lifeplan-attacker-b");
		UUID id = UUID.randomUUID();
		createLifePlan(tokenA, new LifePlan(id, "Motoros jogosítvány", LifePlan.StatusEnum.PLANNED, false))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/life-plans/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdPlan_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("lifeplan-sync-delta");
		UUID id = UUID.randomUUID();
		createLifePlan(token, new LifePlan(id, "Rope-solo tanfolyam", LifePlan.StatusEnum.PLANNED, false))
				.andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"LifePlan\"");
	}

	private ResultActions createLifePlan(String token, LifePlan plan) throws Exception {
		return mockMvc.perform(post("/api/life-plans").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(plan)));
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
