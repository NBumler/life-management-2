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
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.AycmPartner;
import hu.bumler.lm2.api.model.AycmPriceRule;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for a fresh entity, plus the
 * AYCM-specific rules: 409 UNIQUE_VIOLATION on a duplicate live partner name
 * (documentation/Architektúra/Névegyediség.md), 400 on a price-rule interval overlap, and the
 * partner-delete → live-rules cascade (documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class AycmPartnerIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static AycmPartner partner(UUID id, String name) {
		return new AycmPartner(id, name, false);
	}

	private static AycmPriceRule rule(UUID id, UUID partnerId, String start, String end) {
		return new AycmPriceRule(id, partnerId, true, true, true, true, true, false, false, start, end, 2500, 0, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("aycm-idem");
		AycmPartner body = partner(UUID.randomUUID(), "Life1");

		createPartner(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Life1"));
		createPartner(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Life1"));
	}

	@Test
	void create_rejectsDuplicateLiveName_with409() throws Exception {
		String token = registerAndLogin("aycm-dup");
		UUID firstId = UUID.randomUUID();
		createPartner(token, partner(firstId, "Life1 Kondi")).andExpect(status().isOk());

		createPartner(token, partner(UUID.randomUUID(), "life1  kondi"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void update_returnsEntityDeleted_afterPartnerWasDeleted() throws Exception {
		String token = registerAndLogin("aycm-del");
		UUID id = UUID.randomUUID();
		createPartner(token, partner(id, "Gym")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/aycm-partners/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/aycm-partners/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(partner(id, "Gym 2"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void get_returnsNotFound_whenPartnerBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("aycm-owner");
		String tokenB = registerAndLogin("aycm-attacker");
		UUID id = UUID.randomUUID();
		createPartner(tokenA, partner(id, "Gym")).andExpect(status().isOk());

		mockMvc.perform(get("/api/aycm-partners/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void ownDeletedPartner_stillReturns200OnGet_andAppearsInDeltaPull() throws Exception {
		String token = registerAndLogin("aycm-sync");
		UUID id = UUID.randomUUID();
		createPartner(token, partner(id, "Gym")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/aycm-partners/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/aycm-partners/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		assertThat(result.getResponse().getContentAsString())
				.contains(id.toString()).contains("\"entityType\":\"AycmPartner\"");
	}

	@Test
	void priceRule_rejectsOverlappingIntervalOnSharedWeekday_with400() throws Exception {
		String token = registerAndLogin("aycm-overlap");
		UUID partnerId = UUID.randomUUID();
		createPartner(token, partner(partnerId, "Gym")).andExpect(status().isOk());

		createRule(token, partnerId, rule(UUID.randomUUID(), partnerId, "08:00", "12:00")).andExpect(status().isOk());
		createRule(token, partnerId, rule(UUID.randomUUID(), partnerId, "11:00", "14:00"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void partnerDelete_cascadesToLivePriceRules() throws Exception {
		String token = registerAndLogin("aycm-cascade");
		UUID partnerId = UUID.randomUUID();
		UUID ruleId = UUID.randomUUID();
		createPartner(token, partner(partnerId, "Gym")).andExpect(status().isOk());
		createRule(token, partnerId, rule(ruleId, partnerId, "08:00", "12:00")).andExpect(status().isOk());

		mockMvc.perform(delete("/api/aycm-partners/" + partnerId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/aycm-partners/" + partnerId + "/price-rules/" + ruleId)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void priceRuleEndpoints_404_whenTheRuleBelongsToAnotherPartnerInThePath() throws Exception {
		String token = registerAndLogin("aycm-rule-partner");
		UUID partnerA = UUID.randomUUID();
		UUID partnerB = UUID.randomUUID();
		UUID ruleId = UUID.randomUUID();
		createPartner(token, partner(partnerA, "Gym A")).andExpect(status().isOk());
		createPartner(token, partner(partnerB, "Gym B")).andExpect(status().isOk());
		createRule(token, partnerA, rule(ruleId, partnerA, "08:00", "12:00")).andExpect(status().isOk());

		String wrongPath = "/api/aycm-partners/" + partnerB + "/price-rules/" + ruleId;
		mockMvc.perform(get(wrongPath).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound());
		mockMvc.perform(put(wrongPath).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(rule(ruleId, partnerB, "08:00", "12:00"))))
				.andExpect(status().isNotFound());
		mockMvc.perform(delete(wrongPath).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isNotFound());

		// The rule is untouched under its real partner.
		mockMvc.perform(get("/api/aycm-partners/" + partnerA + "/price-rules/" + ruleId)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(false));
	}

	private ResultActions createPartner(String token, AycmPartner body) throws Exception {
		return mockMvc.perform(post("/api/aycm-partners").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)));
	}

	private ResultActions createRule(String token, UUID partnerId, AycmPriceRule body) throws Exception {
		return mockMvc.perform(post("/api/aycm-partners/" + partnerId + "/price-rules")
				.contentType(MediaType.APPLICATION_JSON)
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
