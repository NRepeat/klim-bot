import { Injectable } from '@nestjs/common';
import { Repository, SerializedVendors } from 'src/types/types';
import { PrismaService } from '../prisma/prisma.service';
import { Vendors } from '@prisma/client';

@Injectable()
export class VendorRepository implements Repository<SerializedVendors> {
  constructor(private readonly prisma: PrismaService) {}
  async create(data: SerializedVendors): Promise<Vendors> {
    return this.prisma.vendors.create({
      data,
    });
  }
  async getByToken(token: string): Promise<Vendors | null> {
    return this.prisma.vendors.findUnique({
      where: { token },
    });
  }
  async getAll(): Promise<Vendors[]> {
    return this.prisma.vendors.findMany();
  }
  async updateR(data: SerializedVendors, id: string): Promise<Vendors> {
    return this.prisma.vendors.update({
      where: { id },
      data,
    });
  }
  async getById(id: string): Promise<Vendors | null> {
    return this.prisma.vendors.findUnique({
      where: { id },
    });
  }
  async getByChatId(id: number): Promise<Vendors | null> {
    return this.prisma.vendors.findUnique({
      where: { chatId: id },
    });
  }
  async upsert(data: SerializedVendors, id: string): Promise<Vendors> {
    return this.prisma.vendors.upsert({
      where: { id },
      update: data,
      create: data,
    });
  }
}
