package hu.bumler.lm2.profile;

import java.math.BigDecimal;
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

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.UserProfile;
import hu.bumler.lm2.api.model.WeightHistoryEntry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end proof of the ownership fix (documentation/Architektúra/Backend.md "idegen user sora
 * → 404"): before today's fix, {@code ProfileService.upsert} and {@code WeightHistoryService.create}
 * looked rows up by the client-supplied id alone, so user B sending user A's id in the request
 * body would silently take over A's row. These tests drive that exact attack shape over real
 * HTTP with two distinct authenticated users and assert both the 404 response and that A's data
 * is provably untouched afterwards.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class CrossUserOwnershipIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void userB_cannotHijackUserAsProfile_bySendingItsIdInAPutBody() throws Exception {
		String tokenA = registerAndLogin("owner-a");
		String tokenB = registerAndLogin("attacker-b");

		UUID profileIdA = UUID.randomUUID();
		UserProfile original = new UserProfile(profileIdA).goal(UserProfile.GoalEnum.MAINTENANCE)
				.currentWeightKg(BigDecimal.valueOf(80.0));
		putProfile(tokenA, original).andExpect(status().isOk());

		// B, authenticated as itself, tries to "edit" A's profile by reusing A's profile id. The
		// weight must stay within the schema's valid range (30-300) so this fails on ownership, not
		// on bean validation.
		UserProfile hijackAttempt = new UserProfile(profileIdA).goal(UserProfile.GoalEnum.MAINTENANCE)
				.currentWeightKg(BigDecimal.valueOf(65.0));
		putProfile(tokenB, hijackAttempt).andExpect(status().isNotFound());

		// A's profile must be exactly as A left it.
		MvcResult afterAttack = getProfile(tokenA).andExpect(status().isOk()).andReturn();
		UserProfile stillA = readProfile(afterAttack);
		assertThat(stillA.getId()).isEqualTo(profileIdA);
		assertThat(stillA.getCurrentWeightKg().orElse(null)).isEqualByComparingTo("80.0");
	}

	@Test
	void userB_cannotHijackUserAsWeightHistoryEntry_byReusingItsId() throws Exception {
		String tokenA = registerAndLogin("weight-owner-a");
		String tokenB = registerAndLogin("weight-attacker-b");

		UUID entryIdA = UUID.randomUUID();
		WeightHistoryEntry original = new WeightHistoryEntry(entryIdA, OffsetDateTime.now(), BigDecimal.valueOf(82.3),
				false);
		mockMvc.perform(post("/api/profile/weight-history").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA).content(json(original)))
				.andExpect(status().isOk());

		// B tries to overwrite it via POST (create/upsert), PUT, and DELETE — all must 404, not
		// silently succeed against A's row.
		WeightHistoryEntry hijackAttempt = new WeightHistoryEntry(entryIdA, OffsetDateTime.now(),
				BigDecimal.valueOf(40.0), false);
		mockMvc.perform(post("/api/profile/weight-history").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB).content(json(hijackAttempt)))
				.andExpect(status().isNotFound());

		mockMvc.perform(get("/api/profile/weight-history/" + entryIdA).header(HttpHeaders.AUTHORIZATION,
				"Bearer " + tokenB)).andExpect(status().isNotFound());

		mockMvc.perform(put("/api/profile/weight-history/" + entryIdA).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB).content(json(hijackAttempt)))
				.andExpect(status().isNotFound());

		mockMvc.perform(delete("/api/profile/weight-history/" + entryIdA).header(HttpHeaders.AUTHORIZATION,
				"Bearer " + tokenB)).andExpect(status().isNotFound());

		// A's entry survived every attempt, completely unmodified and not deleted.
		MvcResult afterAttacks = mockMvc
				.perform(get("/api/profile/weight-history/" + entryIdA).header(HttpHeaders.AUTHORIZATION,
						"Bearer " + tokenA))
				.andExpect(status().isOk()).andReturn();
		WeightHistoryEntry stillA = objectMapper.readValue(afterAttacks.getResponse().getContentAsString(),
				WeightHistoryEntry.class);
		assertThat(stillA.getWeightKg()).isEqualByComparingTo("82.3");
		assertThat(stillA.getDeleted()).isFalse();
	}

	private org.springframework.test.web.servlet.ResultActions putProfile(String token, UserProfile body)
			throws Exception {
		return mockMvc.perform(put("/api/profile").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)));
	}

	private org.springframework.test.web.servlet.ResultActions getProfile(String token) throws Exception {
		return mockMvc.perform(get("/api/profile").header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
	}

	private UserProfile readProfile(MvcResult result) throws Exception {
		return objectMapper.readValue(result.getResponse().getContentAsString(), UserProfile.class);
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
