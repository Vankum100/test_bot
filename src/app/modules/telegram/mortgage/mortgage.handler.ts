import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'grammy';
import { MortgageService } from '../../mortgage/mortgage.service';
import { CreateMortgageProfileDto, PropertyType } from '../../mortgage/dto/create-mortgage-profile.dto';
import { InlineKeyboard } from 'grammy';

interface MortgageSession {
  userId: string;
  step: 'propertyPrice' | 'propertyType' | 'downPayment' | 'matCapital' | 'matCapitalIncluded' | 'loanTerm' | 'interestRate' | 'complete';
  data: Partial<CreateMortgageProfileDto>;
}

@Injectable()
export class MortgageHandler {
  private readonly logger = new Logger(MortgageHandler.name);
  private readonly sessions = new Map<string, MortgageSession>();

  constructor(private readonly mortgageService: MortgageService) {}

  async handleMortgageCommand(ctx: Context): Promise<void> {
    if (!ctx.from?.id) {
      this.logger.warn('Mortgage command received but ctx.from.id is missing');
      return;
    }

    const userId = ctx.from.id.toString();
    this.logger.log(`Starting mortgage calculation session for user ${userId}`);
    
    // Clear any existing session
    if (this.sessions.has(userId)) {
      this.logger.log(`Clearing existing session for user ${userId}`);
      this.sessions.delete(userId);
    }

    const session: MortgageSession = {
      userId,
      step: 'propertyPrice',
      data: {},
    };
    this.sessions.set(userId, session);

    try {
      await ctx.reply(
        '🏠 Калькулятор ипотеки\n\n' +
        'Введите стоимость недвижимости (в рублях):',
        { reply_markup: { remove_keyboard: true } }
      );
      this.logger.log(`Mortgage session started for user ${userId}`);
    } catch (error) {
      this.logger.error('Error sending mortgage command reply:', error);
      this.sessions.delete(userId);
      throw error;
    }
  }

  async handleMessage(ctx: Context): Promise<void> {
    if (!ctx.from?.id || !ctx.message?.text) {
      return;
    }

    // Skip commands
    if (ctx.message.text.startsWith('/')) {
      return;
    }

    const userId = ctx.from.id.toString();
    const session = this.sessions.get(userId);

    if (!session) {
      return;
    }

    try {
      switch (session.step) {
        case 'propertyPrice':
          await this.handlePropertyPrice(ctx, session);
          break;
        case 'downPayment':
          await this.handleDownPayment(ctx, session);
          break;
        case 'matCapital':
          await this.handleMatCapital(ctx, session);
          break;
        case 'matCapitalIncluded':
          await this.handleMatCapitalIncluded(ctx, session);
          break;
        case 'loanTerm':
          await this.handleLoanTerm(ctx, session);
          break;
        case 'interestRate':
          await this.handleInterestRate(ctx, session);
          break;
        default:
          break;
      }
    } catch (error) {
      this.logger.error('Error handling mortgage message:', error);
      await ctx.reply('Произошла ошибка. Попробуйте начать заново: /mortgage');
      this.sessions.delete(userId);
    }
  }

