import { Request } from 'express';
import { type User } from '../../user/schemas/users';

export interface RequestWithUser extends Request {
  user: User;
}