import * as fs from 'fs';
import {
  CurrencyEnum,
  PaymentMethodEnum,
  PrismaClient,
  RoleEnum,
} from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

const currencies = [
  {
    code: 'UAH',
    name: CurrencyEnum.UAH,
    nameEn: CurrencyEnum.UAH,
    symbol: '₴',
  },
  {
    code: 'USD',
    name: CurrencyEnum.USD,
    nameEn: CurrencyEnum.USD,
    symbol: '$',
  },
];

// Дані для заповнення моделі PaymentMethod
const paymentMethods = [
  {
    nameEn: PaymentMethodEnum.CARD,
    description: 'Visa/MasterCard',
    descriptionEn: 'Visa/MasterCard',
  },
  {
    nameEn: PaymentMethodEnum.IBAN,
    description: 'Visa/MasterCard',
    descriptionEn: 'Visa/MasterCard',
  },
];

// Дані для заповнення моделі Role
const roles = [
  { name: RoleEnum.ADMIN },
  { name: RoleEnum.WORKER },
  { name: RoleEnum.GUEST },
];

/**
 * Заповнює базу даних даними для моделі Role.
 */
async function seedRole() {
  console.log('Початок заповнення моделі Role...');
  try {
    const result = await prisma.role.createMany({
      data: roles,
      skipDuplicates: true,
    });
    console.log(
      `Заповнення моделі Role завершено. Вставлено ${result.count} записів.`,
    );
  } catch (e) {
    console.error('Сталася помилка під час заповнення моделі Role:', e);
    process.exit(1);
  }
}

/**
 * Заповнює базу даних даними для моделі Currency.
 */
async function seedCurrency() {
  console.log('Початок заповнення моделі Currency...');
  try {
    const result = await prisma.currency.createMany({
      data: currencies,
      skipDuplicates: true,
    });
    console.log(
      `Заповнення моделі Currency завершено. Вставлено ${result.count} записів.`,
    );
  } catch (e) {
    console.error('Сталася помилка під час заповнення моделі Currency:', e);
    process.exit(1);
  }
}

/**
 * Заповнює базу даних даними для моделі PaymentMethod.
 */
async function seedPaymentMethod() {
  console.log('Початок заповнення моделі PaymentMethod...');
  try {
    const result = await prisma.paymentMethod.createMany({
      data: paymentMethods,
      skipDuplicates: true,
    });
    console.log(
      `Заповнення моделі PaymentMethod завершено. Вставлено ${result.count} записів.`,
    );
  } catch (e) {
    console.error(
      'Сталася помилка під час заповнення моделі PaymentMethod:',
      e,
    );
    process.exit(1);
  }
}

/**
 * Заповнює базу даних даними для моделі Rates.
 */
async function seedRates() {
  console.log('Початок заповнення моделі Rates...');
  try {
    // Отримуємо ідентифікатори валют та методів оплати для створення зв'язків
    const usdCurrency = await prisma.currency.findUnique({
      where: { name: CurrencyEnum.USD },
    });
    const uahCurrency = await prisma.currency.findUnique({
      where: { name: CurrencyEnum.UAH },
    });
    const cardMethod = await prisma.paymentMethod.findUnique({
      where: { nameEn: PaymentMethodEnum.CARD },
    });
    const ibanMethod = await prisma.paymentMethod.findUnique({
      where: { nameEn: PaymentMethodEnum.IBAN },
    });
    if (!usdCurrency || !uahCurrency || !cardMethod || !ibanMethod) {
      console.error(
        'Відсутні необхідні дані для заповнення Rates. Переконайтеся, що Currency та PaymentMethod заповнені.',
      );
      return;
    }

    const rates = [
      {
        currencyId: usdCurrency.id,
        paymentMethodId: cardMethod.id,
        minAmount: 10,
        maxAmount: 1000,
        rate: 37.5,
      },
      {
        currencyId: uahCurrency.id,
        paymentMethodId: cardMethod.id,
        minAmount: 50,
        maxAmount: 5000,
        rate: 1.0,
      },
    ];

    const result = await prisma.rates.createMany({
      data: rates,
      skipDuplicates: true,
    });
    console.log(
      `Заповнення моделі Rates завершено. Вставлено ${result.count} записів.`,
    );
  } catch (e) {
    console.error('Сталася помилка під час заповнення моделі Rates:', e);
    process.exit(1);
  }
}

// Функція для аналізу рядка з SQL-дампу
function parseSqlLine(line: string) {
  // Використовуємо регулярний вираз для вилучення даних
  // Він шукає три групи значень у лапках або NULL
  const regex = /'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*NULL/;
  const match = line.match(regex);
  if (match) {
    // Повертаємо об'єкт з вилученими даними
    return {
      number: match[1],
      bankName: match[2],
      bankNameEn: match[3],
      icon: null,
    };
  }
  return null;
}

/**
 * Заповнює базу даних даними для моделі CardBank.
 * Зчитує дані з файлу SQL-дампу.
 */
async function seedCardBank() {
  console.log('Початок заповнення моделі CardBank...');

  const dumpFilePath = path.join(__dirname, 'dump-klimp2p-202506291411.sql');
  let cardBanks = [] as any;

  try {
    const fileContent = fs.readFileSync(dumpFilePath, 'utf-8');
    const lines = fileContent
      .split('\n')
      .filter((line) => line.startsWith('(') && line.endsWith('),'));
    cardBanks = lines.map((line) => parseSqlLine(line)).filter(Boolean);

    console.log(
      `Знайдено ${cardBanks.length} записів для вставки в модель CardBank.`,
    );
  } catch (error) {
    console.error('Помилка зчитування або аналізу файлу для CardBank:', error);
    process.exit(1);
  }

  try {
    const result = await prisma.cardBank.createMany({
      data: cardBanks,
      skipDuplicates: true,
    });
    console.log(
      `Заповнення моделі CardBank завершено. Вставлено ${result.count} записів.`,
    );
  } catch (e) {
    console.error('Сталася помилка під час заповнення моделі CardBank:', e);
    process.exit(1);
  }
}

async function main() {
  console.log('Початок заповнення бази даних...');

  // Викликаємо функції заповнення для кожної моделі
  await seedRole();
  await seedCurrency();
  await seedPaymentMethod();
  await seedRates();
  await seedCardBank();

  console.log('Заповнення всіх моделей завершено.');

  await prisma.$disconnect();
}

// Запускаємо головну функцію
main();
