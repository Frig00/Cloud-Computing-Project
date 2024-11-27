import { Type } from '@sinclair/typebox';

export const HelloResponseSchema = Type.Object({
  message: Type.String(),
});

export const HelloErrorResponseSchema = Type.Object({
  message: Type.Integer(),
});
