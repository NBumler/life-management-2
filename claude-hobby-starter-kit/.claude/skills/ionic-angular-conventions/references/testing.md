# Frontend Testing

Test behavior users care about; don't over-test trivial getters.

## Components

Use Angular's `TestBed` with `ComponentFixture`. For a standalone component,
import it directly. Mock services with simple fakes or `jasmine.createSpyObj`.

```ts
describe('UserListPage', () => {
  let fixture: ComponentFixture<UserListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListPage],
      providers: [{ provide: UserService, useValue: userServiceSpy }],
    }).compileComponents();
    fixture = TestBed.createComponent(UserListPage);
  });

  it('renders users from the service', () => {
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('app-user-list-item');
    expect(items.length).toBe(2);
  });
});
```

## Services

Test services in isolation. For HTTP, use `HttpTestingController` to assert the
request and stub the response — but prefer testing your own logic over the
generated client's plumbing.

## Conventions

- Test names state behavior: `'disables submit while loading'`.
- Prefer querying the rendered DOM over inspecting component internals.
- Keep tests fast and independent — no shared mutable state between specs.
