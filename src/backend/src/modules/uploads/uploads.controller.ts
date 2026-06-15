import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UploadsService } from './uploads.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@Controller('organizer/concerts/:concertId')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('upload-pdf')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadArtistPdf(
    @Param('concertId') concertId: string,
    @UploadedFile() file: MulterFile,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file PDF');
    }

    return this.uploadsService.uploadArtistPdf({
      concertId,
      file,
      userId: req.user.sub,
      role: req.user.role,
    });
  }

  @Get('uploads/:uploadedFileId/status')
  @UseGuards(AuthGuard)
  getUploadStatus(@Param('uploadedFileId') uploadedFileId: string) {
    return this.uploadsService.getUploadStatus(uploadedFileId);
  }

  @Post('upload-csv')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadGuestListCsv(
    @Param('concertId') concertId: string,
    @UploadedFile() file: MulterFile,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file CSV');
    }

    return this.uploadsService.uploadGuestListCsv({
      concertId,
      file,
      userId: req.user.sub,
      role: req.user.role,
    });
  }
}
