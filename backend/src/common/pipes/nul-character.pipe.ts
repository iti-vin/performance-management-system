import { BadRequestException, type ArgumentMetadata, type PipeTransform } from "@nestjs/common";

const NUL = "\u0000";
const MESSAGE = "Remove the character that cannot be saved.";

interface Node {
  value: unknown;
  path: string;
}

/** The place of the first NUL character, or null. It walks with a list, so depth costs no stack. */
function findNul(root: unknown): string | null {
  const open: Node[] = [{ value: root, path: "" }];
  for (let node = open.pop(); node; node = open.pop()) {
    const { value, path } = node;
    if (typeof value === "string" && value.includes(NUL)) return path;
    if (typeof value !== "object" || value === null) continue;
    for (const [key, child] of Object.entries(value)) {
      if (key.includes(NUL)) return path;
      open.push({ value: child, path: path ? `${path}.${key}` : key });
    }
  }
  return null;
}

/** PostgreSQL stores no NUL character, in `text` or in `jsonb`: input that holds one gets 400. */
export class NulCharacterPipe implements PipeTransform {
  transform(value: unknown, { type }: ArgumentMetadata): unknown {
    // `custom` is what the server adds itself, for example the signed-in user.
    if (type === "custom") return value;
    const path = findNul(value);
    if (path === null) return value;
    throw new BadRequestException({
      message: "The request contains invalid fields.",
      details: [{ field: path || type, code: "INVALID_CHARACTER", message: MESSAGE }],
    });
  }
}
