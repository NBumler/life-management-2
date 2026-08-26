import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { buildOpenFoodFactsUrl } from './open-food-facts';
import { OpenFoodFactsService } from './open-food-facts.service';

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OpenFoodFactsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps a status:1 response with a product into the mapped fields', async () => {
    const promise = service.lookup('5901234123457');
    httpMock.expectOne(buildOpenFoodFactsUrl('5901234123457')).flush({
      status: 1,
      product: { product_name: 'Tejcsokoládé', nutriments: { 'energy-kcal_100g': 539 } },
    });

    expect(await promise).toEqual(jasmine.objectContaining({ name: 'Tejcsokoládé', energyKcal: 539 }));
  });

  it('returns null for a status:0 (not found) response', async () => {
    const promise = service.lookup('0000000000000');
    httpMock.expectOne(buildOpenFoodFactsUrl('0000000000000')).flush({ status: 0, status_verbose: 'no code or invalid code' });

    expect(await promise).toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    const promise = service.lookup('5901234123457');
    httpMock.expectOne(buildOpenFoodFactsUrl('5901234123457')).error(new ProgressEvent('error'));

    expect(await promise).toBeNull();
  });
});
