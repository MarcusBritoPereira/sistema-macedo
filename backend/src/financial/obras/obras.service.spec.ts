import { Test, TestingModule } from '@nestjs/testing';
import { ObrasService } from './obras.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ObrasService', () => {
  let service: ObrasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObrasService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ObrasService>(ObrasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
