import { Test, TestingModule } from '@nestjs/testing';
import { ChartOaService } from './chart-oa.service';

describe('ChartOaService', () => {
  let service: ChartOaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChartOaService],
    }).compile();

    service = module.get<ChartOaService>(ChartOaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
