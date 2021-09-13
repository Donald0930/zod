// import { PseudoPromise } from "../PseudoPromise";
import { defaultErrorMap, IssueData, ZodErrorMap, ZodIssue } from "../ZodError";
import { util } from "./util";

export const ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set",
]);

export type ZodParsedType = keyof typeof ZodParsedType;

export const getParsedType = (data: any): ZodParsedType => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "object":
      if (Array.isArray(data)) return ZodParsedType.array;
      if (data === null) return ZodParsedType.null;
      if (
        data.then &&
        typeof data.then === "function" &&
        data.catch &&
        typeof data.catch === "function"
      ) {
        return ZodParsedType.promise;
      }
      if (data instanceof Map) {
        return ZodParsedType.map;
      }
      if (data instanceof Set) {
        return ZodParsedType.set;
      }
      if (data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

export const makeIssue = (
  data: any,
  path: (string | number)[],
  errorMap: ZodErrorMap,
  errorData: IssueData
): ZodIssue => {
  const fullPath = [...path, ...(errorData.path || [])];
  const errorArg = {
    ...errorData,
    path: fullPath,
  };

  const defaultError = defaultErrorMap(errorArg, {
    data: data,
    defaultError: `Invalid input`,
  });
  return {
    ...errorData,
    path: fullPath,
    message:
      errorData.message ||
      errorMap(errorArg, {
        data: data,
        defaultError: defaultError.message,
      }).message,
  };
};

export type ParseParams = {
  // data: any;
  path: (string | number)[];
  errorMap: ZodErrorMap;
  async: boolean;
};

export type ParseParamsNoData = Omit<ParseParams, "data">;

export type ParsePathComponent = string | number;

export type ParsePath = null | {
  readonly component: ParsePathComponent;
  readonly parent: ParsePath;
  readonly count: number;
};

export const EMPTY_PATH: ParsePath = null;

export const pathToArray = (path: ParsePath): ParsePathComponent[] => {
  if (path === null) return [];
  const arr: ParsePathComponent[] = new Array(path.count);
  while (path !== null) {
    arr[path.count - 1] = path.component;
    path = path.parent;
  }
  return arr;
};

export const pathFromArray = (arr: ParsePathComponent[]): ParsePath => {
  let path: ParsePath = null;
  for (let i = 0; i < arr.length; i++) {
    path = { parent: path, component: arr[i], count: i + 1 };
  }
  return path;
};

export type ParseContextParameters = {
  errorMap: ZodErrorMap;
  async: boolean;
};

interface ParseContextDef {
  readonly path: ParsePath;
  readonly issues: ZodIssue[];
  readonly errorMap: ZodErrorMap;
  readonly async: boolean;
}

export class ParseContext {
  // public readonly path: ParsePath;
  // public readonly issues: ZodIssue[];
  // public readonly errorMap: ZodErrorMap;
  public readonly def: ParseContextDef;

  constructor(def: ParseContextDef) {
    this.def = def;
  }
  get path() {
    return this.def.path;
  }
  get issues() {
    return this.def.issues;
  }
  get errorMap() {
    return this.def.errorMap;
  }
  get async() {
    return this.def.async;
  }

  stepInto(component: ParsePathComponent): ParseContext {
    return new ParseContext({
      ...this.def,
      path:
        this.path === null
          ? { parent: null, count: 1, component }
          : { parent: this.path, count: this.path.count + 1, component },
    });
  }

  addIssue(data: any, errorData: IssueData): void {
    const issue = makeIssue(
      data,
      pathToArray(this.path),
      this.errorMap,
      errorData
    );
    this.issues.push(issue);
  }
}

export type INVALID = { valid: false };
export const INVALID: INVALID = Object.freeze({ valid: false });

export type OK<T> = { valid: true; value: T };
export const OK = <T>(value: T): OK<T> => ({ valid: true, value });

// export type ASYNC<T> = Promise<T>;
// export const ASYNC = <T>(promise: Promise<T>): ASYNC<T> =>
//   new PseudoPromise<T>(promise);
export const ASYNC = <T>(promise: Promise<T>) => promise;

export type SyncParseReturnType<T> = OK<T> | INVALID;
export type AsyncParseReturnType<T> = Promise<SyncParseReturnType<T>>;
export type ParseReturnType<T> =
  | SyncParseReturnType<T>
  | AsyncParseReturnType<T>;

export const isInvalid = (x: ParseReturnType<any>): x is INVALID =>
  (x as any).valid === false;
export const isOk = <T>(x: ParseReturnType<T>): x is OK<T> =>
  (x as any).valid === true;
export const isAsync = <T>(
  x: ParseReturnType<T>
): x is AsyncParseReturnType<T> => x instanceof Promise;
