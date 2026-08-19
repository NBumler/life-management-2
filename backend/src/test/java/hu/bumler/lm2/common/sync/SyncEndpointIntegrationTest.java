package hu.bumler.lm2.common.sync;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
import hu.bumler.lm2.api.model.ApiError;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.SyncChangeItem;
import hu.bumler.lm2.api.model.SyncChangesResponse;
import hu.bumler.lm2.api.model.WeightHistoryEntry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Tesztelési minimum" — cursor-lapozás kihagyás és
 * duplikátum nélkül, {@code 410 CURSOR_TOO_OLD}, plus the two access-control edge cases for the
 * sync/health endpoints (public health check, bearer-required sync pull).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class SyncEndpointIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void health_isPublic_andRespondsWithoutAnAuthorizationHeader() throws Exception {
		mockMvc.perform(get("/api/health")).andExpect(status().isOk());
	}

	@Test
	void syncChanges_withoutBearerToken_is401() throws Exception {
		MvcResult result = mockMvc.perform(get("/api/sync/changes")).andExpect(status().isUnauthorized()).andReturn();
		ApiError error = objectMapper.readValue(result.getResponse().getContentAsString(), ApiError.class);
		assertThat(error.getCode()).isEqualTo("UNAUTHORIZED");
	}

	@Test
	void syncChanges_sinceOlderThanTombstoneHorizon_is410CursorTooOld() throws Exception {
		String token = registerAndLogin("cursor-too-old");
		// V1 migration seeds sync_meta.tombstone_horizon at now() - 180 days; 200 days back is
		// unambiguously past it regardless of how much wall-clock time has elapsed since seeding.
		String staleCursor = SyncCursor.encode(OffsetDateTime.now().minusDays(200), UUID.randomUUID());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").param("since", staleCursor).header(HttpHeaders.AUTHORIZATION,
						"Bearer " + token))
				.andExpect(status().isGone()).andReturn();
		ApiError error = objectMapper.readValue(result.getResponse().getContentAsString(), ApiError.class);
		assertThat(error.getCode()).isEqualTo("CURSOR_TOO_OLD");
	}

	@Test
	void syncChanges_pagesThroughAllChanges_withoutSkippingOrDuplicating() throws Exception {
		String token = registerAndLogin("cursor-paging");

		int entryCount = 7;
		Set<UUID> createdIds = new HashSet<>();
		for (int i = 0; i < entryCount; i++) {
			UUID id = UUID.randomUUID();
			createdIds.add(id);
			WeightHistoryEntry entry = new WeightHistoryEntry(id, OffsetDateTime.now().minusDays(i),
					BigDecimal.valueOf(70 + i), false);
			mockMvc.perform(post("/api/profile/weight-history").contentType(MediaType.APPLICATION_JSON)
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(objectMapper.writeValueAsString(entry)))
					.andExpect(status().isOk());
		}

		List<UUID> seenIds = new ArrayList<>();
		String cursor = null;
		boolean hasMore = true;
		int pagesFetched = 0;
		while (hasMore) {
			var requestBuilder = get("/api/sync/changes").param("limit", "2")
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
			if (cursor != null) {
				requestBuilder = requestBuilder.param("since", cursor);
			}
			MvcResult page = mockMvc.perform(requestBuilder).andExpect(status().isOk()).andReturn();
			SyncChangesResponse response = objectMapper.readValue(page.getResponse().getContentAsString(),
					SyncChangesResponse.class);

			for (SyncChangeItem item : response.getChanges()) {
				if ("WeightHistoryEntry".equals(item.getEntityType()) && createdIds.contains(item.getId())) {
					seenIds.add(item.getId());
				}
			}
			cursor = response.getNextCursor();
			hasMore = response.getHasMore();
			pagesFetched++;
			assertThat(pagesFetched).as("pagination must terminate; runaway loop indicates a cursor bug")
					.isLessThan(50);
		}

		// At least 4 pages for 7 entries at limit=2 (last page has 1 and hasMore=false).
		assertThat(pagesFetched).isGreaterThanOrEqualTo(4);
		assertThat(seenIds).as("no id skipped and none duplicated across pages")
				.containsExactlyInAnyOrderElementsOf(createdIds);
	}

	private String registerAndLogin(String usernamePrefix) throws Exception {
		String username = usernamePrefix + "-" + UUID.randomUUID().toString().substring(0, 8);
		String password = "correct-horse-battery";
		mockMvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key")
				.content(objectMapper.writeValueAsString(new AdminCreateUserRequest(username, password))))
				.andExpect(status().isCreated());

		MvcResult login = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(new LoginRequest(username, password))))
				.andExpect(status().isOk()).andReturn();
		return objectMapper.readValue(login.getResponse().getContentAsString(), AuthTokens.class).getAccessToken();
	}
}
