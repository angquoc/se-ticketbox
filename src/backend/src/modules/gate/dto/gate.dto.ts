import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGateDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateGateDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class GateResponseDto {
  id: string;
  name: string;
  concertId: string;
  ticketCount: number;
  createdAt: Date;
}

export class RebalanceGatesResponseDto {
  totalTicketsUpdated: number;
  gates: {
    id: string;
    name: string;
    ticketCount: number;
  }[];
}
