import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { VendorService } from '../vendor/vendor.service';
import { Context } from 'telegraf';

@Injectable()
export class UtilsService {
  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService,
  ) {}
  async isChatRegistrated(ctx: Context) {
    if (
      (await this.userService.isAdminChat(ctx)) ||
      (await this.vendorService.isVendorChat(ctx))
    ) {
      return true;
    }
    return false;
  }
}
