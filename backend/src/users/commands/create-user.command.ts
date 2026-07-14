/** Команда создания пользователя. Диспатчится модулем Auth через CommandBus. */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  name?: string;
  personalDataConsentAt: Date;
  privacyPolicyAcceptedAt: Date;
  consentDocsVersion: string;
}

export class CreateUserCommand {
  constructor(public readonly data: CreateUserData) {}
}
