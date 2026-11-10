export type TokenFormulaNode =
    | {
        type: 'value';
        source: 'constant' | 'setting' | 'runtime';
        key?: string;
        value?: number;
        fallback?: number;
        label?: string;
    }
    | {
        type: 'lookup';
        source: 'setting' | 'runtime';
        key: string;
        table: Record<string, number>;
        fallback?: number;
        label?: string;
    }
    | {
        type: 'operation';
        operator: 'add' | 'subtract' | 'multiply' | 'divide' | FormulaFunction;
        operands: TokenFormulaNode[];
        label?: string;
    };

export type FormulaOperator = '+' | '-' | '*' | '/';

/** توابع فرمول: max(a, b, …) بزرگ‌ترین و min(a, b, …) کوچک‌ترین آرگومان */
export type FormulaFunction = 'max' | 'min';

export function isFormulaFunction(value: unknown): value is FormulaFunction {
    return value === 'max' || value === 'min';
}

export type FormulaEditorToken =
    | {
        type: 'operand';
        node: Exclude<TokenFormulaNode, { type: 'operation' }>;
        label: string;
    }
    | { type: 'operator'; value: FormulaOperator }
    | { type: 'paren'; value: '(' | ')' }
    | { type: 'function'; value: FormulaFunction }
    | { type: 'comma' };

export interface FormulaReference {
    ref: string;
    label: string;
    group: 'runtime-input' | 'runtime-output' | 'settings' | 'synthetic' | 'lookups' | 'operands';
    node: Exclude<TokenFormulaNode, { type: 'operation' }>;
}

export interface FormulaLookupDefinition {
    id: string;
    label: string;
    source: 'setting' | 'runtime';
    key: string;
    table: Record<string, number>;
    fallback: number;
}

export interface FormulaParseResult {
    tokens: FormulaEditorToken[];
    expression?: TokenFormulaNode;
    error?: string;
}

const PRECEDENCE: Record<FormulaOperator, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
};

function cloneOperand(
    node: Exclude<TokenFormulaNode, { type: 'operation' }>,
): Exclude<TokenFormulaNode, { type: 'operation' }> {
    return node.type === 'lookup'
        ? { ...node, table: { ...node.table } }
        : { ...node };
}

export function formulaTokensToNode(tokens: FormulaEditorToken[]): {
    expression?: TokenFormulaNode;
    error?: string;
} {
    if (!tokens.length) return { error: 'Formula is empty.' };
    const output: TokenFormulaNode[] = [];
    const operators: Array<FormulaOperator | '(' | FormulaFunction> = [];
    // One entry per open "(": the argument count of a max()/min() call, or null for a plain group.
    const groups: Array<number | null> = [];
    const applyOperator = () => {
        const operator = operators.pop();
        const right = output.pop();
        const left = output.pop();
        if (!operator || operator === '(' || isFormulaFunction(operator) || !left || !right) {
            throw new Error('An operator is missing an operand.');
        }
        output.push({
            type: 'operation',
            operator: operator === '+'
                ? 'add'
                : operator === '-'
                    ? 'subtract'
                    : operator === '*'
                        ? 'multiply'
                        : 'divide',
            operands: [left, right],
        });
    };

    try {
        let expectsOperand = true;
        let pendingFunction = false;
        for (const token of tokens) {
            if (pendingFunction && !(token.type === 'paren' && token.value === '(')) {
                throw new Error('A function name must be followed by "(".');
            }
            if (token.type === 'operand') {
                if (!expectsOperand) throw new Error('Add an operator between values.');
                output.push(token.node);
                expectsOperand = false;
                continue;
            }
            if (token.type === 'function') {
                if (!expectsOperand) throw new Error('Add an operator before the function.');
                operators.push(token.value);
                pendingFunction = true;
                continue;
            }
            if (token.type === 'comma') {
                if (expectsOperand) throw new Error('A function argument is missing.');
                while (operators.length && operators[operators.length - 1] !== '(') applyOperator();
                const open = groups.length - 1;
                if (open < 0 || groups[open] === null) {
                    throw new Error('Commas are only allowed between max(…) / min(…) arguments.');
                }
                groups[open] = Number(groups[open]) + 1;
                expectsOperand = true;
                continue;
            }
            if (token.type === 'paren') {
                if (token.value === '(') {
                    if (!expectsOperand) throw new Error('Add an operator before the parenthesis.');
                    operators.push('(');
                    groups.push(pendingFunction ? 1 : null);
                    pendingFunction = false;
                } else {
                    if (expectsOperand) throw new Error('The parenthesis has no value.');
                    while (operators.length && operators[operators.length - 1] !== '(') applyOperator();
                    if (operators.pop() !== '(') throw new Error('Parentheses do not match.');
                    const argumentCount = groups.pop();
                    if (argumentCount != null) {
                        const fn = operators.pop();
                        if (!isFormulaFunction(fn) || output.length < argumentCount) {
                            throw new Error('A function argument is missing.');
                        }
                        output.push({
                            type: 'operation',
                            operator: fn,
                            operands: output.splice(output.length - argumentCount, argumentCount),
                        });
                    }
                    expectsOperand = false;
                }
                continue;
            }
            if (expectsOperand) throw new Error('An operator is missing its left value.');
            while (
                operators.length
                && operators[operators.length - 1] !== '('
                && PRECEDENCE[operators[operators.length - 1] as FormulaOperator]
                    >= PRECEDENCE[token.value]
            ) applyOperator();
            operators.push(token.value);
            expectsOperand = true;
        }
        if (pendingFunction) throw new Error('A function name must be followed by "(".');
        if (expectsOperand) throw new Error('Formula cannot end with an operator.');
        while (operators.length) {
            if (operators[operators.length - 1] === '(') throw new Error('Parentheses do not match.');
            applyOperator();
        }
        if (output.length !== 1) throw new Error('Formula is incomplete.');
        return { expression: output[0] };
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'Formula is invalid.' };
    }
}

