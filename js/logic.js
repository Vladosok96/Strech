function setFillColorr(color) {
  ctx.fillStyle = `rgb(
          ${color[0]},
          ${color[1]},
          ${color[2]})`;
}


// Переменые с блоками
var block_id_counter = 0;
var screen_blocks = [];
var movable_block = null;
var mouse_offest = {x: 0, y: 0}

var drag_state = 0;
var drag_start = {mouseX: 0, mouseY: 0}

var selected_block_id = -1;
var hover_block_id = -1;
var active_block_id = -1;
var active_block;

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

// Фунция выполняющая обязанности интерпретатора
function interpretation() {
  let result_program = "";
  let blocks_tree = screen_blocks;
  let blocks_stream = [];
  let variable_layers = [];

  blocks_stream.push(blocks_tree[0]);
  variable_layers.push([])

  while (blocks_stream.length > 0) {
    let current_last_block = blocks_stream[blocks_stream.length - 1];
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


      }
    }
  }
}

// Найти индекс блока по его id
function indexById(Array, id) {
  for (let i = 0; i < Array.length; i++) {
    if (Array[i].id == id) return i;
  }
  return -1;
}

// Функция для вытаскивания блока из массива по id
function pullBlockById(blocks, id) {
  const index = indexById(blocks, id);
  if (index !== -1) {
    let block = blocks[index];
    blocks.splice(index, 1);
    return block;
  }
  else {
    let block = null;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].isContainer) {
        let tmp_block = pullBlockById(blocks[i].blocks, id);
        if (tmp_block != null) {
          block = tmp_block;
        }
      }
    }
    return block;
  }
}

// Функция для добавления блока в другой блок по id
function pushBlockById(id, block) {
  function iter(a) {
    if (a.id === id) {
      a.addBlock(block);
      return;
    }
    return Array.isArray(a.blocks) && a.blocks.some(iter);
  }

  screen_blocks.some(iter);
}

function addExecutorBlock() {
  screen_blocks.push(new ExecutorBlock(block_id_counter, 100, 100, "Блок-исполнитель"));
  block_id_counter++;
  draw_blocks();
}

function addContainerBlock() {
  let parent_block = new ParentBlock(block_id_counter, 100, 100, "Блок-контейнер");
  parent_block.blocks.push(new ConditionBlock(block_id_counter + 1, 100, 100, "Условие", block_id_counter))
  parent_block.blocks.push(new BodyBlock(block_id_counter + 2, 100, 100, "Тело", block_id_counter))
  screen_blocks.push(parent_block);
  block_id_counter += 3;
  draw_blocks();
}

function makeBlockActive(blocks, id) {
  const index = indexById(blocks, id);
  if (index !== -1) {
    blocks[index].isHover = true;
    return blocks[index];
  }
  else {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].isContainer) {
        let tmp_block = makeBlockActive(blocks[i].blocks, id);
        if (tmp_block != null) {
          return tmp_block;
        }
      }
    }
  }
}

function applyBlockById(blocks, id) {
  const index = indexById(blocks, id);
  if (index !== -1) {
    switch(blocks[index].type) {
      case "Executor":
        let executor_action = document.getElementById("block-executor-action").value;
        let executor_name = document.getElementById("block-executor-name").value;
        let executor_expression = document.getElementById("block-executor-expression").value;

        blocks[index].action = executor_action;
        blocks[index].variable = executor_name;
        blocks[index].expression = executor_expression;
        break;
      case "Body":
        let body_action = document.getElementById("block-body-action").value;
        blocks[index].action = body_action;
        break;
      case "Condition":
        let condition_expression = document.getElementById("block-condition-expression").value;
        blocks[index].condition  =condition_expression;
        break;
    }
    return blocks[index];
  }
  else {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].isContainer) {
        let tmp_block = applyBlockById(blocks[i].blocks, id);
        if (tmp_block != null) {
          return tmp_block;
        }
      }
    }
  }
}

// Функция для вытаскивания блока из массива по id
function removeBlockById(blocks, id, parent_id) {
  const index = indexById(blocks, id);
  if (index !== -1) {
    if (blocks[index].type == "Condition" || blocks[index].type == "Body") return removeBlockById(screen_blocks, parent_id, 0);
    let block = blocks[index];
    blocks.splice(index, 1);
  }
  else {
    let block = null;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].isContainer) {
        let tmp_block = removeBlockById(blocks[i].blocks, id, blocks[i].id);
        if (tmp_block != null) {
          block = tmp_block;
        }
      }
    }
  }
}

function makeBlocksInactive(blocks) {
  let block = null;
  for (let i = 0; i < blocks.length; i++) {
    blocks[i].isHover = false;
    if (blocks[i].isContainer) {
      let tmp_block = makeBlocksInactive(blocks[i].blocks);
      if (tmp_block != null) {
        block = tmp_block;
      }
    }
  }
}

