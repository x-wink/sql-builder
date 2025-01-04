import type { ChangeFunctionReturnType, PickFunctions } from '@xwink/utils';
import { concat } from '@xwink/utils';
import type { ConditionArray, ConditionFunction, ConditionKeyword } from '../types';
import { parseConditionArray } from '../utils';
import { Condition, ConditionLogic, ConditionOperator } from './condition';
import { Field } from './field';
import { Limit } from './limit';
import { OrderBy, OrderByDirection } from './orderBy';
import { Set } from './set';
import { JoinTable, JoinTableType, Table } from './table';
import { Value } from './value';

/**
 * 可转换为SQL语句对象接口
 */
export abstract class ISqlify {
    abstract toSql(): string;
    abstract getValues(): unknown[];
}
/**
 * SQL描述对象构建器，通常表示一个SQL子语句对象
 */
export abstract class SqlBuilder<T extends ISqlify> extends ISqlify {
    protected abstract type: string;
    children: T[] = [];
    protected notEmpty() {
        return this.children.length > 0;
    }
    /**
     * 生成SQL
     */
    toSql() {
        return concat(this.children.map((item) => item.toSql()));
    }
    /**
     * SQL参数列表
     */
    getValues(): unknown[] {
        return this.children
            .flatMap((item) => item.getValues())
            .flatMap((item) => (item instanceof QueryBuilder ? item.getValues() : item));
    }
    /**
     * 重置所有状态
     * @param children 重置后的引用数据
     */
    reset(children: T[] = []) {
        this.children = children;
        return this;
    }
    /**
     * 判断是否为同一类型的构建器
     * @param builder 目标构建器
     */
    isSameType(builder: SqlBuilder<ISqlify>) {
        return this.type === builder.type;
    }
    /** 是否为查询表字段子句构建器 */
    isSelectBuilder(): this is SelectBuilder {
        return this.type === 'select';
    }
    /** 是否为查询表来源子句构建器 */
    isTableBuilder(): this is TableBuilder {
        return this.type === 'table';
    }
    /** 是否为条件子句构建器 */
    isConditionBuilder(): this is ConditionBuilder {
        return this.type === 'condition';
    }
    /** 是否为表连接条件子句构建器 */
    isOnBuilder(): this is OnBuilder {
        return this.type === 'on';
    }
    /** 是否为查询条件子句构建器 */
    isWhereBuilder(): this is WhereBuilder {
        return this.type === 'where';
    }
    /** 是否为分组条件子句构建器 */
    isHavingBuilder(): this is HavingBuilder {
        return this.type === 'having';
    }
    /** 是否为分组子句构建器 */
    isGroupByByBuilder(): this is GroupByBuilder {
        return this.type === 'groupBy';
    }
    /** 是否为排序子句构建器 */
    isOrderByBuilder(): this is OrderByBuilder {
        return this.type === 'orderBy';
    }
    /** 是否为截取子句构建器 */
    isLimitBuilder(): this is LimitBuilder {
        return this.type === 'limit';
    }
    /** 是否为查询语句构建器 */
    isQueryBuilder(): this is QueryBuilder {
        return this.type === 'query';
    }
}

/**
 * select子语句构建器
 */
export class SelectBuilder extends SqlBuilder<Field> {
    protected type = 'select';
    select(...fieldExpresses: ConditionArray<string>) {
        parseConditionArray(fieldExpresses).forEach((field) => {
            this.children.push(Field.parse(field));
        });
        return this;
    }
    toSql(): string {
        if (!this.children.length) {
            this.select('*');
        }
        return concat(
            [
                'select',
                concat(
                    this.children.map((item) => item.toSql()),
                    ', ',
                    false
                ),
            ],
            false
        );
    }
    getValues(): unknown[] {
        return [];
    }
}
/**
 * from子语句和join子语句构建器
 */