export function parseFormulaText(
    text: string,
    references: FormulaReference[],
): FormulaParseResult {
    const tokens: FormulaEditorToken[] = [];
    const referenceMap = new Map(references.map((item) => [item.ref, item]));
    const referenceNames = Array.from(referenceMap.keys()).sort((left, right) => right.length - left.length);
    let index = 0;

    while (index < text.length) {
        const character = text[index];
        if (/\s/.test(character)) {
            index += 1;
            continue;
        }
        const previousToken = tokens[tokens.length - 1];
        const expectsOperand = !previousToken
            || previousToken.type === 'operator'
            || previousToken.type === 'comma'
            || (previousToken.type === 'paren' && previousToken.value === '(');
        if ((character === '-' || character === '−' || character === '+') && expectsOperand && /[0-9.]/.test(text[index + 1] || '')) {
            const rawCandidate = text.slice(index).match(/^[+−-]?[0-9.]+/)?.[0] || '';
            const candidate = rawCandidate.replace('−', '-');
            if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(candidate)) {
                return { tokens, error: `Malformed number "${candidate}".` };
            }
            const value = Number(candidate);
            if (!Number.isFinite(value)) return { tokens, error: `Number "${candidate}" is not finite.` };
            tokens.push({
                type: 'operand',
                label: candidate,
                node: { type: 'value', source: 'constant', value },
            });
            index += rawCandidate.length;
            continue;
        }
        if ('+-*/×÷−'.includes(character)) {
            const operator = character === '×'
                ? '*'
                : character === '÷'
                    ? '/'
                    : character === '−'
                        ? '-'
                        : character as FormulaOperator;
            tokens.push({ type: 'operator', value: operator });
            index += 1;
            continue;
        }
        if (character === '(' || character === ')') {
            tokens.push({ type: 'paren', value: character });
            index += 1;
            continue;
        }
        if (character === ',' || character === '،') {
            tokens.push({ type: 'comma' });
            index += 1;
            continue;
        }
        if (/[A-Za-z]/.test(character)) {
            const name = text.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0] || character;
            const fn = name.toLowerCase();
            if (!isFormulaFunction(fn)) {
                return { tokens, error: `Unknown function "${name}" — only max(…) and min(…) are supported.` };
            }
            tokens.push({ type: 'function', value: fn });
            index += name.length;
            continue;
        }
        if (character === '@') {
            const ref = referenceNames.find((name) => {
                if (!text.startsWith(name, index)) return false;
                return !/[A-Za-z0-9_.]/.test(text[index + name.length] || '');
            });
            if (!ref) {
                const candidate = text.slice(index).match(/^@[A-Za-z0-9_.-]*/)?.[0] || '@';
                return {
                    tokens,
                    error: candidate === '@'
                        ? `Expected a variable after @ at character ${index + 1}.`
                        : `Unknown variable "${candidate}".`,
                };
            }
            const reference = referenceMap.get(ref)!;
            tokens.push({
                type: 'operand',
                label: ref,
                node: cloneOperand(reference.node),
            });
            index += ref.length;
            continue;
        }
        if (/[0-9.]/.test(character)) {
            const candidate = text.slice(index).match(/^[0-9.]+/)?.[0] || '';
            if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(candidate)) {
                return { tokens, error: `Malformed number "${candidate}".` };
            }
            const value = Number(candidate);
            if (!Number.isFinite(value)) return { tokens, error: `Number "${candidate}" is not finite.` };
            tokens.push({
                type: 'operand',
                label: candidate,
                node: { type: 'value', source: 'constant', value },
            });
            index += candidate.length;
            continue;
        }
        return { tokens, error: `Unsupported character "${character}" at character ${index + 1}.` };
    }

    const parsed = formulaTokensToNode(tokens);
    return { tokens, ...parsed };
}

