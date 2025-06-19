import { SerializedRequest } from 'src/types/types';

export class RequestRepository {
  constructor(private readonly prisma: any) {}

  async findAll() {
    return this.prisma.request.findMany();
  }

  async findOne(id: number) {
    return this.prisma.request.findUnique({ where: { id } });
  }

  async create(data: SerializedRequest) {
    return this.prisma.request.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.request.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.request.delete({ where: { id } });
  }
}
