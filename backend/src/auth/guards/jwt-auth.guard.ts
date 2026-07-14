import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard, требующий валидный Bearer-JWT (стратегия 'jwt'). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
