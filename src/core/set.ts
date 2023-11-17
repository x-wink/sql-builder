import type { ISqlify } from './builder';
import { Field } from './field';
import { Condition } from './condition';
import { ConditionOperator } from './condition';
/**
 * 字段值
 */
export class Set implements ISqlify {
    private data: Condition;
    constructor(field: string, value: unknown) {
        this.data = new Condition(Field.parse(field), ConditionOperator.Equal, value);
    }
    toSql(): string {
        return this.data.toSql();
    }
    getValues(): unknown[] {
        return this.data.getValues();
    }
}
