import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ConcertStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateConcertDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  artistBio?: string;

  @IsString()
  @IsNotEmpty({ message: 'Venue is required' })
  venue!: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date/time is required' })
  startsAt!: string;

  @IsDateString()
  @IsOptional()
  saleStartsAt?: string;

  @IsDateString()
  @IsOptional()
  saleEndsAt?: string;

  @IsEnum(ConcertStatus)
  @IsOptional()
  status?: ConcertStatus;

  @IsUrl()
  @IsOptional()
  seatMapUrl?: string;

  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  @IsString()
  @IsOptional()
  organizerId?: string;
}

export class UpdateConcertDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  artistBio?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  saleStartsAt?: string;

  @IsDateString()
  @IsOptional()
  saleEndsAt?: string;

  @IsEnum(ConcertStatus)
  @IsOptional()
  status?: ConcertStatus;

  @IsUrl()
  @IsOptional()
  seatMapUrl?: string;

  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;
}

export class ConcertQueryDto {
  @IsEnum(ConcertStatus)
  @IsOptional()
  status?: ConcertStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
