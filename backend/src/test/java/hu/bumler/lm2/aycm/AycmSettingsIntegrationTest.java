package hu.bumler.lm2.aycm;

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

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.AycmSettings;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Features/AYCM tracker.md — the AYCM settings singleton: GET never 404s (lazy default
 * at 200), PUT upserts a single per-user row, the link can be set and cleared, and the row shows up
 * in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class AycmSettingsIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void get_returnsLazyDefault_beforeAnyPut() throws Exception {
		String token = registerAndLogin("aycm-set-lazy");

		mockMvc.perform(get("/api/aycm-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").isNotEmpty())
				.andExpect(jsonPath("$.linkedRecurringExpenseId").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void put_thenGet_roundTripsTheLink_andKeepsAStableId() throws Exception {
		String token = registerAndLogin("aycm-set-link");
		String lazyId = idOf(mockMvc
				.perform(get("/api/aycm-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andReturn());

		UUID expenseId = UUID.randomUUID();
		AycmSettings body = new AycmSettings(UUID.fromString(lazyId));
		body.linkedRecurringExpenseId(expenseId);
		mockMvc.perform(put("/api/aycm-settings").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(lazyId))
				.andExpect(jsonPath("$.linkedRecurringExpenseId").value(expenseId.toString()));

		mockMvc.perform(get("/api/aycm-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(lazyId))
				.andExpect(jsonPath("$.linkedRecurringExpenseId").value(expenseId.toString()));
	}

	@Test
	void put_isASingletonUpsert_secondCallWins_andCanClearTheLink() throws Exception {
		String token = registerAndLogin("aycm-set-clear");
		String id = idOf(mockMvc
				.perform(get("/api/aycm-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andReturn());

		AycmSettings linked = new AycmSettings(UUID.fromString(id));
		linked.linkedRecurringExpenseId(UUID.randomUUID());
		putSettings(token, linked).andExpect(status().isOk());

		AycmSettings cleared = new AycmSettings(UUID.fromString(id));
		cleared.linkedRecurringExpenseId(null);
		putSettings(token, cleared).andExpect(status().isOk())
				.andExpect(jsonPath("$.linkedRecurringExpenseId").value(org.hamcrest.Matchers.nullValue()));

		mockMvc.perform(get("/api/aycm-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(jsonPath("$.linkedRecurringExpenseId").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void settings_appearInTheDeltaPull_afterAPut() throws Exception {
		String token = registerAndLogin("aycm-set-sync");
		String id = idOf(mockMvc
				.perform(get("/api/aycm-settings").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andReturn());
		AycmSettings body = new AycmSettings(UUID.fromString(id));
		body.linkedRecurringExpenseId(UUID.randomUUID());
		putSettings(token, body).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		assertThat(result.getResponse().getContentAsString())
				.contains(id).contains("\"entityType\":\"AycmSettings\"");
	}

	private org.springframework.test.web.servlet.ResultActions putSettings(String token, AycmSettings body)
			throws Exception {
		return mockMvc.perform(put("/api/aycm-settings").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)));
	}

	private String idOf(MvcResult result) throws Exception {
		return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
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
