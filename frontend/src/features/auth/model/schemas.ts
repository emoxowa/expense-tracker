import { z } from 'zod';

/** Валидация зеркалит DTO бэкенда: email + пароль от 8 символов. */

const email = z.email('Введите корректный email');
const password = z.string().min(8, 'Пароль должен быть не короче 8 символов');

export const loginSchema = z.object({
  email,
  password,
});

/**
 * Согласия — два независимых обязательных чекбокса (требование РКН: на каждый
 * документ своя галочка, ни одна не предустановлена).
 */
export const registerSchema = z.object({
  email,
  name: z.string().optional(),
  password,
  personalDataConsent: z
    .boolean()
    .refine(
      (checked) => checked,
      'Необходимо согласие на обработку персональных данных',
    ),
  privacyPolicyAccepted: z
    .boolean()
    .refine(
      (checked) => checked,
      'Необходимо согласие с Политикой конфиденциальности',
    ),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
