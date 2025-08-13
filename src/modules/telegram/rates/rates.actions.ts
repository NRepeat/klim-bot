import { Ctx, Hears, Update } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { UserService } from 'src/modules/user/user.service';
import { SceneContext } from 'telegraf/typings/scenes';
@Update()
export class RatesActions {
  constructor(
    private readonly ratesService: RatesService,
    private readonly userService: UserService,
  ) {}

  @Hears('Обновить курсы')
  async onRates(@Ctx() ctx: SceneContext) {
    // this.ratesService.createRates(ctx, Currency.UAH);
    const isAdmin = await this.userService.isAdminChat(ctx);
    if (!isAdmin) {
      //
      return;
    }
    await ctx.scene.enter('create-rates');
  }
}