export class TableBuilder extends SqlBuilder<JoinTable> {
    protected type = 'table';
    private hasPrimary = false;
    constructor() {
        super();
    }
    /**
     * 添加数据表
     * @param table 表名
     * @param alias 别名
     * @param on 连接条件，from子语句没有
     * @param joinType 连接类型
     * @param condition 生效条件
     */
    private join(
        table: string,
        alias?: string,
        on?: OnBuilder,
        joinType?: JoinTableType,
        condition?: ConditionFunction
    ) {
        if (condition?.() !== false) {
            const joinTable = new JoinTable(table, alias, on, joinType);
            if (joinType === JoinTableType.PRIMARY) {
                // 确保主表只有一个并且必须排第一
                if (this.hasPrimary) {
                    this.children[0] = joinTable;
                } else {
                    this.hasPrimary = true;
                    this.children.unshift(joinTable);
                }
            } else {
                this.children.push(joinTable);
            }
        }
        return this;
    }
    /**
     * 设置主表
     * @param table 表名
     * @param alias 别名
     */
    from(table: string, alias?: string) {
        return this.join(table, alias, void 0, JoinTableType.PRIMARY);
    }
    /**
     * 添加内连接
     * @param table 表名
     * @param alias 别名
     * @param on 连接条件
     * @param condition 生效条件
     */
    innerJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        return this.join(table, alias, on, JoinTableType.INNER, condition);
    }
    /**
     * 添加左外连接
     * @param table 表名
     * @param alias 别名
     * @param on 连接条件
     * @param condition 生效条件
     */
    leftJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        return this.join(table, alias, on, JoinTableType.LEFT, condition);
    }
    /**
     * 添加右外连接
     * @param table 表名
     * @param alias 别名
     * @param on 连接条件
     * @param condition 生效条件
     */
    rightJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        return this.join(table, alias, on, JoinTableType.RIGHT, condition);
    }
    /**
     * 添加全外连接
     * @param table 表名
     * @param alias 别名
     * @param on 连接条件
     * @param condition 生效条件
     */
    fullJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        return this.join(table, alias, on, JoinTableType.FULL, condition);
    }
    reset() {
        super.reset();
        this.hasPrimary = false;
        return this;
    }
}
/**
 * 条件构建器（条件集，可包含嵌套多个条件集或多个条件项）
 */
export class ConditionBuilder extends SqlBuilder<ConditionBuilder | Condition> {
    protected type = 'condition';
    private keyword: ConditionKeyword;
    protected logic: ConditionLogic;
    /**
     * @param keyword 条件子语句关键字
     * @param logic 条件集逻辑关系，同一个条件集只能是同样的逻辑关系，除非使用嵌套条件集
     */
    constructor(keyword: ConditionKeyword = '', logic: ConditionLogic = ConditionLogic.And) {
        super();
        this.keyword = keyword;
        this.logic = logic;
    }
    /**
     * 新增嵌套条件集，当前条件集没有条件项的时候不会添加而是更改条件集逻辑关系
     * @param logic 条件集中条件项之间的逻辑关系
     */
    private nest(logic = ConditionLogic.And) {
        let nest;
        if (this.notEmpty()) {
            nest = new ConditionBuilder(void 0, logic);
            this.children.push(nest);
        } else {
            this.logic = logic;
            return this;
        }
        return nest;
    }
    /**
     * 如果当前条件集有条件项则添加一个逻辑关系为and的嵌套条件集，否则修改当前条件集的逻辑关系为and
     */
    and() {
        return this.nest();
    }
    /**
     * 如果当前条件集有条件项则添加一个逻辑关系为or的嵌套条件集，否则修改当前条件集的逻辑关系为or
     */
    or() {
        return this.nest(ConditionLogic.Or);
    }
    /**
     * 添加一个条件项
     * @param type 条件运算符
     * @param fieldExpress 字段表达式
     * @param value 参数，值为QueryBuilder类型的时候形成子查询，值为Field类型的时候不使用参数占位符直接进行字段比较
     * @param condition 生效条件
     */
    private where(type: ConditionOperator, fieldExpress: string, value: unknown, condition?: ConditionFunction) {
        condition?.() !== false && this.children.push(new Condition(Field.parse(fieldExpress), type, value));
        return this;
    }
    /**
     * 相等
     */
    equal(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.Equal, field, value, condition);
    }
    /**
     * 不相等
     */
    notEqual(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.NotEqual, field, value, condition);
    }
    /**
     * 大于
     */
    gt(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.GreaterThan, field, value, condition);
    }
    /**
     * 大于等于
     */
    gte(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.GreaterThanOrEqual, field, value, condition);
    }
    /**
     * 小于
     */
    lt(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.LessThan, field, value, condition);
    }
    /**
     * 小于等于
     */
    lte(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.LessThanOrEqual, field, value, condition);
    }
    /**
     * 模糊查询，包含
     */
    like(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.Like, field, value, condition);
    }
    /**
     * 模糊查询，以此开头
     */
    startsWith(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.StartsWith, field, value, condition);
    }
    /**
     * 模糊查询，以此结尾
     */
    endsWith(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.EndsWith, field, value, condition);
    }
    /**
     * 单字符模糊查询
     */
    match(field: string, value: [string, unknown], condition?: ConditionFunction) {
        return this.where(ConditionOperator.Match, field, value, condition);
    }
    /**
     * 范围查询，枚举范围内，常配合子查询使用
     */
    in(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.In, field, value, condition);
    }
    /**
     * 范围查询，枚举范围外
     */
    notIn(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.NotIn, field, value, condition);
    }
    /**
     * 空值
     */
    isNull(field: string, condition?: ConditionFunction) {
        return this.where(ConditionOperator.IsNull, field, void 0, condition);
    }
    /**
     * 非空值
     */
    notNull(field: string, condition?: ConditionFunction) {
        return this.where(ConditionOperator.IsNotNull, field, void 0, condition);
    }
    /**
     * 范围查询，区间范围内
     */
    between(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.Between, field, value, condition);
    }
    /**
     * 范围查询，区间范围外
     */
    notBetween(field: string, value: unknown, condition?: ConditionFunction) {
        return this.where(ConditionOperator.NotBetween, field, value, condition);
    }
    toSql(): string {
        return this.notEmpty()
            ? concat([
                  this.keyword,
                  concat(
                      this.children.map((item) =>
                          item instanceof ConditionBuilder ? `( ${item.toSql()} )` : item.toSql()
                      ),
                      ` ${this.logic} `,
                      false
                  ),
              ])
            : '';
    }
}
/**
 * on子句构建器
 */
