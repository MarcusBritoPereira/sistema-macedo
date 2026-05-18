import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FinancialService } from './financial';

describe('FinancialService', () => {
  let service: FinancialService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(FinancialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
