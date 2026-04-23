import { t } from "elysia";

export const apiErrorSchema = t.Object({
  code: t.String(),
  message: t.String(),
  requestId: t.String(),
});
