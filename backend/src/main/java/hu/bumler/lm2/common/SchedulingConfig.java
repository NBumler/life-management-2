package hu.bumler.lm2.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables {@code @Scheduled} support. Currently drives the tombstone retention job
 * ({@link hu.bumler.lm2.common.sync.TombstonePurgeJob}) — the housekeeping half of the offline sync
 * contract (documentation/Architektúra/Backend-offline first.md §"Tombstone-retenció").
 */
@Configuration
@EnableScheduling
class SchedulingConfig {
}