// Функция для отрисовки всех блоков на экране
function draw_blocks() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < screen_blocks.length; i++) {
    if (screen_blocks[i].isContainer) {
      screen_blocks[i].moveChildrens();
    }
    screen_blocks[i].draw();
  }
  if (movable_block != null) {
    if (movable_block.isContainer) {
      movable_block.moveChildrens();
    }
    movable_block.draw();
  }
}

draw_blocks();

// Обработчик нажатия кнопки мыши
canvas.addEventListener('mousedown', async function(event) {
  const x = event.pageX - canvas.offsetLeft;
  const y = event.pageY - canvas.offsetTop;

  // Здесь должен быть код для обработки нажатия мыши на координатах (x, y)

  switch(event.button) {
    case 0:
      drag_state = 0;
      drag_start = {mouseX: x, mouseY: y}


      hover_block_id = -1;
      for (let i = 0; i < screen_blocks.length; i++) {
        let mouse_above = screen_blocks[i].isMouseAbove(x, y, false);
        if (mouse_above != -1) {
          hover_block_id = mouse_above.id;
          mouse_offest = mouse_above.offset;
        }
      }
      break;
    case 1:
      break;
    case 2:
      makeBlocksInactive(screen_blocks);
      if (active_block_id != -1) {
        active_block_id = -1;
      }

      for (let i = 0; i < screen_blocks.length; i++) {
        let mouse_above = screen_blocks[i].isMouseAbove(x, y, true);
        if (mouse_above != -1) {
          active_block_id = mouse_above.id;
          mouse_offest = mouse_above.offset;
        }
      }

      active_block = makeBlockActive(screen_blocks, active_block_id);
      if (active_block_id != -1) {
        document.querySelector(".block-editor .block-editor-container").removeAttribute("hidden");
        document.querySelector(".block-editor .column-title").innerHTML = active_block.name;

        document.querySelector("#label-container-action").setAttribute("hidden", "");
        document.querySelector("#label-executor-action").setAttribute("hidden", "");
        document.querySelector("#label-body-action").setAttribute("hidden", "");
        document.querySelector("#label-condition-action").setAttribute("hidden", "");

        switch(active_block.type) {
          case "Container":
            document.querySelector("#label-container-action").removeAttribute("hidden");
            break;

          case "Executor":
            document.querySelector("#label-executor-action").removeAttribute("hidden");
            break;

          case "Assign":
            document.querySelector("#label-assign-action").removeAttribute("hidden");
            break;

          case "Body":
            document.querySelector("#label-body-action").removeAttribute("hidden");
            break;

          case "Condition":
            document.querySelector("#label-condition-action").removeAttribute("hidden");
            break;
        }
      }
      else {
        document.querySelector(".block-editor .block-editor-container").setAttribute("hidden", "");
      }

      break;
  }
  draw_blocks();
});

// Обработчик отпускания кнопки мыши
canvas.addEventListener('mouseup', function(event) {
  const x = event.pageX - canvas.offsetLeft;
  const y = event.pageY - canvas.offsetTop;

  // Здесь должен быть код для обработки отпускания кнопки мыши на координатах (x, y)

  switch(event.button) {
    case 0:
      hover_block_id = -1;

      if (movable_block != null) {
        if (selected_block_id == -1) {
          screen_blocks.push(movable_block);
        }
        else {
          pushBlockById(selected_block_id, movable_block);
          selected_block_id = -1;
        }
        movable_block = null;
        draw_blocks();
      }
      break;
    case 1:
      break;
    case 2:
      break;
  }
});

// Обработчик движения мыши
canvas.addEventListener('mousemove', function(event) {
  const x = event.pageX - canvas.offsetLeft;
  const y = event.pageY - canvas.offsetTop;


  // Здесь должен быть код для обработки движения мыши на координатах (x, y)
  switch(event.button) {
    case 0:
      if (drag_state == 0) {
        if (Math.abs(drag_start.mouseX - x) > 25 || Math.abs(drag_start.mouseY - y) > 25) {
          drag_state = 1;
        }
      }

      if (drag_state == 1 && hover_block_id != -1) {
        movable_block = pullBlockById(screen_blocks, hover_block_id);
        drag_state = 2;
      }

      if (movable_block != null) {
        // Здесь должен быть код для обработки нажатия мыши на координатах (x, y)
        selected_block_id = -1;
        for (let i = 0; i < screen_blocks.length; i++) {
          let mouse_above = screen_blocks[i].isMouseAboveContainer(x, y);
          if (mouse_above != -1) {
            selected_block_id = mouse_above;
          }
        }
        movable_block.setPosition(x - mouse_offest.x, y - mouse_offest.y);
        draw_blocks();
      }
      break;
    case 1:
      break;
    case 2:
      break;
  }

});

canvas.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); }
