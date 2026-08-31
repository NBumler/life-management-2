package hu.bumler.lm2.finance;

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
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.RecurringExpense;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for a fresh entity: idempotent
 * POST replay, 409 ENTITY_DELETED on a PUT after delete, cross-user 404, own deleted row still 200
 * on GET, a create shows up in the delta pull, plus the blank-name validation
 * (documentation/Subfeatures/Rendszeres kiadások.md "Entitás").
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class RecurringExpenseIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static RecurringExpense expense(UUID id) {
		return new RecurringExpense(id, "Netflix", 4990, RecurringExpense.FrequencyEnum.MONTHLY,
				RecurringExpense.CategoryEnum.ENTERTAINMENT, LocalDate.parse("2026-09-10"), 10, true, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("re-idempotent");
		RecurringExpense body = expense(UUID.randomUUID());

		createExpense(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.amountHuf").value(4990));
		createExpense(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.amountHuf").value(4990));
	}

	@Test
	void create_rejectsBlankName() throws Exception {
		String token = registerAndLogin("re-blank-name");
		RecurringExpense body = expense(UUID.randomUUID());
		body.setName("   ");

		createExpense(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("name"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheExpenseWasDeleted() throws Exception {
		String token = registerAndLogin("re-entity-deleted");
		UUID id = UUID.randomUUID();
		createExpense(token, expense(id)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/recurring-expenses/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		RecurringExpense changed = expense(id);
		changed.setAmountHuf(5990);
		mockMvc.perform(put("/api/recurring-expenses/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(changed)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("re-del-idempotent");
		UUID id = UUID.randomUUID();
		createExpense(token, expense(id)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/recurring-expenses/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/recurring-expenses/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/recurring-expenses/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenExpenseBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("re-owner-a");
		String tokenB = registerAndLogin("re-attacker-b");
		UUID id = UUID.randomUUID();
		createExpense(tokenA, expense(id)).andExpect(status().isOk());

		mockMvc.perform(get("/api/recurring-expenses/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdExpense_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("re-sync-delta");
		UUID id = UUID.randomUUID();
		createExpense(token, expense(id)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"RecurringExpense\"");
	}

	private ResultActions createExpense(String token, RecurringExpense body) throws Exception {
		return mockMvc.perform(post("/api/recurring-expenses").contentType(MediaType.APPLICATION_JSON)
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
