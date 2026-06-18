import { Test, TestingModule } from '@nestjs/testing';
import { ObrasController } from './obras.controller';
import { ObrasService } from './obras.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ObrasController', () => {
  let controller: ObrasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObrasController],
      providers: [
        { provide: ObrasService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ObrasController>(ObrasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
