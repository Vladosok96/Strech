// Функция для чтения строки в поток токенов
function lexicalAnalizer(input) {
    const tokens = [];
    let currentToken = "";
    let insideString = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (insideString) {
            currentToken += char;

            if (char === '"') {
                tokens.push({ type: "string", value: currentToken });
                currentToken = "";
                insideString = false;
            }
        } else if (/\s/.test(char)) {
            if (currentToken !== "") {
                tokens.push(getTokenType(currentToken));
                currentToken = "";
            }
        } else if (/[\+\-\*\/\(\)]/.test(char)) {
            if (currentToken !== "") {
                tokens.push(getTokenType(currentToken));
                currentToken = "";
            }
            tokens.push({ type: "operator", value: char });
        } else if (/[<>!=]=/.test(char)) {
            if (currentToken !== "") {
                tokens.push(getTokenType(currentToken));
                currentToken = "";
            }
            const nextChar = input[i + 1];
            if (nextChar === "=") {
                tokens.push({ type: "operator", value: char + "=" });
                i++;
            } else {
                tokens.push({ type: "operator", value: char });
            }
        } else if (char === '"') {
            insideString = true;
            currentToken += char;
        } else {
            currentToken += char;
        }
    }

    if (currentToken !== "") {
        tokens.push(getTokenType(currentToken));
    }

    return tokens;
}

function getTokenType(token) {
    if (/[0-9]+/.test(token)) {
        return { type: "number", value: parseFloat(token) };
    } else if (/\b(true|false)\b/.test(token)) {
        return { type: "boolean", value: token === "true" };
    } else if (/[a-zA-Z_][a-zA-Z0-9_]*/.test(token)) {
        return { type: "variable", value: token };
    } else if (["+", "-", "*", "/"].includes(token)) {
        return { type: "operator", value: token };
    } else if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(token)) {
        return { type: "comparison", value: token };
    } else if (token.startsWith('"') && token.endsWith('"')) {
        return { type: "string", value: token.slice(1, -1) };
    } else {
        throw new Error(`Invalid token: ${token}`);
    }
}

// Функция для чтения выражения и перевода её в дерево
function parseTokens(tokens) {
    let currentTokenIndex = 0;

    function parseExpression() {
        let left = parseTerm();

        while (
            currentTokenIndex < tokens.length &&
            (tokens[currentTokenIndex].type === "operator" ||
                tokens[currentTokenIndex].type === "comparison")
            ) {
            const operatorToken = tokens[currentTokenIndex];
            currentTokenIndex++;

            const right = parseTerm();

            left = {
                type: "binaryExpression",
                operator: operatorToken.value,
                left,
                right,
            };
        }

        return left;
    }

    function parseTerm() {
        const token = tokens[currentTokenIndex];
        currentTokenIndex++;

        if (token.type === "number" || token.type === "boolean" || token.type === "variable" || token.type === "string") {
            return token;
        } else if (token.type === "operator" && token.value === "-") {
            const expression = parseTerm();
            return {
                type: "unaryExpression",
                operator: "-",
                argument: expression,
            };
        } else if (token.type === "operator" && token.value === "(") {
            const expression = parseExpression();
            if (tokens[currentTokenIndex].type !== "operator" || tokens[currentTokenIndex].value !== ")") {
                throw new Error("Missing closing parenthesis ')'");
            }
            currentTokenIndex++;
            return expression;
        } else {
            throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
        }
    }

    return parseExpression();
}

// Функция для получения использованных переменных в дереве
function getVariables(tree) {
    const variables = [];

    function traverse(node) {
        if (node.type === 'variable') {
            variables.push(node.value);
        } else if (node.type === 'binaryExpression') {
            traverse(node.left);
            traverse(node.right);
        }
        // Дополнительная обработка других типов узлов, если необходимо
    }

    traverse(tree);
    return variables;
}

// Функция для перевода дерева в арифметическое выражение
function treeToExpression(tree) {
    if (tree.type === 'BinaryExpression') {
        const left = treeToExpression(tree.left);
        const right = treeToExpression(tree.right);
        return `(${left} ${tree.operator} ${right})`;
    } else if (tree.type === 'Variable') {
        return tree.name;
    } else if (tree.type === 'NumberLiteral') {
        return tree.value.toString();
    } else {
        throw new Error('Неподдерживаемый тип узла');
    }
}

