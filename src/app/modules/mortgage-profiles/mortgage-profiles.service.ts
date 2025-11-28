import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { mortgageProfiles } from './schemas/mortgage-profiles';
import { Database } from '../../../database/schema';
import { CreateMortgageProfileDto } from './dto/create-mortgage-profile.dto';
import type { MortgageProfile } from './schemas/mortgage-profiles';

@Injectable()
export class MortgageProfilesService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  async createMortgageProfile(
    userId: string,
    dto: CreateMortgageProfileDto
  ): Promise<MortgageProfile> {
    // Если материнский капитал включен, он должен быть частью первоначального взноса
    // Поэтому downPaymentAmount уже включает matCapitalAmount
    const matCapitalAmount = dto.matCapitalIncluded && dto.matCapitalAmount ? dto.matCapitalAmount : null;

    await this.db.insert(mortgageProfiles).values({
      userId,
      propertyPrice: dto.propertyPrice.toString(),
      propertyType: dto.propertyType,
      downPaymentAmount: dto.downPaymentAmount.toString(),
      matCapitalAmount: matCapitalAmount?.toString() || null,
      matCapitalIncluded: dto.matCapitalIncluded,
      loanTermYears: dto.loanTermYears,
      interestRate: dto.interestRate.toString(),
    });

    // Получаем ID вставленного профиля
    const [mortgageProfile] = await this.db
      .select()
      .from(mortgageProfiles)
      .where(eq(mortgageProfiles.userId, userId))
      .orderBy(desc(mortgageProfiles.id))
      .limit(1);
    
    return mortgageProfile;
  }

  async getMortgageProfileById(id: number, userId: string): Promise<MortgageProfile | null> {
    const [profile] = await this.db
      .select()
      .from(mortgageProfiles)
      .where(
        and(
          eq(mortgageProfiles.id, id),
          eq(mortgageProfiles.userId, userId)
        )
      );
    return profile || null;
  }
}

