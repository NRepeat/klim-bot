import { WorkGroupService } from './work-group.service';

/**
 * Деньги и поток заявок: команда смены общей группы уводит все новые заявки в
 * другой чат, поэтому гард владельцев проверяем отдельно от остального.
 */
describe('WorkGroupService', () => {
  const make = (env: Record<string, string | undefined>, dbValue?: bigint | null) => {
    const prisma = {
      settings: {
        findUnique: jest.fn(async () => ({ workGroupChatId: dbValue ?? null })),
        upsert: jest.fn(async () => ({})),
      },
    };
    const config = { get: (key: string) => env[key] };
    return {
      service: new WorkGroupService(prisma as never, config as never),
      prisma,
    };
  };

  it('владельцы — только из OWNER_TG_IDS, пустой env = никому', () => {
    const { service } = make({ OWNER_TG_IDS: ' 8045572818 , 6787022993 ' });
    expect(service.isOwner(8045572818)).toBe(true);
    expect(service.isOwner(6787022993)).toBe(true);
    expect(service.isOwner(8584851389)).toBe(false);
    expect(service.isOwner(undefined)).toBe(false);

    const empty = make({ OWNER_TG_IDS: '' }).service;
    expect(empty.isOwner(8045572818)).toBe(false);
  });

  it('база бьёт env, без базы работает env', async () => {
    const fromDb = make({ WORK_GROUP_CHAT: '-100111' }, BigInt(-100999)).service;
    await expect(fromDb.chatId()).resolves.toBe(-100999);

    const fromEnv = make({ WORK_GROUP_CHAT: '-100111' }, null).service;
    await expect(fromEnv.chatId()).resolves.toBe(-100111);

    const nowhere = make({}, null).service;
    await expect(nowhere.chatId()).resolves.toBeNull();
  });

  it('запись группы кладёт id в базу и обновляет кэш', async () => {
    const { service, prisma } = make({ WORK_GROUP_CHAT: '-100111' }, null);
    await expect(service.chatId()).resolves.toBe(-100111);
    await service.setChatId(-100777);
    expect(prisma.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { workGroupChatId: BigInt(-100777) } }),
    );
    // кэш обновился без повторного чтения базы
    await expect(service.chatId()).resolves.toBe(-100777);
  });

  it('база недоступна — падаем в env, а не роняем отправку заявки', async () => {
    const { service, prisma } = make({ WORK_GROUP_CHAT: '-100111' });
    prisma.settings.findUnique.mockRejectedValueOnce(new Error('db down') as never);
    await expect(service.chatId()).resolves.toBe(-100111);
  });
});
