import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { AutoRouteHintComponent, AutoRouteHintStep } from './auto-route-hint.component';

describe('AutoRouteHintComponent', () => {
	let fixture: ComponentFixture<AutoRouteHintComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AutoRouteHintComponent],
			providers: [provideTranslateService()],
		}).compileComponents();
		fixture = TestBed.createComponent(AutoRouteHintComponent);
	});

	function render(inputs: { routing?: boolean; step?: AutoRouteHintStep }): HTMLElement {
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
		expect(render({ step: 'end' }).textContent).toContain('TURA.AUTO_PICK_END');
	});

	it('asks for the next point once a route is drawn — the mode stays on (backlog/206)', () => {
		expect(render({ step: 'next' }).textContent).toContain('TURA.AUTO_PICK_NEXT');
	});

	it('shows a spinner instead of the hint while a route is being planned (backlog/182)', () => {
		const element = render({ routing: true, step: 'end' });
		expect(element.querySelector('ion-spinner')).not.toBeNull();
		expect(element.textContent).toContain('TURA.AUTO_ROUTING');
		expect(element.textContent).not.toContain('TURA.AUTO_PICK_END');
	});
});
