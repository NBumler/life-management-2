package hu.bumler.lm2.steps;

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
import hu.bumler.lm2.api.model.DailyStepLog;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for a fresh entity: idempotent
 * POST replay, revive-on-POST after delete (the id is a deterministic v5), 409 ENTITY_DELETED on a
 * PUT after delete, cross-user 404, and a create shows up in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class DailyStepLogIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static DailyStepLog log(UUID id, int stepCount) {
		return new DailyStepLog(id, LocalDate.parse("2026-09-01"), stepCount, false);
	}

	@Test
	void createIsIdempotent_andLastWriteWins_evenWithASmallerValue() throws Exception {
		String token = registerAndLogin("steps-idempotent");
		UUID id = UUID.randomUUID();

		createStepLog(token, log(id, 8000)).andExpect(status().isOk()).andExpect(jsonPath("$.stepCount").value(8000));
		createStepLog(token, log(id, 150)).andExpect(status().isOk()).andExpect(jsonPath("$.stepCount").value(150));
	}

	@Test
	void post_revivesTheRow_afterItWasDeleted() throws Exception {
		String token = registerAndLogin("steps-revive");
		UUID id = UUID.randomUUID();
		createStepLog(token, log(id, 4000)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/daily-step-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		createStepLog(token, log(id, 6000))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(false))
				.andExpect(jsonPath("$.stepCount").value(6000));
	}

	@Test
	void update_returnsEntityDeleted_afterTheLogWasDeleted() throws Exception {
		String token = registerAndLogin("steps-entity-deleted");
		UUID id = UUID.randomUUID();
		createStepLog(token, log(id, 4000)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/daily-step-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/daily-step-logs/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(log(id, 5000))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void get_returnsNotFound_whenLogBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("steps-owner-a");
		String tokenB = registerAndLogin("steps-attacker-b");
		UUID id = UUID.randomUUID();
		createStepLog(tokenA, log(id, 4000)).andExpect(status().isOk());

		mockMvc.perform(get("/api/daily-step-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdLog_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("steps-sync-delta");
		UUID id = UUID.randomUUID();
		createStepLog(token, log(id, 4000)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"DailyStepLog\"");
	}

	private ResultActions createStepLog(String token, DailyStepLog body) throws Exception {
		return mockMvc.perform(post("/api/daily-step-logs").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)));
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
