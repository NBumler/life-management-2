import {
	EMPTY_ROUTE_DRAFT,
	RouteDraftEditor,
	interiorWaypointIndexes,
	routeDraftFromPath,
	waypointCoordinates,
	withManualPoint,
} from './route-draft';

/** backlog/190 */
describe('route-draft', () => {
	const path = [
		[19.0, 47.0],
		[19.01, 47.0],
		[19.02, 47.01],
		[19.03, 47.01],
		[19.04, 47.02],
	];

	describe('routeDraftFromPath', () => {
		it('a generated path marks only its two ends as waypoints, but keeps the whole line', () => {
			const draft = routeDraftFromPath(path);

			expect(draft.coordinates).toEqual(path);
			expect(waypointCoordinates(draft)).toEqual([path[0], path[4]]);
			expect(interiorWaypointIndexes(draft)).toEqual([]);
		});

		it('extra interior indexes (an adopted route’s day breaks) become waypoints; out-of-range ones are dropped', () => {
			const draft = routeDraftFromPath(path, [2, 0, 4, 9]);

			expect(draft.waypointIndexes).toEqual([0, 2, 4]);
			expect(interiorWaypointIndexes(draft)).toEqual([2]);
		});

		it('an empty path is the empty draft', () => {
			expect(routeDraftFromPath([])).toEqual(EMPTY_ROUTE_DRAFT);
		});
	});

	describe('withManualPoint', () => {
		it('every click is a waypoint at the end of the line', () => {
			let draft = withManualPoint(EMPTY_ROUTE_DRAFT, path[0]);
			draft = withManualPoint(draft, path[1]);
			draft = withManualPoint(draft, path[2]);

			expect(draft.waypointIndexes).toEqual([0, 1, 2]);
			expect(interiorWaypointIndexes(draft)).toEqual([1]);
		});

		it('a click after a generated path makes its end an interior waypoint, not its vertices', () => {
			const draft = withManualPoint(routeDraftFromPath(path), [19.05, 47.03]);

			expect(draft.coordinates.length).toBe(6);
			expect(interiorWaypointIndexes(draft)).toEqual([4]);
		});
	});

	describe('RouteDraftEditor', () => {
		it('one undo takes back a whole generated path', () => {
			const editor = new RouteDraftEditor();
			editor.apply(withManualPoint(editor.draft(), [18.9, 46.9]));
			editor.apply(routeDraftFromPath(path));

			editor.undo();

			expect(editor.draft().coordinates).toEqual([[18.9, 46.9]]);
			expect(editor.canUndo()).toBeTrue();
		});

		it('undo steps back one manual point at a time, until the empty draft', () => {
			const editor = new RouteDraftEditor();
			editor.apply(withManualPoint(editor.draft(), path[0]));
			editor.apply(withManualPoint(editor.draft(), path[1]));

			editor.undo();
			expect(editor.draft().coordinates).toEqual([path[0]]);
			editor.undo();
			expect(editor.draft()).toEqual(EMPTY_ROUTE_DRAFT);
			expect(editor.canUndo()).toBeFalse();
			editor.undo();
			expect(editor.draft()).toEqual(EMPTY_ROUTE_DRAFT);
		});

		it('backlog/208 — clear is one undoable step that gives back the line, the name and the day breaks', () => {
			const editor = new RouteDraftEditor();
			const drawn = routeDraftFromPath(path, [2]);
			editor.apply(drawn);
			const details = { name: 'Pilis kör', dayBreaks: [{ waypointIndex: 2, overnightName: 'Dobogókő' }] };

			editor.clear(details);
			expect(editor.draft()).toEqual(EMPTY_ROUTE_DRAFT);
			expect(editor.lastStepIsClear()).toBeTrue();

			expect(editor.undo()).toEqual(details);
			expect(editor.draft()).toEqual(drawn);
			expect(editor.lastStepIsClear()).toBeFalse();
			expect(editor.undo()).toBeNull();
			expect(editor.draft()).toEqual(EMPTY_ROUTE_DRAFT);
		});

		it('backlog/208 — a step after the clear means the clear is no longer the last step', () => {
			const editor = new RouteDraftEditor();
			editor.apply(routeDraftFromPath(path));
			editor.clear({ name: '', dayBreaks: [] });

			editor.apply(withManualPoint(editor.draft(), path[0]));

			expect(editor.lastStepIsClear()).toBeFalse();
		});

		it('backlog/213 — restore sets the draft without an undo history', () => {
			const editor = new RouteDraftEditor();
			editor.apply(withManualPoint(editor.draft(), path[0]));
			const stored = routeDraftFromPath(path);

			editor.restore(stored);

			expect(editor.draft()).toEqual(stored);
			expect(editor.canUndo()).toBeFalse();
		});

		it('reset clears the draft and the undo history', () => {
			const editor = new RouteDraftEditor();
			editor.apply(routeDraftFromPath(path));

			editor.reset();

			expect(editor.draft()).toEqual(EMPTY_ROUTE_DRAFT);
			expect(editor.canUndo()).toBeFalse();
		});
	});
});
