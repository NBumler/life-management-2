import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { AutoRouteHintComponent } from './auto-route-hint.component';

describe('AutoRouteHintComponent', () => {
	let fixture: ComponentFixture<AutoRouteHintComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AutoRouteHintComponent],
			providers: [provideTranslateService()],
		}).compileComponents();
		fixture = TestBed.createComponent(AutoRouteHintComponent);
	});

	function render(inputs: { routing?: boolean; pickingEnd?: boolean }): HTMLElement {
		for (const [name, value] of Object.entries(inputs)) {
			fixture.componentRef.setInput(name, value);
		}
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it('asks for the start point first', () => {
		const element = render({});
		expect(element.textContent).toContain('TURA.AUTO_PICK_START');
		expect(element.querySelector('ion-spinner')).toBeNull();
	});

	it('asks for the end point once the start is set', () => {
		expect(render({ pickingEnd: true }).textContent).toContain('TURA.AUTO_PICK_END');
	});

	it('shows a spinner instead of the hint while a route is being planned (backlog/182)', () => {
		const element = render({ routing: true, pickingEnd: true });
		expect(element.querySelector('ion-spinner')).not.toBeNull();
		expect(element.textContent).toContain('TURA.AUTO_ROUTING');
		expect(element.textContent).not.toContain('TURA.AUTO_PICK_END');
	});
});
