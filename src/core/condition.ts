import type { ISqlify } from './builder';
import { concat } from '@xwink/utils';
import { Field } from './field';
import { ConditionBuilder, QueryBuilder } from './builder';

/**
 * 条件运算符
 */
export enum ConditionOperator {
    /**
     * 相等
     */
    Equal = '=',
    /**
     * 不相等
     */
    NotEqual = '<>',
    /**
     * 大于
     */
    GreaterThan = '>',
    /**
     * 大于等于
     */
    GreaterThanOrEqual = '>=',
    /**
     * 小于
     */
    LessThan = '<',
    /**
     * 小于等于
     */
    LessThanOrEqual = '<=',
    /**
     * 包含
     */
    Like = 'like',
    /**
     * 开头
     */
    StartsWith = 'startsWith',
    /**
     * 结尾
     */
    EndsWith = 'endsWith',
    /**
     * 单字符模糊查询，需要在value中传入通配符，value改成数组，第一个元素使通配符，第二个元素是真正的参数
     */
    Match = 'match',
    /**
     * 枚举范围内
     */
    In = 'in',
    /**
     * 枚举范围外
     */
    NotIn = 'not in',
    /**
     * 空
     */
    IsNull = 'is null',
    /**
     * 非空
     */
    IsNotNull = 'is not null',
    /**
     * 区间内
     */
    Between = 'between',
    /**
     * 区间外
     */
    NotBetween = 'not between',
}
/**
 * 条件逻辑关系
 */
export enum ConditionLogic {
    /**
     * 交集
     */
    And = 'and',
    /**
     * 并集
     */
    Or = 'or',
}
/**
 * 单个条件项
 */
export class Condition implements ISqlify {
    field: Field;
    operator: ConditionOperator;
    value: unknown;
    placeholder?: string;
    constructor(field: Field, operator: ConditionOperator, value: unknown) {
        if (operator === ConditionOperator.Match) {
            if (!Array.isArray(value) || value.length !== 2) {
                throw new Error(
                    '使用 ConditionOperator.Match 时 value 必须为只有两个元素的数组！第一个元素为参数字符串类型的参数占位符模板，第二个元素为实际参数值。'
                );
            }
            const temp = value as [string, unknown];
            this.placeholder = temp[0];
            value = temp[1];
            if (!this.placeholder.match(/[_%]/g)?.length) {
                throw new Error('使用 ConditionOperator.Match 时，参数占位符模板中没有包含通配符[_%]！');
            }
            if (this.placeholder.match(/\?/g)?.length !== 1) {
                throw new Error('使用 ConditionOperator.Match 时，参数占位符模板中必须有且仅有一个英文问号！');
            }
        }
        this.field = field;
        this.operator = operator;
        this.value = value;
    }
    toSql(): string {
        let placeholder = '',
            error: never;
        if (this.value instanceof QueryBuilder) {
            // 子查询
            placeholder = concat(['(', this.value.toSql(), ')'], false);
        } else if (this.value instanceof Field) {
            // 字段比较，例如在on子句中作为表连接条件时
            placeholder = this.value.toSql();
        } else {
            switch (this.operator) {
                case ConditionOperator.Equal:
                case ConditionOperator.NotEqual:
                case ConditionOperator.GreaterThan:
                case ConditionOperator.GreaterThanOrEqual:
                case ConditionOperator.LessThan:
                case ConditionOperator.LessThanOrEqual:
                    placeholder = `?`;
                    break;
                case ConditionOperator.IsNull:
                case ConditionOperator.IsNotNull:
                    break;
                case ConditionOperator.StartsWith:
                    placeholder = `concat(?, '%')`;
                    break;
                case ConditionOperator.EndsWith:
                    placeholder = `concat('%', ?)`;
                    break;
                case ConditionOperator.Like:
                    placeholder = `concat('%', ?, '%')`;
                    break;
                case ConditionOperator.Match:
                    placeholder = this.placeholder!;
                    break;
                case ConditionOperator.In:
                case ConditionOperator.NotIn:
                    placeholder = `( ${concat(
                        this.getValues().map(() => '?'),
                        ', ',
                        false
                    )} )`;
                    break;
                case ConditionOperator.Between:
                case ConditionOperator.NotBetween:
                    placeholder = `? and ?`;
                    break;
                default:
                    error = this.operator;
                    throw error;
            }
        }
        // 运算符映射
        const map = {
            [ConditionOperator.StartsWith]: ConditionOperator.Like,
            [ConditionOperator.EndsWith]: ConditionOperator.Like,
            [ConditionOperator.Match]: ConditionOperator.Like,
        } as Record<ConditionOperator, ConditionOperator>;
        return concat([this.field.toSql(), this.operator in map ? map[this.operator] : this.operator, placeholder]);
    }
    getValues(): unknown[] {
        return [
            ...(this.value instanceof Array ? (this.value as unknown[]) : [this.value]).filter(
                (item) => !(item instanceof Field)
            ),
            ...(this.value instanceof ConditionBuilder ? this.value.getValues() : []),
        ];
    }
}
