import { Test, TestingModule } from '@nestjs/testing';
import { ChartOaController } from './chart-oa.controller';

describe('ChartOaController', () => {
  let controller: ChartOaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChartOaController],
    }).compile();

    controller = module.get<ChartOaController>(ChartOaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
