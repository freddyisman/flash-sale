import { FastifyReply, FastifyRequest } from 'fastify';

export const preValidation = (schema: any) => {
  return (
    request: FastifyRequest,
    _reply: FastifyReply,
    done: (err?: Error) => void,
  ) => {
    if (schema.validate) {
      const { error, value } = schema.validate(request.body);
      if (error) {
        return done(error);
      }
      request.body = value;
    } else {
      for (const [key, joiSchema] of Object.entries(schema)) {
        if ((joiSchema as any).validate) {
          const reqData = (request as any)[key];
          const { error, value } = (joiSchema as any).validate(reqData);
          if (error) {
            return done(error);
          }
          (request as any)[key] = value;
        }
      }
    }
    done();
  };
};
