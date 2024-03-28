import { SoftballServer } from './softball-server';

let server: SoftballServer | null = null;
export const setServer = (s: SoftballServer | null) => {
  server = s;
};
export const getServer = (): SoftballServer => server as any;
