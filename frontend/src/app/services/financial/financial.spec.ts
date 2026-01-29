import { TestBed } from '@angular/core/testing';

import { Financial } from './financial';

describe('Financial', () => {
  let service: Financial;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Financial);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
