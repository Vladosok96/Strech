
var ActionTypes = {
  FOR: 1,
  WHILE: 2,
  IF: 3,

  ASSIGN: 11,
  INC: 12,
  DEC: 13,
  OUTPUT: 14,
  INPUT: 15
}

// Суперкласс, родитель всех блоков, настоящий мужик
// Суперкласс он не потому что у него есть потомки, а потому что реально супер
class Block {
  constructor(id, x, y, name) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.name = name;
    this.width = 180;
    this.height = 40;
    this.color = [255, 100, 100, 255];
    this.isHover = false;
    this.isContainer = false;
    this.type = "Block";
  }

  // Метод для получения координат блока
  getPosition() {
    return {x: this.x, y: this.y};
  }

  // Перемещение
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // Рекурсивная функция обхода потомков
  traverse(callback) {
    callback(this);
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      child.traverse(callback);
    }
  }

  // Проверка наведения мыши на блок
  isMouseAbove(mouseX, mouseY, settings) {
    let result = -1;
    if (this.x <= mouseX && mouseX <= this.x + this.width && this.y <= mouseY && mouseY <= this.y + this.height) {
      result = {id: this.id, offset: {x: mouseX - this.x, y: mouseY - this.y}};
    }
    if (this.blocks != null) {
      if (this.blocks.length > 0) {
        for (let i = 0; i < this.blocks.length; i++) {
          let tmp_result = this.blocks[i].isMouseAbove(mouseX, mouseY, settings);
          if (tmp_result != -1) {
            result = tmp_result;
          }
        }
      }
    }
    return result;
  }

  isMouseAboveContainer(mouseX, mouseY) {
    return -1;
  }

  // Метод для отрисовки блока
  draw() {
    // Здесь должен быть код для отрисовки блока на экране
    setFillColorr(this.color)
    ctx.fillRect(this.x, this.y, this.width, this.height);
    if (this.isHover) {
      ctx.strokeStyle = "yellow";
    }
    else {
      ctx.strokeStyle = "black";
    }
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

// Наследник класса Block для блоков-контейнеров
class ContainerBlock extends Block {
  constructor(id, x, y, name) {
    super(id, x, y);
    this.color = [100, 100, 255, 255];
    this.name = name;
    this.blocks = []; // Коллекция вложенных блоков
    this.isContainer = true;
    this.type = "Container";
  }

  // Метод для добавления блока в коллекцию
  addBlock(block) {
    this.blocks.push(block);
  }

  // Метод для удаления блока из коллекции
  removeBlock(block) {
    const index = this.blocks.indexOf(block);
    if (index !== -1) {
      this.blocks.splice(index, 1);
    }
  }

  // Метод для складывания потомков над блоком
  moveChildrens() {
    let y_offset = 40;
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].setPosition(this.x + 40, this.y + y_offset);
      if (this.blocks[i].isContainer) {
        this.blocks[i].moveChildrens();
      }
      y_offset += this.blocks[i].height;
    }
    this.height = y_offset + 20;
  }

  // Метод для проверки наведения мыши на блок специально для контейнеров
  isMouseAboveContainer(mouseX, mouseY) {
    let result = -1;
    if (this.x <= mouseX && mouseX <= this.x + this.width && this.y <= mouseY && mouseY <= this.y + this.height) {
      result = this.id;
    }
    if (this.blocks.length > 0) {
      for (let i = 0; i < this.blocks.length; i++) {
        let tmp_result = this.blocks[i].isMouseAboveContainer(mouseX, mouseY);
        if (tmp_result != -1) {
          result = tmp_result;
        }
      }
    }
    return result;
  }

  // Метод для отрисовки блока-контейнера и всех вложенных блоков
  draw() {

    super.draw();
    for (let block of this.blocks) {
      block.draw(); // Отрисовка каждого вложенного блока
    }
  }
}

class ParentBlock extends ContainerBlock {
  // Метод для складывания потомков над блоком
  moveChildrens() {
    let y_offset = 0;
    for (let i = 0; i < this.blocks.length; i++) {
      this.blocks[i].setPosition(this.x, this.y + y_offset);
      if (this.blocks[i].isContainer) {
        this.blocks[i].moveChildrens();
      }
      y_offset += this.blocks[i].height;
    }
    this.height = y_offset;
  }

  // Метод для отрисовки блока-родителя с условием и телом
  draw() {

    super.draw();
    for (let block of this.blocks) {
      block.draw(); // Отрисовка каждого вложенного блока
    }
  }
}

