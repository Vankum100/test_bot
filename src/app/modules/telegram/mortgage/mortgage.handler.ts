import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'grammy';
import { MortgageService } from '../../mortgage/mortgage.service';
import { CreateMortgageProfileDto, PropertyType } from '../../mortgage-profiles/dto/create-mortgage-profile.dto';
import { InlineKeyboard } from 'grammy';

interface MortgageSession {
  userId: string;
  step: 'propertyPrice' | 'propertyType' | 'downPayment' | 'matCapital' | 'matCapitalIncluded' | 'loanTerm' | 'interestRate' | 'complete';
  data: Partial<CreateMortgageProfileDto>;
  botMessageId?: number; // ID последнего сообщения бота для редактирования
  initialValues?: CreateMortgageProfileDto; // Сохраняем начальные значения
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
      initialValues: undefined,
    };
    this.sessions.set(userId, session);

    try {
      const message = await ctx.reply(
        '🏠 Калькулятор ипотеки\n\n' +
        'Введите стоимость недвижимости (в рублях):',
        { reply_markup: { remove_keyboard: true } }
      );
      session.botMessageId = message.message_id;
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
      // Удаляем сообщение пользователя после обработки
      if (ctx.message.message_id) {
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, ctx.message.message_id);
        } catch (error) {
          // Игнорируем ошибки удаления (например, если сообщение уже удалено)
          this.logger.debug(`Could not delete message ${ctx.message.message_id}: ${error}`);
        }
      }

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
      if (ctx.callbackQuery.message && 'message_id' in ctx.callbackQuery.message) {
        session.botMessageId = await this.safeEditMessage(
          ctx,
          ctx.callbackQuery.message.message_id,
          'Введите размер первоначального взноса (в рублях):'
        );
      }
    } else if (data === 'mat_capital_yes') {
      session.data.matCapitalIncluded = true;
      session.step = 'matCapital';
      await ctx.answerCallbackQuery();
      if (ctx.callbackQuery.message && 'message_id' in ctx.callbackQuery.message) {
        session.botMessageId = await this.safeEditMessage(
          ctx,
          ctx.callbackQuery.message.message_id,
          'Введите размер материнского капитала (в рублях):'
        );
      }
    } else if (data === 'mat_capital_no') {
      session.data.matCapitalIncluded = false;
      session.data.matCapitalAmount = null;
      session.step = 'loanTerm';
      await ctx.answerCallbackQuery();
      if (ctx.callbackQuery.message && 'message_id' in ctx.callbackQuery.message) {
        session.botMessageId = await this.safeEditMessage(
          ctx,
          ctx.callbackQuery.message.message_id,
          'Введите срок ипотеки (в годах, от 1 до 30):'
        );
      }
    }
  }

  private async handlePropertyPrice(ctx: Context, session: MortgageSession): Promise<void> {
    const price = parseFloat(ctx.message!.text!);
    if (isNaN(price) || price <= 0) {
      session.botMessageId = await this.safeEditMessage(
        ctx,
        session.botMessageId,
        'Пожалуйста, введите корректную стоимость недвижимости (положительное число):'
      );
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

    session.botMessageId = await this.safeEditMessage(
      ctx,
      session.botMessageId,
      'Выберите тип недвижимости:',
      { reply_markup: keyboard }
    );
  }

  private async handleDownPayment(ctx: Context, session: MortgageSession): Promise<void> {
    const downPayment = parseFloat(ctx.message!.text!);
    if (isNaN(downPayment) || downPayment < 0) {
      session.botMessageId = await this.safeEditMessage(
        ctx,
        session.botMessageId,
        'Пожалуйста, введите корректный размер первоначального взноса (неотрицательное число):'
      );
      return;
    }

    if (downPayment >= session.data.propertyPrice!) {
      session.botMessageId = await this.safeEditMessage(
        ctx,
        session.botMessageId,
        'Первоначальный взнос не может быть больше или равен стоимости недвижимости. Введите корректное значение:'
      );
      return;
    }

    session.data.downPaymentAmount = downPayment;
    session.step = 'matCapitalIncluded';

    const keyboard = new InlineKeyboard()
      .text('Да', 'mat_capital_yes')
      .text('Нет', 'mat_capital_no');

    session.botMessageId = await this.safeEditMessage(
      ctx,
      session.botMessageId,
      'Будете использовать материнский капитал?',
      { reply_markup: keyboard }
    );
  }

  private async handleMatCapital(ctx: Context, session: MortgageSession): Promise<void> {
    const matCapital = parseFloat(ctx.message!.text!);
    if (isNaN(matCapital) || matCapital < 0) {
      session.botMessageId = await this.safeEditMessage(
        ctx,
        session.botMessageId,
        'Пожалуйста, введите корректный размер материнского капитала (неотрицательное число):'
      );
      return;
    }

    session.data.matCapitalAmount = matCapital;
    // Если материнский капитал включен, он должен быть частью первоначального взноса
    // Поэтому добавляем его к downPaymentAmount, чтобы downPaymentAmount включал matCapitalAmount
    if (session.data.downPaymentAmount !== undefined) {
      session.data.downPaymentAmount = session.data.downPaymentAmount + matCapital;
    }
    session.step = 'loanTerm';

    session.botMessageId = await this.safeEditMessage(
      ctx,
      session.botMessageId,
      'Введите срок ипотеки (в годах, от 1 до 30):',
      { reply_markup: { remove_keyboard: true } }
    );
  }

  private async handleMatCapitalIncluded(ctx: Context, session: MortgageSession): Promise<void> {
    // This is handled via callback query
  }

  private async handleLoanTerm(ctx: Context, session: MortgageSession): Promise<void> {
    const loanTerm = parseInt(ctx.message!.text!, 10);
    if (isNaN(loanTerm) || loanTerm < 1 || loanTerm > 30) {
      session.botMessageId = await this.safeEditMessage(
        ctx,
        session.botMessageId,
        'Пожалуйста, введите корректный срок ипотеки (от 1 до 30 лет):'
      );
      return;
    }

    session.data.loanTermYears = loanTerm;
    session.step = 'interestRate';

    session.botMessageId = await this.safeEditMessage(
      ctx,
      session.botMessageId,
      'Введите процентную ставку (например, 8.5 для 8.5%):'
    );
  }

  private async handleInterestRate(ctx: Context, session: MortgageSession): Promise<void> {
    const interestRate = parseFloat(ctx.message!.text!);
    if (isNaN(interestRate) || interestRate < 0 || interestRate > 100) {
      session.botMessageId = await this.safeEditMessage(
        ctx,
        session.botMessageId,
        'Пожалуйста, введите корректную процентную ставку (от 0 до 100):'
      );
      return;
    }

    session.data.interestRate = interestRate;
    session.step = 'complete';

    // Сохраняем начальные значения перед расчетом
    session.initialValues = {
      propertyPrice: session.data.propertyPrice!,
      propertyType: session.data.propertyType!,
      downPaymentAmount: session.data.downPaymentAmount!,
      matCapitalAmount: session.data.matCapitalAmount ?? null,
      matCapitalIncluded: session.data.matCapitalIncluded ?? false,
      loanTermYears: session.data.loanTermYears!,
      interestRate: session.data.interestRate!,
    };

    await this.calculateAndSendResult(ctx, session);
  }

  private async calculateAndSendResult(ctx: Context, session: MortgageSession): Promise<void> {
    try {
      // Используем начальные значения, если они сохранены
      const dto: CreateMortgageProfileDto = session.initialValues || {
        propertyPrice: session.data.propertyPrice!,
        propertyType: session.data.propertyType!,
        downPaymentAmount: session.data.downPaymentAmount!,
        matCapitalAmount: session.data.matCapitalAmount ?? null,
        matCapitalIncluded: session.data.matCapitalIncluded ?? false,
        loanTermYears: session.data.loanTermYears!,
        interestRate: session.data.interestRate!,
      };

      const result = await this.mortgageService.createMortgageCalculation(session.userId, dto);

      const message = this.formatMortgageResult(result, session.initialValues || dto);
      
      // Удаляем последнее сообщение бота и отправляем результат
      if (session.botMessageId) {
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, session.botMessageId);
        } catch (error) {
          this.logger.debug(`Could not delete bot message ${session.botMessageId}: ${error}`);
        }
      }
      
      await ctx.reply(message, { parse_mode: 'HTML' });

      this.sessions.delete(session.userId);
    } catch (error) {
      this.logger.error('Error calculating mortgage:', error);
      await ctx.reply('Произошла ошибка при расчете ипотеки. Попробуйте еще раз: /mortgage');
      this.sessions.delete(session.userId);
    }
  }

  private formatMortgageResult(result: any, initialValues: CreateMortgageProfileDto): string {
    const propertyTypeNames: Record<PropertyType, string> = {
      [PropertyType.APARTMENT_IN_NEW_BUILDING]: 'Квартира в новостройке',
      [PropertyType.APARTMENT_IN_SECONDARY_BUILDING]: 'Квартира во вторичке',
      [PropertyType.HOUSE]: 'Дом',
      [PropertyType.HOUSE_WITH_LAND_PLOT]: 'Дом с участком',
      [PropertyType.LAND_PLOT]: 'Земельный участок',
      [PropertyType.OTHER]: 'Другое',
    };

    return `
🏠 <b>Результаты расчета ипотеки</b>

<b>Начальные параметры:</b>
💰 Стоимость недвижимости: ${this.formatCurrency(initialValues.propertyPrice)}
🏘️ Тип недвижимости: ${propertyTypeNames[initialValues.propertyType]}
💵 Первоначальный взнос: ${this.formatCurrency(initialValues.downPaymentAmount)}
${initialValues.matCapitalIncluded && initialValues.matCapitalAmount ? `👶 Материнский капитал: ${this.formatCurrency(initialValues.matCapitalAmount)} (включен в первоначальный взнос)\n` : ''}📅 Срок ипотеки: ${initialValues.loanTermYears} ${initialValues.loanTermYears === 1 ? 'год' : initialValues.loanTermYears < 5 ? 'года' : 'лет'}
📈 Процентная ставка: ${initialValues.interestRate}%

<b>Результаты расчета:</b>
💰 <b>Ежемесячный платеж:</b> ${this.formatCurrency(result.monthlyPayment)}
📊 <b>Общая сумма выплат:</b> ${this.formatCurrency(result.totalPayment)}
💸 <b>Переплата по кредиту:</b> ${this.formatCurrency(result.totalOverpaymentAmount)}
📝 <b>Налоговый вычет:</b> ${this.formatCurrency(result.possibleTaxDeduction)}
${result.savingsDueMotherCapital > 0 ? `👶 <b>Экономия за счет мат. капитала:</b> ${this.formatCurrency(result.savingsDueMotherCapital)}\n` : ''}💼 <b>Рекомендуемый доход:</b> ${this.formatCurrency(result.recommendedIncome)}

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

  /**
   * Safely edits a message or sends a new one if editing fails
   */
  private async safeEditMessage(
    ctx: Context,
    messageId: number | undefined,
    text: string,
    options?: { reply_markup?: any }
  ): Promise<number> {
    if (messageId) {
      try {
        await ctx.api.editMessageText(ctx.chat!.id, messageId, text, options);
        return messageId;
      } catch (error: any) {
        // If editing fails (message too old, deleted, etc.), send a new message
        if (error.error_code === 400 && error.description?.includes("message can't be edited")) {
          this.logger.debug(`Cannot edit message ${messageId}, sending new message instead`);
          const newMessage = await ctx.reply(text, options);
          return newMessage.message_id;
        }
        // For other errors, still try to send a new message
        this.logger.debug(`Error editing message ${messageId}: ${error}, sending new message instead`);
        const newMessage = await ctx.reply(text, options);
        return newMessage.message_id;
      }
    } else {
      const newMessage = await ctx.reply(text, options);
      return newMessage.message_id;
    }
  }

  hasActiveSession(userId: string): boolean {
    return this.sessions.has(userId);
  }

  clearSession(userId: string): void {
    this.sessions.delete(userId);
  }
}

