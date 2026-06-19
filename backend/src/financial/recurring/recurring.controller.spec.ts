import { Test, TestingModule } from '@nestjs/testing';
import { RecurringController } from './recurring.controller';
import { RecurringService } from './recurring.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RecurringController', () => {
  let controller: RecurringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringController],
      providers: [
        { provide: RecurringService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<RecurringController>(RecurringController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
