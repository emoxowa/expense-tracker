import { AuthResponse, LoginDto, RegisterDto } from '@expence-tracker/shared';
import { apiFetch } from '@/shared/api';

export function login(dto: LoginDto): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: dto });
}

export function register(dto: RegisterDto): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: dto,
  });
}
