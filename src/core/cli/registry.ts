import { ARUBA_SPECS } from './aruba';
import { CISCO_SPECS } from './cisco';
import { PC_SPECS } from './pc';
import type { CommandSpec } from './spec';

/** Single source of truth: parser, `?` help, Command Library and tests all read this list. */
export const SPECS: CommandSpec[] = [...CISCO_SPECS, ...ARUBA_SPECS, ...PC_SPECS];
