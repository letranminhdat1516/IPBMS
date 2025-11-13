import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import ErrorCodes, { ErrorCode } from '../constants/error-codes';

export function createNotFoundException(
  messageVi: string,
  _code: ErrorCode = ErrorCodes.NOT_FOUND,
  _details?: any,
) {
  const payload = { code: _code, message: messageVi, details: _details };
  return new NotFoundException(payload);
}

export function createForbiddenException(
  messageVi: string,
  _code: ErrorCode = ErrorCodes.FORBIDDEN,
  _details?: any,
) {
  const payload = { code: _code, message: messageVi, details: _details };
  return new ForbiddenException(payload);
}

export function createBadRequestException(
  messageVi: string,
  _code: ErrorCode = ErrorCodes.BAD_REQUEST,
  _details?: any,
) {
  const payload = { code: _code, message: messageVi, details: _details };
  return new BadRequestException(payload);
}

export function createInternalServerErrorException(
  messageVi: string,
  _code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
  _details?: any,
) {
  const payload = { code: _code, message: messageVi, details: _details };
  return new InternalServerErrorException(payload);
}

export function createUnauthorizedException(
  messageVi: string,
  _code: ErrorCode = ErrorCodes.UNAUTHORIZED,
  _details?: any,
) {
  const payload = { code: _code, message: messageVi, details: _details };
  return new UnauthorizedException(payload);
}

export default {
  createNotFoundException,
  createForbiddenException,
  createBadRequestException,
  createInternalServerErrorException,
  createUnauthorizedException,
};
