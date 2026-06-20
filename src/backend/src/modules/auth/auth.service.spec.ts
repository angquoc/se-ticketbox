import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    prismaServiceMock.user.update.mockClear();
    prismaServiceMock.user.findUnique.mockClear();
    prismaServiceMock.user.create.mockClear();
    jwtServiceMock.signAsync.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
