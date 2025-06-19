import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserService } from 'src/modules/user/user.service';

@Update()
export class UserActions {
  constructor(private readonly userService: UserService) {}

  @Action('new_user')
  async onNewUser(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.userService.createUser(ctx);
    await ctx.reply('You pressed the "New user" button!');
  }
}
