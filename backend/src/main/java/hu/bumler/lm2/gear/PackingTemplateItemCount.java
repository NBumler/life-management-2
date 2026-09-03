package hu.bumler.lm2.gear;

import java.util.UUID;

/**
 * One row of {@link PackingTemplateItemRepository#countLiveItemsByTemplateIds}: the number of live
 * (non-tombstoned) items on a template, fetched for the whole template list in a single grouped
 * query instead of a per-template count (documentation/Subfeatures/Sablonok.md).
 */
record PackingTemplateItemCount(UUID templateId, long count) {
}