// Наследник класса Block для блоков-исполнителей
class ExecutorBlock extends Block {
  constructor(id, x, y, name) {
    super(id, x, y, name);
    this.type = "Executor";
    this.action = "assign";
    this.variable = "";
    this.expression = "";
  }

  // Метод для выполнения действий блока-исполнителя
  execute() {
    // Здесь должен быть код для выполнения действий блока-исполнителя
  }

  // Метод для отрисовки блока-контейнера и всех вложенных блоков
  draw() {
    super.draw();
    if (this.type !== "Executor") return 1;

    setFillColorr([0, 0, 0, 0]);
    ctx.font = "20px Consolas";

    let output_condition = "";
    switch(this.action) {
      case "assign":
        output_condition = this.variable + " = " + this.expression;
        break;
      case "increment":
        output_condition = this.variable + "++";
        break;
      case "decrement":
        output_condition = this.variable + "--";
        break;
      case "print":
        output_condition = "print(" + this.expression + ")";
        break;
      case "scan":
        output_condition = "scan(" + this.variable + ")";
        break;
    }
    if (output_condition.length > 15) output_condition = output_condition.substring(0, 12) + "...";
    ctx.fillText(output_condition, this.x + 5, this.y + 25);
  }
}

class ConditionBlock extends ExecutorBlock {
  constructor(id, x, y, name, parent_id) {
    super(id, x, y);
    this.color = [255, 200, 100, 255];
    this.name = name;
    this.parent_id = parent_id;
    this.type = "Condition";
    this.condition = "True";
  }

  // Проверка наведения мыши на блок
  isMouseAbove(mouseX, mouseY, settings) {
    let result = -1;
    if (this.x <= mouseX && mouseX <= this.x + this.width && this.y <= mouseY && mouseY <= this.y + this.height) {
      result = {id: this.parent_id, offset: {x: mouseX - this.x, y: mouseY - this.y}};
      if (settings) {
        result = {id: this.id, offset: {x: mouseX - this.x, y: mouseY - this.y}};
      }
      else {
        result = {id: this.parent_id, offset: {x: mouseX - this.x, y: mouseY - this.y}};
      }
    }
    if (this.blocks != null) {
      if (this.blocks.length > 0) {
        for (let i = 0; i < this.blocks.length; i++) {
          let tmp_result = this.blocks[i].isMouseAbove(mouseX, mouseY);
          if (tmp_result != -1) {
            result = tmp_result;
          }
        }
      }
    }
    return result;
  }

  // Метод для отрисовки блока-контейнера и всех вложенных блоков
  draw() {
    super.draw();
    setFillColorr([0, 0, 0, 0]);
    ctx.font = "20px Consolas";
    let output_condition = this.condition;
    if (output_condition.length > 15) output_condition = output_condition.substring(0, 12) + "...";
    ctx.fillText(output_condition, this.x + 5, this.y + 25);
  }
}

class BodyBlock extends ContainerBlock {
  constructor(id, x, y, name, parent_id) {
    super(id, x, y);
    this.color = [100, 100, 255, 255];
    this.name = name;
    this.blocks = []; // Коллекция вложенных блоков
    this.isContainer = true;
    this.parent_id = parent_id;
    this.type = "Body";
    this.action = "if"
  }

  // Проверка наведения мыши на блок
  isMouseAbove(mouseX, mouseY, settings) {
    let result = -1;
    if (this.x <= mouseX && mouseX <= this.x + this.width && this.y <= mouseY && mouseY <= this.y + this.height) {
      if (settings) {
        result = {id: this.id, offset: {x: mouseX - this.x, y: mouseY - this.y + 40}};
      }
      else {
        result = {id: this.parent_id, offset: {x: mouseX - this.x, y: mouseY - this.y + 40}};
      }
    }
    if (this.blocks != null) {
      if (this.blocks.length > 0) {
        for (let i = 0; i < this.blocks.length; i++) {
          let tmp_result = this.blocks[i].isMouseAbove(mouseX, mouseY, settings);
          if (tmp_result != -1) {
            result = tmp_result;
          }
        }
      }
    }
    return result;
  }

  // Метод для отрисовки блока-контейнера и всех вложенных блоков
  draw() {
    super.draw();
    setFillColorr([0, 0, 0, 0]);
    ctx.font = "20px Consolas";
    ctx.fillText(this.action, this.x + 5, this.y + 23);
  }
}
