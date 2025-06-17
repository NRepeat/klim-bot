import { SerilizedUser } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';

export default class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async createUser(data: SerilizedUser) {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(userId: string, data: SerilizedUser) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
