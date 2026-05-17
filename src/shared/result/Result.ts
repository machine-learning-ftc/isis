export type Ok<TValue> = {
  ok: true;
  value: TValue;
};

export type Err<TError> = {
  ok: false;
  error: TError;
};

export type Result<TValue, TError> = Ok<TValue> | Err<TError>;

export const ok = <TValue>(value: TValue): Ok<TValue> => ({
  ok: true,
  value,
});

export const err = <TError>(error: TError): Err<TError> => ({
  ok: false,
  error,
});
