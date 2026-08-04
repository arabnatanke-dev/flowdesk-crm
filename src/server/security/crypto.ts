const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_KEY_BYTES = 32;
const SALT_BYTES = 16;

function encodeBase64Url(bytes: Uint8Array): string {
  // EN: Encode binary secrets without padding so they remain safe in database text fields.
  // RU: Кодирует бинарные секреты без padding для безопасного хранения в текстовых полях БД.
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string): Uint8Array {
  // EN: Restore a URL-safe base64 value before cryptographic verification.
  // RU: Восстанавливает URL-safe base64 перед криптографической проверкой.
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function derivePasswordKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  // EN: Derive a password key with PBKDF2-HMAC-SHA-256 using a per-user random salt.
  // RU: Формирует ключ пароля через PBKDF2-HMAC-SHA-256 с уникальной случайной солью.
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    PASSWORD_KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  // EN: Compare derived keys in constant work to avoid early-exit timing leaks.
  // RU: Сравнивает ключи за постоянное число операций без timing-утечки раннего выхода.
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
  // EN: Produce a versioned password record that can be upgraded without storing plaintext credentials.
  // RU: Создаёт версионированную запись пароля без хранения учётных данных в открытом виде.
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await derivePasswordKey(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(key)}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  // EN: Verify a submitted password against the stored versioned PBKDF2 record.
  // RU: Проверяет введённый пароль по сохранённой версионированной PBKDF2-записи.
  const [algorithm, iterationText, encodedSalt, encodedKey] = encodedHash.split("$");
  const iterations = Number(iterationText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > PASSWORD_ITERATIONS || !encodedSalt || !encodedKey) {
    return false;
  }
  const actualKey = await derivePasswordKey(password, decodeBase64Url(encodedSalt), iterations);
  return equalBytes(actualKey, decodeBase64Url(encodedKey));
}

export function createOpaqueToken(byteLength = 32): string {
  // EN: Create a high-entropy opaque token for a server-side session record.
  // RU: Создаёт высокоэнтропийный непрозрачный токен серверной сессии.
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256Hex(value: string): Promise<string> {
  // EN: Hash session tokens and rate-limit identifiers before database storage.
  // RU: Хеширует токены сессий и rate-limit идентификаторы перед хранением в БД.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPrivateIdentifier(value: string): Promise<string> {
  // EN: Protect low-entropy identifiers with a deployment secret before storing a stable digest.
  // RU: Защищает низкоэнтропийные идентификаторы deployment-секретом перед сохранением стабильного digest.
  const pepper = process.env.SECURITY_PEPPER ?? (process.env.NODE_ENV === "production" ? "" : "flowdesk-local-development-pepper-only");
  if (pepper.length < 32) throw new Error("SECURITY_PEPPER must contain at least 32 characters in production.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
