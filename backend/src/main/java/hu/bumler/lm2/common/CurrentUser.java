package hu.bumler.lm2.common;

import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** The authenticated userId, set by the JWT filter as the Authentication name. */
@Component
public class CurrentUser {

	public UUID id() {
		String name = SecurityContextHolder.getContext().getAuthentication().getName();
		return UUID.fromString(name);
	}
}
