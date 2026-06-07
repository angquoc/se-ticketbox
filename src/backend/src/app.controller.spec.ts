import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService, HealthStatus } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const healthStatus: HealthStatus = {
    status: 'ok',
    timestamp: '2026-06-05T00:00:00.000Z',
    uptime: 123,
    database: {
      status: 'ok',
      latencyMs: 5,
    },
  };

  const appServiceMock = {
    getHealth: jest
      .fn<Promise<HealthStatus>, []>()
      .mockResolvedValue(healthStatus),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  beforeEach(() => {
    appServiceMock.getHealth.mockClear();
  });

  describe('root', () => {
    it('should return health status from service', async () => {
      await expect(appController.getHealth()).resolves.toEqual(healthStatus);
      expect(appServiceMock.getHealth).toHaveBeenCalledTimes(1);
    });
  });
});
