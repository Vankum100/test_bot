import { IsNumber, IsString, IsBoolean, IsEnum, IsOptional, Min, Max } from 'class-validator';

export enum PropertyType {
  APARTMENT_IN_NEW_BUILDING = 'apartment_in_new_building',
  APARTMENT_IN_SECONDARY_BUILDING = 'apartment_in_secondary_building',
  HOUSE = 'house',
  HOUSE_WITH_LAND_PLOT = 'house_with_land_plot',
  LAND_PLOT = 'land_plot',
  OTHER = 'other',
}

export class CreateMortgageProfileDto {
  @IsNumber()
  @Min(0)
  propertyPrice: number;

  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @IsNumber()
  @Min(0)
  downPaymentAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  matCapitalAmount: number | null;

  @IsBoolean()
  matCapitalIncluded: boolean;

  @IsNumber()
  @Min(1)
  @Max(30)
  loanTermYears: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;
}