  async handleCallbackQuery(ctx: Context): Promise<void> {
    if (!ctx.from?.id || !ctx.callbackQuery?.data) {
      return;
    }

    const userId = ctx.from.id.toString();
    const session = this.sessions.get(userId);

    if (!session) {
      return;
    }

    const data = ctx.callbackQuery.data;

    if (data.startsWith('property_type_')) {
      const propertyType = data.replace('property_type_', '') as PropertyType;
      session.data.propertyType = propertyType;
      session.step = 'downPayment';
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        'Введите размер первоначального взноса (в рублях):'
      );
    } else if (data === 'mat_capital_yes') {
      session.data.matCapitalIncluded = true;
      session.step = 'matCapital';
      await ctx.answerCallbackQuery();
      await ctx.editMessageText('Введите размер материнского капитала (в рублях):');
    } else if (data === 'mat_capital_no') {
      session.data.matCapitalIncluded = false;
      session.data.matCapitalAmount = null;
      session.step = 'loanTerm';
      await ctx.answerCallbackQuery();
      await ctx.editMessageText('Введите срок ипотеки (в годах, от 1 до 30):');
    }
  }

  private async handlePropertyPrice(ctx: Context, session: MortgageSession): Promise<void> {
    const price = parseFloat(ctx.message!.text!);
    if (isNaN(price) || price <= 0) {
      await ctx.reply('Пожалуйста, введите корректную стоимость недвижимости (положительное число):');
      return;
    }

    session.data.propertyPrice = price;
    session.step = 'propertyType';

    const keyboard = new InlineKeyboard()
      .text('Квартира в новостройке', 'property_type_apartment_in_new_building').row()
      .text('Квартира во вторичке', 'property_type_apartment_in_secondary_building').row()
      .text('Дом', 'property_type_house').row()
      .text('Дом с участком', 'property_type_house_with_land_plot').row()
      .text('Земельный участок', 'property_type_land_plot').row()
      .text('Другое', 'property_type_other');

    await ctx.reply('Выберите тип недвижимости:', { reply_markup: keyboard });
  }

  private async handleDownPayment(ctx: Context, session: MortgageSession): Promise<void> {
    const downPayment = parseFloat(ctx.message!.text!);
    if (isNaN(downPayment) || downPayment < 0) {
      await ctx.reply('Пожалуйста, введите корректный размер первоначального взноса (неотрицательное число):');
      return;
    }

    if (downPayment >= session.data.propertyPrice!) {
      await ctx.reply('Первоначальный взнос не может быть больше или равен стоимости недвижимости. Введите корректное значение:');
      return;
    }

    session.data.downPaymentAmount = downPayment;
    session.step = 'matCapitalIncluded';

    const keyboard = new InlineKeyboard()
      .text('Да', 'mat_capital_yes')
      .text('Нет', 'mat_capital_no');

    await ctx.reply('Будете использовать материнский капитал?', { reply_markup: keyboard });
  }

  private async handleMatCapital(ctx: Context, session: MortgageSession): Promise<void> {
    const matCapital = parseFloat(ctx.message!.text!);
    if (isNaN(matCapital) || matCapital < 0) {
      await ctx.reply('Пожалуйста, введите корректный размер материнского капитала (неотрицательное число):');
      return;
    }

    session.data.matCapitalAmount = matCapital;
    session.step = 'loanTerm';

    await ctx.reply('Введите срок ипотеки (в годах, от 1 до 30):', { reply_markup: { remove_keyboard: true } });
  }

  private async handleMatCapitalIncluded(ctx: Context, session: MortgageSession): Promise<void> {
    // This is handled via callback query
  }

  private async handleLoanTerm(ctx: Context, session: MortgageSession): Promise<void> {
    const loanTerm = parseInt(ctx.message!.text!, 10);
    if (isNaN(loanTerm) || loanTerm < 1 || loanTerm > 30) {
      await ctx.reply('Пожалуйста, введите корректный срок ипотеки (от 1 до 30 лет):');
      return;
    }

    session.data.loanTermYears = loanTerm;
    session.step = 'interestRate';

    await ctx.reply('Введите процентную ставку (например, 8.5 для 8.5%):');
  }

  private async handleInterestRate(ctx: Context, session: MortgageSession): Promise<void> {
    const interestRate = parseFloat(ctx.message!.text!);
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
      await ctx.reply('Пожалуйста, введите корректную процентную ставку (от 0 до 100):');
      return;
    }

    session.data.interestRate = interestRate;
    session.step = 'complete';

    await this.calculateAndSendResult(ctx, session);
  }

  private async calculateAndSendResult(ctx: Context, session: MortgageSession): Promise<void> {
    try {
      const dto: CreateMortgageProfileDto = {
        propertyPrice: session.data.propertyPrice!,
        propertyType: session.data.propertyType!,
        downPaymentAmount: session.data.downPaymentAmount!,
        matCapitalAmount: session.data.matCapitalAmount ?? null,
        matCapitalIncluded: session.data.matCapitalIncluded ?? false,
        loanTermYears: session.data.loanTermYears!,
        interestRate: session.data.interestRate!,
      };

      const result = await this.mortgageService.createMortgageCalculation(session.userId, dto);

      const message = this.formatMortgageResult(result);
      await ctx.reply(message, { parse_mode: 'HTML' });

      this.sessions.delete(session.userId);
    } catch (error) {
      this.logger.error('Error calculating mortgage:', error);
      await ctx.reply('Произошла ошибка при расчете ипотеки. Попробуйте еще раз: /mortgage');
      this.sessions.delete(session.userId);
    }
  }

  private formatMortgageResult(result: any): string {
    return `
🏠 <b>Результаты расчета ипотеки</b>

💰 <b>Ежемесячный платеж:</b> ${this.formatCurrency(result.monthlyPayment)}
📊 <b>Общая сумма выплат:</b> ${this.formatCurrency(result.totalPayment)}
💸 <b>Переплата по кредиту:</b> ${this.formatCurrency(result.totalOverpaymentAmount)}
📝 <b>Налоговый вычет:</b> ${this.formatCurrency(result.possibleTaxDeduction)}
👶 <b>Экономия за счет мат. капитала:</b> ${this.formatCurrency(result.savingsDueMotherCapital)}
💼 <b>Рекомендуемый доход:</b> ${this.formatCurrency(result.recommendedIncome)}

<i>График платежей сохранен в базе данных.</i>

Для нового расчета используйте: /mortgage
    `.trim();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  hasActiveSession(userId: string): boolean {
    return this.sessions.has(userId);
  }

  clearSession(userId: string): void {
    this.sessions.delete(userId);
  }
}

