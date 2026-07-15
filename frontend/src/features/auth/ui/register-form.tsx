'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { saveSession } from '@/entities/session';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { register } from '../api/auth-api';
import { registerSchema, type RegisterFormValues } from '../model/schemas';

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register: registerField,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Согласия не предустановлены — пользователь отмечает их сам.
    defaultValues: {
      personalDataConsent: false,
      privacyPolicyAccepted: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const session = await register({
        ...values,
        // Пустая строка в необязательном поле не должна уходить на бэкенд.
        name: values.name?.trim() || undefined,
      });
      saveSession(session);
      router.replace('/dashboard');
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : 'Не удалось зарегистрироваться',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...registerField('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Имя</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Как к вам обращаться"
            aria-invalid={!!errors.name}
            {...registerField('name')}
          />
          <FieldDescription>Необязательно</FieldDescription>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Пароль</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...registerField('password')}
          />
          <FieldDescription>Минимум 8 символов</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>

        <Controller
          control={control}
          name="personalDataConsent"
          render={({ field }) => (
            <ConsentField
              id="personalDataConsent"
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.personalDataConsent}
              text="Я даю согласие на "
              href="/consent"
              linkText="обработку персональных данных"
            />
          )}
        />

        <Controller
          control={control}
          name="privacyPolicyAccepted"
          render={({ field }) => (
            <ConsentField
              id="privacyPolicyAccepted"
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.privacyPolicyAccepted}
              text="Я ознакомлен(а) с "
              href="/privacy"
              linkText="Политикой конфиденциальности"
            />
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Создать аккаунт
        </Button>
      </FieldGroup>
    </form>
  );
}

type ConsentFieldProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur: () => void;
  error?: { message?: string };
  text: string;
  href: string;
  linkText: string;
};

/**
 * Обязательная галочка согласия со ссылкой на документ. Требование РКН:
 * отдельная галочка на каждый документ, без предустановленного значения.
 */
function ConsentField({
  id,
  checked,
  onCheckedChange,
  onBlur,
  error,
  text,
  href,
  linkText,
}: ConsentFieldProps) {
  return (
    <Field orientation="horizontal" data-invalid={!!error}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        onBlur={onBlur}
        aria-invalid={!!error}
      />
      <FieldContent>
        <FieldLabel htmlFor={id} className="font-normal">
          <span>
            {text}
            <Link
              href={href}
              target="_blank"
              className="underline underline-offset-4 hover:text-primary"
              // Без этого клик по ссылке внутри label ещё и переключал бы галочку.
              onClick={(event) => event.stopPropagation()}
            >
              {linkText}
            </Link>
          </span>
        </FieldLabel>
        <FieldError errors={[error]} />
      </FieldContent>
    </Field>
  );
}
