/** Базовый HTTP-клиент для запросов к бэкенду (Nest.js). */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Ошибка API: сохраняет HTTP-статус и сообщение из тела ответа Nest.js. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** JWT-токен; добавляется как Bearer-заголовок. */
  accessToken?: string;
}

/**
 * Выполняет JSON-запрос к API. Бросает ApiError с сообщением бэкенда
 * (ValidationPipe и HttpException кладут его в поле `message`).
 */
export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, accessToken }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Попробуйте позже.');
  }

  if (!response.ok) {
    let message = `Ошибка запроса (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) message = data.message.join('. ');
      else if (data.message) message = data.message;
    } catch {
      // тело не JSON — оставляем сообщение по умолчанию
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}
