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

// Функция для добавления блоков-исполнителей
function addExecutorBlock() {
  screen_blocks.push(new ExecutorBlock(block_id_counter, 100, 100, "Блок-исполнитель"));
  block_id_counter++;
  draw_blocks();
}

// Функция для добавления блоков-контейнеров, содержащих тело и условие,
// а может даже участок для выполнения в случае невыполнения условия
function addContainerBlock() {
  let parent_block = new ParentBlock(block_id_counter, 100, 100, "Блок-контейнер");
  parent_block.blocks.push(new ConditionBlock(block_id_counter + 1, 100, 100, "Условие", block_id_counter))
  parent_block.blocks.push(new BodyBlock(block_id_counter + 2, 100, 100, "Тело", block_id_counter))
  screen_blocks.push(parent_block);
  block_id_counter += 3;
  draw_blocks();
}

// Выделить блок желтой окантовкой по его id
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

// Применить изменения для блока по его id, используя введенные данные из боковой панели
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
        blocks[index].expression  = condition_expression;
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

// Снять выделение со всех блоков (если убирать выделение только с конкретного блока,
// из-за многопоточности могут остаться неубранные блоки)
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
