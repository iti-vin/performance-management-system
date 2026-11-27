import { ValidationPipe, type PipeTransform } from "@nestjs/common";

import { validationException } from "../filters/api-exception.filter.js";
import { NulCharacterPipe } from "./nul-character.pipe.js";

/** The pipes that every request passes, in this order. */
export function globalPipes(): PipeTransform[] {
  return [
    new NulCharacterPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationException,
    }),
  ];
}
