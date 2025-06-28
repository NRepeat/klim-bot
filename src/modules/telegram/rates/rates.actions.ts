import { Ctx, Hears, Update } from 'nestjs-telegraf';
import { RatesService } from 'src/modules/rates/rates.service';
import { SceneContext } from 'telegraf/typings/scenes';
@Update()
export class RatesActions {
  constructor(private readonly ratesService: RatesService) {}

  @Hears('Обновить курсы')
  async onRates(@Ctx() ctx: SceneContext) {
    // this.ratesService.createRates(ctx, Currency.UAH);
    await ctx.scene.enter('create-rates');
  }
}
