package hu.bumler.lm2.gear;

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

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.GearItem;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.PackingTemplate;
import hu.bumler.lm2.api.model.PackingTemplateDetail;
import hu.bumler.lm2.api.model.PackingTemplateItem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers what PackingTemplateServiceTest's mocks cannot: real nested-tree persistence (create with
 * items, PUT-driven add/reorder/remove diff against actual rows), idempotent replay, the GearItem
 * delete → PackingTemplateItem cascade across two services/tables, and delta-pull visibility for
 * both PackingTemplate and PackingTemplateItem entity types.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class PackingTemplateIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createWithItems_thenReplayingTheSamePost_isIdempotent() throws Exception {
		String token = registerAndLogin("template-idempotent");
		UUID gearId = createGearItem(token, "Kötél");

		UUID templateId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		PackingTemplateDetail dto = new PackingTemplateDetail(templateId, "Hétvégi mászás", false,
				List.of(new PackingTemplateItem(itemId, templateId, gearId, 0, false)));

		createTemplate(token, dto).andExpect(status().isOk())
				.andExpect(jsonPath("$.items.length()").value(1))
				.andExpect(jsonPath("$.items[0].gearItemId").value(gearId.toString()));
		createTemplate(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
	}

	@Test
	void putReplacesTheTree_addingReorderingAndRemovingItems() throws Exception {
		String token = registerAndLogin("template-diff");
		UUID gearA = createGearItem(token, "Sátor");
		UUID gearB = createGearItem(token, "Hálózsák");
		UUID gearC = createGearItem(token, "Matrac");

		UUID templateId = UUID.randomUUID();
		UUID itemA = UUID.randomUUID();
		UUID itemB = UUID.randomUUID();
		createTemplate(token, new PackingTemplateDetail(templateId, "Tél", false,
				List.of(new PackingTemplateItem(itemA, templateId, gearA, 0, false), new PackingTemplateItem(itemB, templateId, gearB, 1, false))))
				.andExpect(status().isOk());

		// Second save: drop B, keep A but move it to index 1, add a brand-new item C at index 0.
		UUID itemC = UUID.randomUUID();
		MvcResult result = putTemplate(token, templateId,
				new PackingTemplateDetail(templateId, "Tél", false,
						List.of(new PackingTemplateItem(itemC, templateId, gearC, 0, false), new PackingTemplateItem(itemA, templateId, gearA, 1, false))))
				.andExpect(status().isOk()).andReturn();

		PackingTemplateDetail after = objectMapper.readValue(result.getResponse().getContentAsString(), PackingTemplateDetail.class);
		assertThat(after.getItems()).hasSize(3); // A (live), C (live), B (tombstoned) — all rows ever created.
		assertThat(itemById(after, itemA).getDeleted()).isFalse();
		assertThat(itemById(after, itemA).getSortOrder()).isEqualTo(1);
		assertThat(itemById(after, itemC).getDeleted()).isFalse();
		assertThat(itemById(after, itemC).getGearItemId()).isEqualTo(gearC);
		assertThat(itemById(after, itemB).getDeleted()).isTrue();
	}

	@Test
	void list_reportsLiveItemCountPerRow_ignoringTombstonedItems() throws Exception {
		String token = registerAndLogin("template-item-count");
		UUID gearA = createGearItem(token, "Kötél");
		UUID gearB = createGearItem(token, "Beülő");

		UUID withItems = UUID.randomUUID();
		UUID itemA = UUID.randomUUID();
		UUID itemB = UUID.randomUUID();
		createTemplate(token, new PackingTemplateDetail(withItems, "Van benne", false,
				List.of(new PackingTemplateItem(itemA, withItems, gearA, 0, false),
						new PackingTemplateItem(itemB, withItems, gearB, 1, false)))).andExpect(status().isOk());
		// Drop one item via the tree PUT — it becomes a tombstone and must not be counted.
		putTemplate(token, withItems, new PackingTemplateDetail(withItems, "Van benne", false,
				List.of(new PackingTemplateItem(itemA, withItems, gearA, 0, false)))).andExpect(status().isOk());

		createTemplate(token, new PackingTemplateDetail(UUID.randomUUID(), "Üres", false, List.of())).andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/packing-templates").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		List<PackingTemplate> list = objectMapper.readValue(
				result.getResponse().getContentAsString(), new TypeReference<List<PackingTemplate>>() { });

		assertThat(list).extracting(PackingTemplate::getName, PackingTemplate::getItemCount)
				.contains(tuple("Van benne", 1), tuple("Üres", 0));
	}

	@Test
	void create_returnsUniqueViolation_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("template-unique");
		createTemplate(token, new PackingTemplateDetail(UUID.randomUUID(), "Sablon A", false, List.of())).andExpect(status().isOk());

		createTemplate(token, new PackingTemplateDetail(UUID.randomUUID(), "Sablon A", false, List.of()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"));
	}

	@Test
	void delete_cascadesToLiveItems_butLeavesGearItemCatalogUntouched() throws Exception {
		String token = registerAndLogin("template-delete-cascade");
		UUID gearId = createGearItem(token, "Kötél");
		UUID templateId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createTemplate(token, new PackingTemplateDetail(templateId, "Sablon", false,
				List.of(new PackingTemplateItem(itemId, templateId, gearId, 0, false)))).andExpect(status().isOk());

		mockMvc.perform(delete("/api/packing-templates/" + templateId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.items[0].deleted").value(true));

		// The gear catalog entry itself is untouched (documentation/Subfeatures/Sablonok.md).
		mockMvc.perform(get("/api/gear-items/" + gearId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andExpect(jsonPath("$.deleted").value(false));
	}

	@Test
	void deletingAGearItem_cascadesToItsLiveTemplateItems() throws Exception {
		String token = registerAndLogin("gear-tpl-cascade");
		UUID gearId = createGearItem(token, "Fejlámpa");
		UUID templateId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createTemplate(token, new PackingTemplateDetail(templateId, "Sablon B", false,
				List.of(new PackingTemplateItem(itemId, templateId, gearId, 0, false)))).andExpect(status().isOk());

		mockMvc.perform(delete("/api/gear-items/" + gearId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/packing-templates/" + templateId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(false)) // the template itself is untouched — only the item row cascades.
				.andExpect(jsonPath("$.items[0].deleted").value(true));
	}

	@Test
	void put_rejectsItemId_thatBelongsToAnotherUsersTemplate_insteadOfHijackingItViaJpaMerge() throws Exception {
		String tokenA = registerAndLogin("tpl-hijack-victim");
		String tokenB = registerAndLogin("tpl-hijack-atk");
		UUID gearA = createGearItem(tokenA, "Ereszkedő 8-as");
		UUID victimTemplateId = UUID.randomUUID();
		UUID victimItemId = UUID.randomUUID();
		createTemplate(tokenA, new PackingTemplateDetail(victimTemplateId, "A sablonja", false,
				List.of(new PackingTemplateItem(victimItemId, victimTemplateId, gearA, 0, false)))).andExpect(status().isOk());

		UUID gearB = createGearItem(tokenB, "B kötele");
		UUID myTemplateId = UUID.randomUUID();
		createTemplate(tokenB, new PackingTemplateDetail(myTemplateId, "B sablonja", false, List.of())).andExpect(status().isOk());

		// B tries to smuggle A's item id into B's own template PUT.
		putTemplate(tokenB, myTemplateId,
				new PackingTemplateDetail(myTemplateId, "B sablonja", false,
						List.of(new PackingTemplateItem(victimItemId, myTemplateId, gearB, 0, false))))
				.andExpect(status().isNotFound());

		// A's template and item must be completely untouched.
		MvcResult result = mockMvc
				.perform(get("/api/packing-templates/" + victimTemplateId).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
				.andExpect(status().isOk()).andReturn();
		PackingTemplateDetail afterAttack = objectMapper.readValue(result.getResponse().getContentAsString(), PackingTemplateDetail.class);
		assertThat(itemById(afterAttack, victimItemId).getGearItemId()).isEqualTo(gearA);
		assertThat(itemById(afterAttack, victimItemId).getDeleted()).isFalse();
	}

	@Test
	void createOrUpdate_rejectsItem_referencingAnotherUsersGearItem() throws Exception {
		String tokenA = registerAndLogin("tpl-frn-gear-victim");
		String tokenB = registerAndLogin("tpl-frn-gear-atk");
		UUID gearA = createGearItem(tokenA, "Sisak");
		UUID templateId = UUID.randomUUID();

		createTemplate(tokenB,
				new PackingTemplateDetail(templateId, "B sablonja", false,
						List.of(new PackingTemplateItem(UUID.randomUUID(), templateId, gearA, 0, false))))
				.andExpect(status().isNotFound());
	}

	@Test
	void cascadeFromGearItemDelete_bumpsUpdatedAt_soItAppearsInAnIncrementalDeltaPull() throws Exception {
		String token = registerAndLogin("template-cascade-delta");
		UUID gearId = createGearItem(token, "Mászóhevederzet");
		UUID templateId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createTemplate(token, new PackingTemplateDetail(templateId, "Kaland", false,
				List.of(new PackingTemplateItem(itemId, templateId, gearId, 0, false)))).andExpect(status().isOk());

		// First pull: capture the cursor once everything so far is caught up.
		MvcResult firstPull = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String cursor = objectMapper.readTree(firstPull.getResponse().getContentAsString()).get("nextCursor").asText();

		mockMvc.perform(delete("/api/gear-items/" + gearId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());

		// Delta pull from that cursor must show the cascaded item as a fresh, tombstoned change.
		MvcResult secondPull = mockMvc
				.perform(get("/api/sync/changes").queryParam("since", cursor).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = secondPull.getResponse().getContentAsString();
		assertThat(body).contains("\"entityType\":\"PackingTemplateItem\"").contains(itemId.toString()).contains("\"deleted\":true");
	}

	@Test
	void get_returnsNotFound_whenTemplateBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("template-owner-a");
		String tokenB = registerAndLogin("template-attacker-b");
		UUID templateId = UUID.randomUUID();
		createTemplate(tokenA, new PackingTemplateDetail(templateId, "Sablon C", false, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/packing-templates/" + templateId).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdTemplateAndItem_appearInTheDeltaPull() throws Exception {
		String token = registerAndLogin("template-sync-delta");
		UUID gearId = createGearItem(token, "Ereszkedő eszköz");
		UUID templateId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createTemplate(token, new PackingTemplateDetail(templateId, "Sablon D", false,
				List.of(new PackingTemplateItem(itemId, templateId, gearId, 0, false)))).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains("\"entityType\":\"PackingTemplate\"").contains(templateId.toString());
		assertThat(body).contains("\"entityType\":\"PackingTemplateItem\"").contains(itemId.toString());
	}

	private static PackingTemplateItem itemById(PackingTemplateDetail detail, UUID id) {
		return detail.getItems().stream().filter(i -> i.getId().equals(id)).findFirst().orElseThrow();
	}

	private UUID createGearItem(String token, String name) throws Exception {
		UUID id = UUID.randomUUID();
		mockMvc.perform(post("/api/gear-items").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(new GearItem(id, name, false))))
				.andExpect(status().isOk());
		return id;
	}

	private ResultActions createTemplate(String token, PackingTemplateDetail dto) throws Exception {
		return mockMvc.perform(post("/api/packing-templates").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
	}

	private ResultActions putTemplate(String token, UUID id, PackingTemplateDetail dto) throws Exception {
		return mockMvc.perform(put("/api/packing-templates/" + id).contentType(MediaType.APPLICATION_JSON)
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
