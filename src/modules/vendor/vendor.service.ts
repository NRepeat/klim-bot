import { Injectable } from '@nestjs/common';
import { VendorRepository } from './vendor.repo';
import { SerializedVendors } from 'src/types/types';
import { Vendors } from 'generated/prisma';
import { Context } from 'telegraf';
import { randomUUID } from 'crypto';

@Injectable()
export class VendorService {
  constructor(private readonly vendorRepository: VendorRepository) {}
  async getVendorByToken(token: string): Promise<Vendors | null> {
    if (!token) {
      console.error('Token is required to get vendor');
      throw new Error('Token is required to get vendor');
    }
    const vendor = await this.vendorRepository.getByToken(token);
    if (!vendor) {
      console.error(`Vendor with token ${token} not found`);
      throw new Error(`Vendor with token ${token} not found`);
    }
    return vendor;
  }
  serializeVendor(vendor: Vendors): Partial<SerializedVendors> {
    const result: Partial<SerializedVendors> = {
      work: vendor.work,
      chatId: vendor.chatId,
      lastReportedAt: vendor.lastReportedAt,
      showReceipt: vendor.showReceipt,
      title: vendor.title,
      token: vendor.token,
      lastAllRateMessageId: vendor.lastAllRateMessageId
        ? vendor.lastAllRateMessageId
        : null,

      lastAllRatesSentAt: vendor.lastAllRatesSentAt
        ? vendor.lastAllRatesSentAt
        : null,
    };

    return result;
  }

  async getAllVendors() {
    return (await this.vendorRepository.getAll()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }

  async getAllActiveVendors() {
    const allVendors = await this.getAllVendors();
    console.log('allVendors', allVendors);
    return allVendors.filter((vendor) => vendor.work).sort();
  }
  async getVendorById(vendorId: string) {
    const vendor = await this.vendorRepository.getById(vendorId);
    if (!vendor) {
      console.error(`Vendor with id ${vendorId} not found`);
      throw new Error(`Vendor with id ${vendorId} not found`);
    }
    return vendor;
  }
  async updateVendor(vendor: Vendors) {
    const updatedVendor = await this.vendorRepository.updateR(
      vendor,
      vendor.id,
    );
    return updatedVendor;
  }
  async updateAllRatesLastMessageId(vendorId: string, messageId: number) {
    const vendor = await this.getVendorById(vendorId);
    if (!vendor) {
      console.error(`Vendor with id ${vendorId} not found`);
      throw new Error(`Vendor with id ${vendorId} not found`);
    }
    vendor.lastAllRateMessageId = messageId;
    const updatedVendor = await this.updateVendor(vendor);
    return updatedVendor;
  }

  async createVendor(ctx: Context): Promise<Vendors> {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      throw new Error('Chat ID is required to create a vendor');
    }
    const existingVendor = await this.vendorRepository.getByChatId(chatId);
    if (existingVendor) {
      return existingVendor;
    }
    const chat = ctx.message?.chat as {
      id: number;
      title?: string;
      type: string;
    };
    const data: SerializedVendors = {
      chatId: BigInt(chatId),
      work: true,
      showReceipt: true,
      lastReportedAt: new Date(),
      title: chat.title || 'Unknown Vendor',
      token: randomUUID(),
      lastAllRateMessageId: null,
      lastAllRatesSentAt: null,
    };
    const vendor = await this.vendorRepository.create(data);
    return vendor;
  }
  async isVendorChat(ctx: Context): Promise<boolean> {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return false;
    }
    const vendor = await this.vendorRepository.getByChatId(chatId);
    return !!vendor;
  }

  async getVendorByChatId(chatId: number): Promise<Vendors | null> {
    return this.vendorRepository.getByChatId(chatId);
  }
}
