export class CreateUserDto {
  tgId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  langCode: string | null;
  invitedBy: string | null;
}
