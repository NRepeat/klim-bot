import { Command, Ctx, Update } from 'nestjs-telegraf';
import { CustomSceneContext } from 'src/types/types';
import { UserService } from 'src/modules/user/user.service';
import { VendorService } from 'src/modules/vendor/vendor.service';

@Update()
export class RequestActions {
  constructor(
    private readonly userService: UserService,
    private readonly vendorService: VendorService, // Assuming you have a vendor service to inject
  ) {}

  @Command('pay')
  async onPayCommand(@Ctx() ctx: CustomSceneContext) {
    if (!ctx.chat || !ctx.chat.id) {
      console.error('Chat ID is not available in the context');
      return;
    }

    const vendor = await this.vendorService.getVendorByChatId(ctx.chat?.id);
    if (!vendor) {
      console.error('Vendor not found for the current chat');
      return;
    }

    if (!vendor.work) {
      // await ctx.reply('You are not allowed to create requests. Chat on pause');
      return;
    }
    await ctx.scene.enter('create-request');
  }
}
