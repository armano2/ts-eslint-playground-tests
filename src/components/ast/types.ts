import type { getTooltipLabel, getTypeName } from './utils';

export type OnHoverNodeFn = (node?: [number, number]) => void;
export type OnClickNodeFn = (node?: unknown) => void;

export type GetTypeNameFN = typeof getTypeName;
export type GetTooltipLabelFn = typeof getTooltipLabel;

export type ParentNodeType =
  | 'esNode'
  | 'tsNode'
  | 'tsType'
  | 'tsSymbol'
  | 'tsSignature'
  | 'tsFlow'
  | 'scope'
  | 'scopeVariable'
  | 'scopeDefinition'
  | 'scopeReference'
  | undefined;
