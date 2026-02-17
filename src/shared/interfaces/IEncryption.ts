// Port for symmetric encryption (e.g. IG token at rest).
export interface IEncryption {
  encrypt(plaintext: string): { ciphertext: string; iv: string };
  decrypt(ciphertext: string, ivBase64: string): string;
}
