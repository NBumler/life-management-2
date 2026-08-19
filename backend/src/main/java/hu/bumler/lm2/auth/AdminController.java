package hu.bumler.lm2.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.AdminApi;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AdminSetPasswordRequest;
import hu.bumler.lm2.api.model.AdminUser;

@RestController
class AdminController implements AdminApi {

	private final AdminUserService adminUserService;

	AdminController(AdminUserService adminUserService) {
		this.adminUserService = adminUserService;
	}

	@Override
	public ResponseEntity<AdminUser> createUser(AdminCreateUserRequest request) {
		User user = adminUserService.createUser(request.getUsername(), request.getPassword());
		return ResponseEntity.status(201).body(toDto(user));
	}

	@Override
	public ResponseEntity<Void> setUserPassword(String username, AdminSetPasswordRequest request) {
		adminUserService.setPassword(username, request.getPassword());
		return ResponseEntity.noContent().build();
	}

	private static AdminUser toDto(User user) {
		AdminUser dto = new AdminUser(user.getId(), user.getUsername(), AdminUser.RoleEnum.USER, user.getCreatedAt(),
				user.getUpdatedAt());
		return dto;
	}
}
