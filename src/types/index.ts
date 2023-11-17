export type ConditionFunction = () => boolean;
export type ConditionKeyword = 'where' | 'on' | 'having' | '';
export type ConditionArray<T, L = ConditionFunction> = T[] | [...T[], T | L];
