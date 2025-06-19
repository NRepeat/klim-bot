import { Action, Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { CustomSceneContext, UserRole } from 'src/types/types';
import { UserService } from 'src/modules/user/user.service';

@Update()
export class RequestActions {
  constructor(private readonly userService: UserService) {}

  @Command('pay')
  async onPayCommand(@Ctx() ctx: CustomSceneContext) {
    console.log(ctx, 'onPayCommand');
    await ctx.scene.enter('create-request');
  }
}
