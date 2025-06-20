import { Test, TestingModule } from '@nestjs/testing';
import { RequestTaskService } from './request-task.service';

describe('RequestTaskService', () => {
  let service: RequestTaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestTaskService],
    }).compile();

    service = module.get<RequestTaskService>(RequestTaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
