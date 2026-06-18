import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = {
    getHealth: jest.fn(),
    getDatabaseHealth: jest.fn(),
    getRedisHealth: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return full health status', async () => {
    const response = { status: 'ok', checks: { api: { status: 'up' } } };
    healthService.getHealth.mockResolvedValue(response);

    await expect(controller.getHealth()).resolves.toBe(response);
    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
  });

  it('should return database health status', async () => {
    const response = { status: 'ok', checks: { database: { status: 'up' } } };
    healthService.getDatabaseHealth.mockResolvedValue(response);

    await expect(controller.getDatabaseHealth()).resolves.toBe(response);
    expect(healthService.getDatabaseHealth).toHaveBeenCalledTimes(1);
  });

  it('should return redis health status', async () => {
    const response = { status: 'ok', checks: { redis: { status: 'up' } } };
    healthService.getRedisHealth.mockResolvedValue(response);

    await expect(controller.getRedisHealth()).resolves.toBe(response);
    expect(healthService.getRedisHealth).toHaveBeenCalledTimes(1);
  });
});