// Функция выполняющая обязанности интерпретатора
function interpretation() {
    let result_program = "";
    let blocks_tree = screen_blocks;
    let blocks_stream = [];
    let variable_layers = [];

    blocks_stream.push([...blocks_tree]);
    variable_layers.push([])

    while (blocks_stream.length > 0) {
        let current_last_block = blocks_stream[blocks_stream.length - 1][0];

        // Расстановка табов перед строкой кода
        for (let i = 0; i < variable_layers.length - 1; i++)
        {
            result_program += "    ";
        }

        if (current_last_block.type === "Executor") {
            if (current_last_block.action === "assign") {
                // Перевод выражения в дерево
                let token_thread = lexicalAnalizer(current_last_block.expression);
                let expression_tree = parseTokens(token_thread);

                // Проверка на инициализацию переменной
                let check_variable_initialized = false;
                for (let i = 0; i < variable_layers.length; i++) {
                    for (let j = 0; j < variable_layers[i].length; j++) {
                        if (variable_layers[i][j] === current_last_block.variable) {
                            check_variable_initialized = true;
                        }
                    }
                }

                // Добавление отсутствующей переменной
                if (!check_variable_initialized) {
                    variable_layers[variable_layers.length - 1].push(current_last_block.variable);
                }

                // Проверка на использование неинициализированных переменных в массиве
                let used_variables = getVariables(expression_tree);
                for (let variable_number = 0; variable_number < used_variables.length; variable_number++) {
                    let check_variable_initialized = false;
                    for (let i = 0; i < variable_layers.length; i++) {
                        for (let j = 0; j < variable_layers[i].length; j++) {
                            if (variable_layers[i][j] === used_variables[variable_number]) {
                                check_variable_initialized = true;
                            }
                        }
                    }
                    if (!check_variable_initialized) {
                        alert("Переменная '" + used_variables[variable_number] + "' не инициализирована в данном участке программы");
                        return 0;
                    }
                }

                // Добавление строки в вывод
                result_program += current_last_block.variable + " = " + current_last_block.expression + "\n";
            }
            else if (current_last_block.action === "increment") {
                // Проверка на инициализацию переменной
                let check_variable_initialized = false;
                for (let i = 0; i < variable_layers.length; i++) {
                    for (let j = 0; j < variable_layers[i].length; j++) {
                        if (variable_layers[i][j] === current_last_block.variable) {
                            check_variable_initialized = true;
                        }
                    }
                }
                if (!check_variable_initialized) {
                    alert("Переменная '" + current_last_block.variable + "' не инициализирована в данном участке программы");
                    return 0;
                }

                // Добавление строки в вывод
                result_program += current_last_block.variable + " += 1\n";
            }
            else if (current_last_block.action === "decrement") {
                // Проверка на инициализацию переменной
                let check_variable_initialized = false;
                for (let i = 0; i < variable_layers.length; i++) {
                    for (let j = 0; j < variable_layers[i].length; j++) {
                        if (variable_layers[i][j] === current_last_block.variable) {
                            check_variable_initialized = true;
                        }
                    }
                }
                if (!check_variable_initialized) {
                    alert("Переменная '" + current_last_block.variable + "' не инициализирована в данном участке программы");
                    return 0;
                }

                // Добавление строки в вывод
                result_program += current_last_block.variable + " -= 1\n";
            }
            else if (current_last_block.action === "print") {
                // Перевод выражения в дерево
                let token_thread = lexicalAnalizer(current_last_block.expression);
                let expression_tree = parseTokens(token_thread);

                // Проверка на использование неинициализированных переменных в массиве
                let used_variables = getVariables(expression_tree);
                for (let variable_number = 0; variable_number < used_variables.length; variable_number++) {
                    let check_variable_initialized = false;
                    for (let i = 0; i < variable_layers.length; i++) {
                        for (let j = 0; j < variable_layers[i].length; j++) {
                            if (variable_layers[i][j] === used_variables[variable_number]) {
                                check_variable_initialized = true;
                            }
                        }
                    }
                    if (!check_variable_initialized) {
                        alert("Переменная '" + used_variables[variable_number] + "' не инициализирована в данном участке программы");
                        return 0;
                    }
                }

                // Добавление строки в вывод
                result_program += "print(" + current_last_block.expression + ")\n";
            }
            else if (current_last_block.action === "scan") {
                // Проверка на инициализацию переменной
                let check_variable_initialized = false;
                for (let i = 0; i < variable_layers.length; i++) {
                    for (let j = 0; j < variable_layers[i].length; j++) {
                        if (variable_layers[i][j] === current_last_block.variable) {
                            check_variable_initialized = true;
                        }
                    }
                }
                if (!check_variable_initialized) {
                    alert("Переменная '" + current_last_block.variable + "' не инициализирована в данном участке программы");
                    return 0;
                }

                // Добавление строки в вывод
                result_program += current_last_block.variable + " = input()\n";
            }
            blocks_stream[blocks_stream.length - 1].shift();
        }
        else if (current_last_block.type === "Container") {
            let current_condition_block = current_last_block.blocks[0];
            let current_body_block = current_last_block.blocks[1];

            // Перевод условия в дерево
            let token_thread = lexicalAnalizer(current_condition_block.expression);
            let expression_tree = parseTokens(token_thread);

            // Проверка на использование неинициализированных переменных в массиве
            let used_variables = getVariables(expression_tree);
            for (let variable_number = 0; variable_number < used_variables.length; variable_number++) {
                let check_variable_initialized = false;
                for (let i = 0; i < variable_layers.length; i++) {
                    for (let j = 0; j < variable_layers[i].length; j++) {
                        if (variable_layers[i][j] === used_variables[variable_number]) {
                            check_variable_initialized = true;
                        }
                    }
                }
                if (!check_variable_initialized) {
                    alert("Переменная '" + used_variables[variable_number] + "' не инициализирована в данном участке программы");
                    return 0;
                }
            }

            // Добавление в вывод строки с условием
            if (current_body_block.action === "if") {
                result_program += "if " + current_condition_block.expression + ":\n";
            }
            else if (current_body_block.action === "while") {
                result_program += "while " + current_condition_block.expression + ":\n";
            }

            let tmp_blocks_stream = [...current_body_block.blocks];
            blocks_stream[blocks_stream.length - 1].shift();
            blocks_stream.push(tmp_blocks_stream);
            variable_layers.push([]);
            console.log("test");
        }
        while (blocks_stream[blocks_stream.length - 1].length === 0) {
            variable_layers.pop();
            blocks_stream.pop();
            if (blocks_stream.length === 0) {
                let output_container = document.getElementById("output-container");
                output_container.innerHTML = result_program;
                return result_program;
            }
        }
    }
}