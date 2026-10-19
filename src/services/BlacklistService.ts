import { type BlacklistRecord } from '../database/db';

export function validateBlacklist(name: string, description: string): string | null {
  if (!name.trim()) return 'Nama wajib diisi.';
  if (name.trim().length > 50) return 'Nama maksimal 50 karakter.';
  if (description.trim().length > 250) return 'Deskripsi maksimal 250 karakter.';
  return null;
}

export function createBlacklist(name: string, description: string, existing?: BlacklistRecord): BlacklistRecord {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}
