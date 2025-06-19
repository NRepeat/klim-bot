import { Command, Ctx, Update } from 'nestjs-telegraf';
import { CustomSceneContext } from 'src/types/types';
import { UserService } from 'src/modules/user/user.service';

@Update()
export class RequestActions {
  constructor(private readonly userService: UserService) {}

  @Command('pay')
  async onPayCommand(@Ctx() ctx: CustomSceneContext) {
    await ctx.scene.enter('create-request');
  }
}
