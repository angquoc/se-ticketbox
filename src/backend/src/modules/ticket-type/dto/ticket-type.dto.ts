import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { TicketTypeStatus } from '@prisma/client';

/**
 * Validates that saleEndsAt (if provided) is after saleStartsAt.
 */
@ValidatorConstraint({ name: 'saleWindowValid', async: false })
export class SaleWindowValidConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments): boolean {
    const obj = args.object as any;
    const startsAt = obj.saleStartsAt;
    const endsAt = obj.saleEndsAt;

    if (!startsAt) return true;
    if (!endsAt) return true;

    return new Date(endsAt) > new Date(startsAt);
  }

  defaultMessage(): string {
    return 'Sale end time must be after sale start time';
  }
}

export function SaleWindowValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: SaleWindowValidConstraint,
      constraints: [],
    });
  };
}

export class CreateTicketTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'Ticket type name is required' })
  name!: string;

  @IsInt()
  @Min(0, { message: 'Price must be 0 or greater' })
  price!: number;

  @IsInt()
  @Min(1, { message: 'Total quantity must be at least 1' })
  totalQty!: number;

  @IsInt()
  @Min(1, { message: 'Max per user must be at least 1' })
  maxPerUser!: number;

  @IsDateString()
  @IsNotEmpty({ message: 'Sale start time is required' })
  saleStartsAt!: string;

  @SaleWindowValid()
  @IsDateString()
  @IsOptional()
  saleEndsAt?: string;

  @IsEnum(TicketTypeStatus)
  @IsOptional()
  status?: TicketTypeStatus;
}

export class UpdateTicketTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0, { message: 'Price must be 0 or greater' })
  @IsOptional()
  price?: number;

  @IsInt()
  @Min(1, { message: 'Total quantity must be at least 1' })
  @IsOptional()
  totalQty?: number;

  /**
   * Manually adjust sold quantity.
   * Used by background jobs when orders are paid or expired.
   * Note: Prefer using the Order/Payment service to handle this atomically.
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  soldQty?: number;

  /**
   * Manually adjust reserved quantity.
   * Used by background jobs when orders expire or are cancelled.
   */
  @IsInt()
  @Min(0)
  @IsOptional()
  reservedQty?: number;

  @IsInt()
  @Min(1, { message: 'Max per user must be at least 1' })
  @IsOptional()
  maxPerUser?: number;

  @IsDateString()
  @IsOptional()
  saleStartsAt?: string;

  @SaleWindowValid()
  @IsDateString()
  @IsOptional()
  saleEndsAt?: string;

  @IsEnum(TicketTypeStatus)
  @IsOptional()
  status?: TicketTypeStatus;
}
