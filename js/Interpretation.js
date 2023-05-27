// Функция для чтения строки в поток токенов
function lexicalAnalizer(input_string) {
    // Массив для хранения лексем
    const tokens = [];

    // Индекс текущего символа
    let current = 0;

    // Регулярные выражения для сопоставления лексем
    const LETTER_REGEX = /[a-zA-Z]/;
    const NUMBER_REGEX = /[0-9]/;
    const WHITESPACE_REGEX = /\s/;
    const OPERATOR_REGEX = /[+\-*/()<>]=?/;

    // Функция для добавления лексемы в массив
    function addToken(type, value = null) {
        tokens.push({ type, value });
    }

    // Цикл для обработки символов во входной строке
    while (current < input_string.length) {
        let char = input_string[current];

        if (LETTER_REGEX.test(char)) {
            // Обработка переменных
            let variable = "";

            while (current < input_string.length && LETTER_REGEX.test(input_string[current])) {
                variable += input_string[current];
                current++;
            }

            addToken("VARIABLE", variable);
        } else if (NUMBER_REGEX.test(char)) {
            // Обработка чисел
            let number = "";

            while (current < input_string.length && NUMBER_REGEX.test(input_string[current])) {
                number += input_string[current];
                current++;
            }

            addToken("NUMBER", parseInt(number));
        } else if (WHITESPACE_REGEX.test(char)) {
            // Пропуск пробелов
            current++;
        } else if (OPERATOR_REGEX.test(char)) {
            // Обработка операторов
            addToken("OPERATOR", char);
            current++;
        } else {
            // Нераспознанный символ
            throw new Error("Нераспознанный символ: " + char);
        }
    }

    return tokens;
}

// Функция для чтения выражения и перевода её в дерево
function parseExpression(tokens) {
    let current = 0;

    function parseExpressionTokens() {
        let left = parseTerm();

        while (current < tokens.length && tokens[current].type === "OPERATOR" && "+-".includes(tokens[current].value)) {
            const operator = tokens[current].value;
            current++;
            const right = parseTerm();
            left = { type: "BinaryExpression", operator, left, right };
        }

        return left;
    }

    function parseTerm() {
        let left = parseFactor();

        while (current < tokens.length && tokens[current].type === "OPERATOR" && "*/".includes(tokens[current].value)) {
            const operator = tokens[current].value;
            current++;
            const right = parseFactor();
            left = { type: "BinaryExpression", operator, left, right };
        }

        return left;
    }

    function parseFactor() {
        if (current < tokens.length && tokens[current].type === "NUMBER") {
            const value = tokens[current].value;
            current++;
            return { type: "NumberLiteral", value };
        } else if (current < tokens.length && tokens[current].type === "VARIABLE") {
            const name = tokens[current].value;
            current++;
            return { type: "Variable", name };
        } else if (current < tokens.length && tokens[current].type === "OPERATOR" && tokens[current].value === "(") {
            current++;
            const expression = parseExpressionTokens();
            if (current >= tokens.length || tokens[current].type !== "OPERATOR" || tokens[current].value !== ")") {
                throw new Error("Ожидается закрывающая скобка ')'");
            }
            current++;
            return expression;
        } else {
            throw new Error("Неверный синтаксис");
        }
    }

    return parseExpressionTokens();
}

// Функция для получения использованных переменных в дереве
function getVariables(tree) {
    const variables = [];

    function traverse(node) {
        if (node.type === 'Variable') {
            variables.push(node.name);
        } else if (node.type === 'BinaryExpression') {
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

    blocks_stream.push(blocks_tree[0]);
    variable_layers.push([])

    while (blocks_stream.length > 0) {
        let current_last_block = blocks_stream[blocks_stream.length - 1];

        // Расстановка табов перед строкой кода
        for (let i = 0; i < blocks_stream.length - 1; i++)
        {
            result_program += "    ";
        }

        if (current_last_block.type === "Executor") {
            if (current_last_block.action === "assign") {
                // Перевод выражения в дерево
                let token_thread = lexicalAnalizer(current_last_block.expression);
                let expression_tree = parseExpression(token_thread);

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
                        alert("Переменная " + used_variables[variable_number] + " не инициализирована в данном участке программы");
                        return 0;
                    }
                }

                // Добавление строки в вывод
                result_program += current_last_block.variable + " = " + treeToExpression(expression_tree) + "\n";
                alert(result_program);
                blocks_stream.splice(0, 1);
            }
        }
        else if (current_last_block.type === "Container") {
            let current_condition_block = current_last_block.blocks[0];
            let current_body_block = current_last_block.blocks[1];

            // Перевод условия в дерево
            let token_thread = lexicalAnalizer(current_condition_block.expression);
            let expression_tree = parseExpression(token_thread);

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
                    alert("Переменная " + used_variables[variable_number] + " не инициализирована в данном участке программы");
                    return 0;
                }
            }

            if (current_body_block.action === "if") {
                current_condition_block += "if "
            }
            else if (current_body_block.action === "while") {

            }
        }
    }
}