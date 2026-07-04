import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SeatmapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  ttlLayout?: number; // override cache TTL for layout (seconds)
}

export class AvailabilityQueryDto {
  @IsOptional()
  @IsString()
  ticketTypeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  ttl?: number; // override cache TTL for availability (seconds)
}