export class OnBuilder extends ConditionBuilder {
    protected type = 'on';
    constructor(logic: ConditionLogic = ConditionLogic.And) {
        super('on', logic);
    }
}
/**
 * where子句构建器
 */
export class WhereBuilder extends ConditionBuilder {
    protected type = 'where';
    constructor(logic: ConditionLogic = ConditionLogic.And) {
        super('where', logic);
    }
}
/**
 * having子句构建器
 */
export class HavingBuilder extends ConditionBuilder {
    protected type = 'having';
    constructor(logic: ConditionLogic = ConditionLogic.And) {
        super('having', logic);
    }
}
/**
 * groupBy子句构建器
 */
export class GroupByBuilder extends SqlBuilder<Field> {
    protected type = 'groupBy';
    private condition?: HavingBuilder;
    /**
     * 分组
     * @param fieldExpress 分组字段
     * @param condition 生效条件
     */
    groupBy(fieldExpress: string, condition?: ConditionFunction) {
        condition?.() !== false && this.children.push(Field.parse(fieldExpress));
    }
    /**
     * 分组条件
     * @param having 分组条件子句
     * @param condition 生效条件
     */
    having(having?: HavingBuilder, condition?: ConditionFunction) {
        if (condition?.() !== false) {
            this.condition = having;
        }
    }
    toSql(): string {
        return this.notEmpty()
            ? concat(
                  [
                      'group by',
                      concat(
                          this.children.map((item) => item.toSql()),
                          ', ',
                          false
                      ),
                      this.condition?.toSql() ?? '',
                  ],
                  false
              )
            : '';
    }
    reset() {
        super.reset();
        this.condition?.reset();
        return this;
    }
    getValues(): unknown[] {
        return this.condition?.getValues() ?? [];
    }
}
/**
 * orderBy子句构建器
 */
export class OrderByBuilder extends SqlBuilder<OrderBy> {
    protected type = 'orderBy';
    /**
     * 排序
     * @param fieldExpress 排序字段
     * @param direction 排序顺序
     * @param condition 生效条件
     */
    orderBy(fieldExpress: string, direction = OrderByDirection.ASC, condition?: ConditionFunction) {
        condition?.() !== false && this.children.push(new OrderBy(Field.parse(fieldExpress), direction));
    }
    toSql(): string {
        return this.notEmpty()
            ? concat(
                  [
                      'order by',
                      concat(
                          this.children.map((item) => item.toSql()),
                          ', ',
                          false
                      ),
                  ],
                  false
              )
            : '';
    }
}
/**
 * limit子句构建器
 */
