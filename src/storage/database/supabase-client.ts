import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

interface QueryBuilder {
  select: (columns?: string, opts?: { count?: string; head?: boolean }) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  or: (expr: string) => QueryBuilder;
  order: (column: string, opts?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  gte: (column: string, value: unknown) => QueryBuilder;
  gt: (column: string, value: unknown) => QueryBuilder;
  lt: (column: string, value: unknown) => QueryBuilder;
  lte: (column: string, value: unknown) => QueryBuilder;
  like: (column: string, pattern: string) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  in: (column: string, values: QueryBuilder | unknown[]) => QueryBuilder;
  contains: (column: string, value: unknown) => QueryBuilder;
  containedBy: (column: string, value: unknown) => QueryBuilder;
  insert: (data: Record<string, unknown> | Record<string, unknown>[]) => QueryBuilder;
  update: (data: Record<string, unknown>) => QueryBuilder;
  delete: () => QueryBuilder;
  single: () => QueryBuilder;
  maybeSingle: () => QueryBuilder;
  then: (onfulfilled?: (value: { data: unknown; error: Error | null; count?: number }) => unknown, onrejected?: (reason: unknown) => unknown) => Promise<unknown>;
}

type CondType = 'eq' | 'or' | 'gte' | 'gt' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'contains' | 'containedBy';

interface Condition {
  type: CondType;
  col?: string;
  val?: unknown;
  expr?: string;
  subquery?: QueryBuilder;
}

interface JoinDef {
  refTable: string;
  alias: string;
  fkColumn: string;
  refCols: string;
}

class QueryBuilderImpl implements QueryBuilder {
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private columns: string = '*';
  private opts: { count?: string; head?: boolean } = {};
  private conditions: Condition[] = [];
  private orderClauses: Array<{ column: string; ascending: boolean }> = [];
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private updateData: Record<string, unknown> | null = null;
  private returnSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, opts?: { count?: string; head?: boolean }): QueryBuilder {
    this.operation = 'select';
    if (columns !== undefined) this.columns = columns;
    if (opts) this.opts = opts;
    return this;
  }
  eq(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'eq', col: column, val: value }); return this;
  }
  or(expr: string): QueryBuilder {
    this.conditions.push({ type: 'or', expr }); return this;
  }
  order(column: string, opts?: { ascending?: boolean }): QueryBuilder {
    this.orderClauses.push({ column, ascending: opts?.ascending !== false }); return this;
  }
  range(from: number, to: number): QueryBuilder {
    this.limitVal = to - from + 1;
    this.offsetVal = from; return this;
  }
  limit(n: number): QueryBuilder { this.limitVal = n; return this; }
  gte(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'gte', col: column, val: value }); return this;
  }
  gt(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'gt', col: column, val: value }); return this;
  }
  lt(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'lt', col: column, val: value }); return this;
  }
  lte(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'lte', col: column, val: value }); return this;
  }
  like(column: string, pattern: string): QueryBuilder {
    this.conditions.push({ type: 'like', col: column, val: pattern }); return this;
  }
  ilike(column: string, pattern: string): QueryBuilder {
    this.conditions.push({ type: 'ilike', col: column, val: pattern }); return this;
  }
  in(column: string, values: QueryBuilder | unknown[]): QueryBuilder {
    if (Array.isArray(values)) {
      this.conditions.push({ type: 'in', col: column, val: values });
    } else {
      this.conditions.push({ type: 'in', col: column, subquery: values as QueryBuilder });
    }
    return this;
  }
  contains(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'contains', col: column, val: value }); return this;
  }
  containedBy(column: string, value: unknown): QueryBuilder {
    this.conditions.push({ type: 'containedBy', col: column, val: value }); return this;
  }
  insert(data: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder {
    this.operation = 'insert'; this.insertData = data; return this;
  }
  update(data: Record<string, unknown>): QueryBuilder {
    this.operation = 'update'; this.updateData = data; return this;
  }
  delete(): QueryBuilder { this.operation = 'delete'; return this; }
  single(): QueryBuilder { this.returnSingle = true; return this; }
  maybeSingle(): QueryBuilder { this.returnSingle = true; return this; }

  private extractJoins(): JoinDef[] {
    const joins: JoinDef[] = [];
    if (this.columns.includes(':')) {
      const pattern = /(\w+):(\w+)(?:!([\w_]+))?\(([^)]*)\)/g;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(this.columns)) !== null) {
        const alias = m[1];
        const refTable = m[2];
        const refCols = m[4];
        const fkColumn = alias + '_id';
        joins.push({ refTable, alias, fkColumn, refCols });
      }
    }
    return joins;
  }

  private buildJoinSql(joins: JoinDef[]): string {
    let sql = '';
    for (const j of joins) {
      sql += ` LEFT JOIN "${j.refTable}" ON "${this.table}"."${j.fkColumn}" = "${j.refTable}"."id"`;
    }
    return sql;
  }

  private buildSelectCols(joins: JoinDef[]): string[] {
    if (this.columns.trim() === '*') {
      return [`"${this.table}".*`];
    }

    const joinAliases = new Set(joins.map(j => j.alias));
    const refTables = new Map<string, JoinDef>();
    for (const j of joins) {
      refTables.set(j.refTable, j);
      refTables.set(j.alias, j);
    }

    const outCols: string[] = [];
    const parts = this.columns.split(',').map(s => s.trim()).filter(s => s.length > 0);

    for (const part of parts) {
      if (part.match(/^\w+:\w+(?:![\w_]+)?\(/)) {
        continue;
      }
      const parenMatch = part.match(/^(\w+)\(([^)]+)\)$/);
      if (parenMatch) {
        const tableName = parenMatch[1];
        const cols = parenMatch[2];
        const j = refTables.get(tableName);
        if (j) {
          outCols.push(`to_jsonb("${tableName}"."id") as "${tableName}"`);
        } else {
          const colList = cols.split(',').map(c => `"${tableName}"."${c.trim()}"`).join(', ');
          outCols.push(`jsonb_build_object(${cols.split(',').map(c => {
            const cn = c.trim();
            return `'${cn}', "${tableName}"."${cn}"`;
          }).join(', ')}) as "${tableName}"`);
        }
      } else if (part.includes('.')) {
        outCols.push(`"${part.replace('.', '"."')}"`);
      } else if (!joinAliases.has(part)) {
        outCols.push(`"${this.table}"."${part}"`);
      }
    }

    for (const j of joins) {
      if (j.refCols.trim() === '*') {
        outCols.push(`(SELECT row_to_json("${j.refTable}".*) FROM "${j.refTable}" WHERE "${j.refTable}"."id" = "${this.table}"."${j.fkColumn}") as "${j.alias}"`);
      } else {
        const colsSql = j.refCols.split(',').map(c => `"${j.refTable}"."${c.trim()}"`).join(', ');
        outCols.push(`(SELECT jsonb_build_object(${j.refCols.split(',').map(c => `'${c.trim()}', "${j.refTable}"."${c.trim()}"`).join(', ')}) FROM "${j.refTable}" WHERE "${j.refTable}"."id" = "${this.table}"."${j.fkColumn}") as "${j.alias}"`);
      }
    }

    return outCols.length > 0 ? outCols : [`"${this.table}".*`];
  }

  private buildWhereClause(params: unknown[], paramIdxRef: { idx: number }): string {
    const getParam = (v: unknown) => {
      params.push(v);
      return `$${paramIdxRef.idx++}`;
    };

    const whereParts: string[] = [];
    for (const cond of this.conditions) {
      switch (cond.type) {
        case 'eq':
          whereParts.push(`"${cond.col}" = ${getParam(cond.val)}`);
          break;
        case 'or':
          whereParts.push(`(${this.parseOrExpr(cond.expr!, getParam)})`);
          break;
        case 'gte':
          whereParts.push(`"${cond.col}" >= ${getParam(cond.val)}`);
          break;
        case 'gt':
          whereParts.push(`"${cond.col}" > ${getParam(cond.val)}`);
          break;
        case 'lt':
          whereParts.push(`"${cond.col}" < ${getParam(cond.val)}`);
          break;
        case 'lte':
          whereParts.push(`"${cond.col}" <= ${getParam(cond.val)}`);
          break;
        case 'like':
          whereParts.push(`"${cond.col}" LIKE ${getParam(cond.val)}`);
          break;
        case 'ilike':
          whereParts.push(`"${cond.col}" ILIKE ${getParam(cond.val)}`);
          break;
        case 'contains':
          whereParts.push(`"${cond.col}" @> ${getParam(cond.val)}`);
          break;
        case 'containedBy':
          whereParts.push(`"${cond.col}" <@ ${getParam(cond.val)}`);
          break;
        case 'in':
          if (cond.subquery) {
            const ids = await this.executeSubquery(cond.subquery);
            if (ids.length === 0) {
              whereParts.push('1 = 0');
            } else {
              const phs = ids.map(id => getParam(id)).join(', ');
              whereParts.push(`"${cond.col}" IN (${phs})`);
            }
          } else if (Array.isArray(cond.val)) {
            if (cond.val.length === 0) {
              whereParts.push('1 = 0');
            } else {
              const phs = (cond.val as unknown[]).map(v => getParam(v)).join(', ');
              whereParts.push(`"${cond.col}" IN (${phs})`);
            }
          }
          break;
      }
    }
    return whereParts.length > 0 ? ` WHERE ${whereParts.join(' AND ')}` : '';
  }

  private parseOrExpr(expr: string, getParam: (v: unknown) => string): string {
    const parts = expr.split(',');
    const sqlParts: string[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^(\w+)\.(\w+)\.(.+)$/);
      if (match) {
        const [, col, op, val] = match;
        if (op === 'ilike' || op === 'like') {
          sqlParts.push(`"${col}" ILIKE ${getParam(`%${val}%`)}`);
        } else if (op === 'eq') {
          sqlParts.push(`"${col}" = ${getParam(val)}`);
        } else if (op === 'gte') {
          sqlParts.push(`"${col}" >= ${getParam(val)}`);
        } else if (op === 'gt') {
          sqlParts.push(`"${col}" > ${getParam(val)}`);
        } else if (op === 'lt') {
          sqlParts.push(`"${col}" < ${getParam(val)}`);
        } else if (op === 'lte') {
          sqlParts.push(`"${col}" <= ${getParam(val)}`);
        }
      }
    }
    return sqlParts.join(' OR ');
  }

  private async executeSubquery(subquery: QueryBuilder): Promise<unknown[]> {
    const res = await (subquery as QueryBuilderImpl).executeRaw();
    if (res.error) return [];
    const rows = res.rows as Array<Record<string, unknown>>;
    if (rows.length === 0) return [];
    return rows.map(r => r['id']);
  }

  async executeRaw(): Promise<{ rows: unknown[]; rowCount: number | null; error: Error | null }> {
    try {
      const { sql, params } = await this.buildSqlWithParams();
      const client = getPool();
      const result: QueryResult = await client.query(sql, params);
      return { rows: result.rows, rowCount: result.rowCount, error: null };
    } catch (err) {
      return { rows: [], rowCount: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  private async buildSqlWithParams(): Promise<{ sql: string; params: unknown[] }> {
    const params: unknown[] = [];
    const paramIdxRef = { idx: 1 };

    const whereSql = await this.buildWhereClause(params, paramIdxRef);

    if (this.operation === 'select') {
      const joins = this.extractJoins();
      const cols = this.buildSelectCols(joins);
      let sql = `SELECT ${cols.join(', ')} FROM "${this.table}"`;
      sql += this.buildJoinSql(joins);
      sql += whereSql;

      if (this.orderClauses.length > 0) {
        sql += ' ORDER BY ' + this.orderClauses.map(o => `"${o.column}" ${o.ascending ? 'ASC' : 'DESC'}`).join(', ');
      }
      if (this.limitVal !== null) {
        params.push(this.limitVal);
        sql += ` LIMIT $${paramIdxRef.idx++}`;
      }
      if (this.offsetVal !== null) {
        params.push(this.offsetVal);
        sql += ` OFFSET $${paramIdxRef.idx++}`;
      }
      return { sql, params };
    }

    if (this.operation === 'insert') {
      const data = this.insertData!;
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return { sql: 'SELECT NULL', params: [] };

      const keys = Object.keys(rows[0]);
      const valueStrs: string[] = [];
      for (const row of rows) {
        const vals = keys.map(k => {
          params.push((row as Record<string, unknown>)[k] ?? null);
          return `$${paramIdxRef.idx++}`;
        });
        valueStrs.push(`(${vals.join(', ')})`);
      }
      let sql = `INSERT INTO "${this.table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES ${valueStrs.join(', ')} RETURNING *`;
      return { sql, params };
    }

    if (this.operation === 'update') {
      const data = this.updateData!;
      const setParts: string[] = [];
      for (const [k, v] of Object.entries(data)) {
        params.push(v);
        setParts.push(`"${k}" = $${paramIdxRef.idx++}`);
      }
      let sql = `UPDATE "${this.table}" SET ${setParts.join(', ')}` + whereSql + ` RETURNING *`;
      return { sql, params };
    }

    if (this.operation === 'delete') {
      let sql = `DELETE FROM "${this.table}"` + whereSql;
      return { sql, params };
    }

    return { sql: 'SELECT NULL', params: [] };
  }

  async execute(): Promise<{ data: unknown; error: Error | null; count?: number }> {
    try {
      const isHeadCount = this.opts.count === 'exact' && this.opts.head === true;

      if (isHeadCount) {
        const params: unknown[] = [];
        const paramIdxRef = { idx: 1 };
        const whereSql = await this.buildWhereClause(params, paramIdxRef);

        const countParams = [...params];
        let sql = `SELECT COUNT(*) as cnt FROM "${this.table}"`;
        sql += whereSql;
        const client = getPool();
        const result: QueryResult = await client.query(sql, countParams);
        const cnt = parseInt(result.rows[0].cnt, 10);
        return { data: null, error: null, count: isNaN(cnt) ? undefined : cnt };
      }

      const res = await this.executeRaw();
      if (res.error) {
        return { data: null, error: res.error };
      }

      const rows = res.rows as Array<Record<string, unknown>>;
      let data: unknown = rows;
      if (this.returnSingle) {
        data = rows.length > 0 ? rows[0] : null;
      }

      if (this.opts.count === 'exact') {
        return { data, error: null, count: res.rowCount ?? rows.length };
      }

      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  then(onfulfilled?: (value: { data: unknown; error: Error | null; count?: number }) => unknown, onrejected?: (reason: unknown) => unknown): Promise<unknown> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export interface SupabaseClientCompat {
  from: (table: string) => QueryBuilder;
  auth: {
    getSession: () => Promise<{ data: { session: null }; error: null }>;
    signOut: () => Promise<{ error: null }>;
    signInWithPassword: (args?: { email?: string; password?: string }) => Promise<{ error: null }>;
    signUp: (args?: { email?: string; password?: string }) => Promise<{ error: null }>;
    onAuthStateChange: () => { subscription: { unsubscribe: () => void } };
  };
}

function getSupabaseClient(_token?: string): SupabaseClientCompat {
  const client: SupabaseClientCompat = {
    from: (table: string) => new QueryBuilderImpl(table),
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword(_args?) {
        return { error: null };
      },
      async signUp(_args?) {
        return { error: null };
      },
      onAuthStateChange(_cb?) {
        return { subscription: { unsubscribe: () => {} } };
      },
    },
  };
  return client;
}

function getSupabaseCredentials(): { url: string; anonKey: string } {
  return {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/expert_qa',
    anonKey: 'local-dev',
  };
}

function getSupabaseServiceRoleKey(): string | undefined {
  return undefined;
}

export { getSupabaseClient, getSupabaseCredentials, getSupabaseServiceRoleKey };

export function closePool() {
  if (pool) {
    pool.end();
    pool = null;
  }
}