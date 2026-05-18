import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ContractsService } from './contracts';

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ContractsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