export class LimitBuilder extends SqlBuilder<Limit> {
    protected type = 'limit';
    /**
     * 截取
     * @param start 开始下标
     * @param end 结束下标
     */
    limit(start: number, end: number, condition?: ConditionFunction) {
        if (condition?.() !== false) {
            this.children[0] = new Limit(start, end);
        }
    }
    /**
     * 分页
     * @param pageNo 页码，从1开始
     * @param pageSize 页容量
     */
    page(pageNo: number, pageSize: number, condition?: ConditionFunction) {
        if (pageSize > 0 && condition?.() !== false) {
            this.children[0] = Limit.page(pageNo, pageSize);
        }
    }
}

// 提取各子句构建器中除了reset之外所有链式调用函数（返回值是只自身），并把返回值改成QueryBuilder
type PickBuilderChainedFuncs<T, O extends keyof T = never> = ChangeFunctionReturnType<
    PickFunctions<T, 'reset' | 'children'>,
    T,
    QueryBuilder,
    O
>;
/**
 * 查询语句构建器
 */
export class QueryBuilder
    extends SqlBuilder<SqlBuilder<ISqlify>>
    implements
        PickBuilderChainedFuncs<SelectBuilder>,
        PickBuilderChainedFuncs<TableBuilder>,
        PickBuilderChainedFuncs<WhereBuilder, 'and' | 'or'>,
        PickBuilderChainedFuncs<GroupByBuilder>,
        PickBuilderChainedFuncs<OrderByBuilder>,
        PickBuilderChainedFuncs<LimitBuilder>
{
    protected type = 'query';
    selectBuilder: SelectBuilder;
    tableBuilder: TableBuilder;
    whereBuilder: WhereBuilder;
    groupByBuilder: GroupByBuilder;
    orderByBuilder: OrderByBuilder;
    limitBuilder: LimitBuilder;
    constructor() {
        super();
        // 初始化子语句构建器
        this.selectBuilder = new SelectBuilder();
        this.tableBuilder = new TableBuilder();
        this.whereBuilder = new WhereBuilder();
        this.groupByBuilder = new GroupByBuilder();
        this.orderByBuilder = new OrderByBuilder();
        this.limitBuilder = new LimitBuilder();
        this.children = [
            this.selectBuilder,
            this.tableBuilder,
            this.whereBuilder,
            this.groupByBuilder,
            this.orderByBuilder,
            this.limitBuilder,
        ];
    }
    /**
     * 设置子句builder
     * @param builder 子句builder
     */
    setBuilder(builder: SqlBuilder<ISqlify>) {
        if (this.children.find((item) => item.isSameType(builder))) {
            if (builder.isSelectBuilder()) {
                this.children[0] = this.selectBuilder = builder;
            } else if (builder.isTableBuilder()) {
                this.children[1] = this.tableBuilder = builder;
            } else if (builder.isWhereBuilder()) {
                this.children[2] = this.whereBuilder = builder;
            } else if (builder.isGroupByByBuilder()) {
                this.children[3] = this.groupByBuilder = builder;
            } else if (builder.isOrderByBuilder()) {
                this.children[4] = this.orderByBuilder = builder;
            } else if (builder.isLimitBuilder()) {
                this.children[5] = this.limitBuilder = builder;
            }
        }
        return this;
    }
    // 代理SelectBuilder
    /**
     * 批量添加查询字段，默认查询 select *
     * @param fieldExpress1 字段表达式1
     * @param fieldExpress2 字段表达式2
     * @param fieldExpressN 字段表达式n
     * @param condition 生效条件
     * @example builder.select('id', 'name', 'age').select('password', () => loginUser.isAdmin)
     */
    select(...args: Parameters<SelectBuilder['select']>) {
        this.selectBuilder.select(...args);
        return this;
    }

    // 代理TableBuilder
    from(table: string, alias?: string) {
        this.tableBuilder.from(table, alias);
        return this;
    }
    innerJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        this.tableBuilder.innerJoin(table, alias, on, condition);
        return this;
    }
    leftJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        this.tableBuilder.leftJoin(table, alias, on, condition);
        return this;
    }
    rightJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        this.tableBuilder.rightJoin(table, alias, on, condition);
        return this;
    }
    fullJoin(table: string, alias?: string, on?: OnBuilder, condition?: ConditionFunction) {
        this.tableBuilder.fullJoin(table, alias, on, condition);
        return this;
    }
    // 代理WhereBuilder
    and() {
        return this.whereBuilder.and();
    }
    or() {
        return this.whereBuilder.or();
    }
    equal(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.equal(field, value, condition);
        return this;
    }
    notEqual(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.notEqual(field, value, condition);
        return this;
    }
    gt(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.gt(field, value, condition);
        return this;
    }
    gte(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.gte(field, value, condition);
        return this;
    }
    lt(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.lt(field, value, condition);
        return this;
    }
    lte(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.lte(field, value, condition);
        return this;
    }
    like(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.like(field, value, condition);
        return this;
    }
    match(field: string, value: [string, unknown], condition?: ConditionFunction) {
        this.whereBuilder.match(field, value, condition);
        return this;
    }
    startsWith(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.startsWith(field, value, condition);
        return this;
    }
    endsWith(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.endsWith(field, value, condition);
        return this;
    }
    in(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.in(field, value, condition);
        return this;
    }
    notIn(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.notIn(field, value, condition);
        return this;
    }
    isNull(field: string, condition?: ConditionFunction) {
        this.whereBuilder.isNull(field, condition);
        return this;
    }
    notNull(field: string, condition?: ConditionFunction) {
        this.whereBuilder.notNull(field, condition);
        return this;
    }
    between(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.between(field, value, condition);
        return this;
    }
    notBetween(field: string, value: unknown, condition?: ConditionFunction) {
        this.whereBuilder.notBetween(field, value, condition);
        return this;
    }
    // 代理GroupByBuilder
    groupBy(field: string, condition?: ConditionFunction) {
        this.groupByBuilder.groupBy(field, condition);
        return this;
    }
    having(having?: HavingBuilder, condition?: ConditionFunction) {
        this.groupByBuilder.having(having, condition);
        return this;
    }
    // 代理OrderByBuilder
    orderBy(field: string, direction = OrderByDirection.ASC, condition?: ConditionFunction) {
        this.orderByBuilder.orderBy(field, direction, condition);
        return this;
    }
    // 代理LimitBuilder
    limit(start: number, end: number, condition?: ConditionFunction) {
        this.limitBuilder.limit(start, end, condition);
        return this;
    }
    page(pageNo: number, pageSize: number, condition?: ConditionFunction) {
        this.limitBuilder.page(pageNo, pageSize, condition);
        return this;
    }
    // 覆盖SqlBuilder
    override reset() {
        this.children.forEach((builder) => builder.reset());
        return this;
    }
}