function stableHash(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function aliasLabel(node: Extract<TokenFormulaNode, { type: 'lookup' }>): string {
    const base = (node.label || `${node.key} lookup`)
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map((part, index) => index ? part[0]?.toUpperCase() + part.slice(1) : part.toLowerCase())
        .join('') || 'lookup';
    const signature = JSON.stringify({
        source: node.source,
        key: node.key,
        table: Object.entries(node.table).sort(([left], [right]) => left.localeCompare(right)),
        fallback: node.fallback,
    });
    return `@operand.${base}_${stableHash(signature)}`;
}

export function serializeFormulaExpression(node: TokenFormulaNode): {
    text: string;
    references: FormulaReference[];
} {
    const references = new Map<string, FormulaReference>();
    const visit = (current: TokenFormulaNode, isRoot: boolean): string => {
        if (current.type === 'value') {
            if (current.source === 'constant') return String(current.value ?? 0);
            const ref = `@${current.source}.${current.key || ''}`;
            references.set(ref, {
                ref,
                label: current.label || current.key || ref,
                group: current.source === 'setting' ? 'settings' : 'synthetic',
                node: cloneOperand(current),
            });
            return ref;
        }
        if (current.type === 'lookup') {
            const ref = aliasLabel(current);
            references.set(ref, {
                ref,
                label: current.label || `${current.key} lookup`,
                group: 'operands',
                node: cloneOperand(current),
            });
            return ref;
        }
        if (isFormulaFunction(current.operator)) {
            const args = current.operands.map((operand) => visit(operand, true)).join(', ');
            return `${current.operator}(${args})`;
        }
        const operator: FormulaOperator = current.operator === 'add'
            ? '+'
            : current.operator === 'subtract'
                ? '-'
                : current.operator === 'multiply'
                    ? '*'
                    : '/';
        const body = current.operands.map((operand) => visit(operand, false)).join(` ${operator} `);
        return isRoot ? body : `(${body})`;
    };
    return { text: visit(node, true), references: Array.from(references.values()) };
}

export function formulaNodeToTokens(
    node: TokenFormulaNode,
    isRoot = true,
): FormulaEditorToken[] {
    if (node.type !== 'operation') {
        return [{
            type: 'operand',
            node: cloneOperand(node),
            label: node.label || node.key || (node.type === 'value' ? String(node.value ?? 0) : 'Lookup'),
        }];
    }
    if (isFormulaFunction(node.operator)) {
        return [
            { type: 'function', value: node.operator },
            { type: 'paren', value: '(' },
            ...node.operands.flatMap((operand, index) => [
                ...(index ? [{ type: 'comma' } as FormulaEditorToken] : []),
                ...formulaNodeToTokens(operand),
            ]),
            { type: 'paren', value: ')' },
        ];
    }
    const operator: FormulaOperator = node.operator === 'add'
        ? '+'
        : node.operator === 'subtract'
            ? '-'
            : node.operator === 'multiply'
                ? '*'
                : '/';
    const body = node.operands.flatMap((operand, index) => [
        ...(index ? [{ type: 'operator', value: operator } as FormulaEditorToken] : []),
        ...formulaNodeToTokens(operand, false),
    ]);
    return isRoot
        ? body
        : [
            { type: 'paren', value: '(' },
            ...body,
            { type: 'paren', value: ')' },
        ];
}