/**
 * 插入语句构建器
 */
export class InsertBuilder extends SqlBuilder<Field> {
    protected type = 'insert';
    private table: Table;
    private entities: Value[] = [];
    constructor(table: string) {
        super();
        this.table = new Table(table);
    }
    fields(...fields: ConditionArray<string>) {
        parseConditionArray(fields).forEach((field) => {
            this.children.push(new Field(field));
        });
        return this;
    }
    values(...entities: ConditionArray<object>) {
        parseConditionArray(entities).forEach((entity) => {
            this.entities.push(new Value(entity));
        });
        return this;
    }
    override toSql(): string {
        return concat([
            'insert into',
            this.table.toSql(),
            concat([
                '(',
                concat(
                    this.children.map((item) => item.toSql()),
                    ', '
                ),
                ')',
            ]),
            'values',
            concat(
                this.entities.map((item) => item.toSql(this.children.length)),
                ', '
            ),
        ]);
    }
    override getValues(): unknown[] {
        return this.entities.flatMap((entity) => entity.getValues(this.children.map((item) => item.name)));
    }
}

/**
 * 插入语句构建器
 */
export class UpdateBuilder extends SqlBuilder<Set> {
    protected type = 'update';
    private table: Table;
    private whereBuilder: WhereBuilder = new WhereBuilder();
    constructor(table: string) {
        super();
        this.table = new Table(table);
    }
    set(data: object, condition?: ConditionFunction) {
        if (condition?.() !== false) {
            Object.entries(data).forEach(([key, value]) => {
                this.children.push(new Set(key, value));
            });
        }
        return this;
    }
    where(data: object, condition?: ConditionFunction) {
        if (condition?.() !== false) {
            Object.entries(data).forEach(([key, value]) => {
                Array.isArray(value) ? this.whereBuilder.in(key, value) : this.whereBuilder.equal(key, value);
            });
        }
        return this;
    }
    override toSql(): string {
        return concat([
            'update',
            this.table.toSql(),
            'set',
            this.children.map((item) => item.toSql()).join(','),
            this.whereBuilder.toSql(),
        ]);
    }
    override getValues(): unknown[] {
        return [...this.children.flatMap((item) => item.getValues()), ...this.whereBuilder.getValues()];
    }
}
