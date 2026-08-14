const generateQuestion = (round = 1) => {
  let a, b, op;

  if (round <= 2) {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    op = Math.random() > 0.5 ? '+' : '-';
  } else if (round <= 5) {
    a = Math.floor(Math.random() * 50) + 1;
    b = Math.floor(Math.random() * 50) + 1;
    op = Math.random() > 0.5 ? '+' : '-';
  } else if (round <= 9) {
    const ops = ['+', '-', '*'];
    op = ops[Math.floor(Math.random() * ops.length)];
    a = op === '*' ? Math.floor(Math.random() * 12) + 2 : Math.floor(Math.random() * 50) + 1;
    b = op === '*' ? Math.floor(Math.random() * 12) + 2 : Math.floor(Math.random() * 50) + 1;
  } else {
    const ops = ['+', '-', '*', '/'];
    op = ops[Math.floor(Math.random() * ops.length)];
    if (op === '/') {
      b = Math.floor(Math.random() * 11) + 2;
      a = b * (Math.floor(Math.random() * 11) + 2);
    } else if (op === '*') {
      a = Math.floor(Math.random() * 15) + 2;
      b = Math.floor(Math.random() * 15) + 2;
    } else {
      a = Math.floor(Math.random() * 100) + 1;
      b = Math.floor(Math.random() * 100) + 1;
    }
  }

  let result;
  if (op === '+') result = a + b;
  else if (op === '-') result = a - b;
  else if (op === '*') result = a * b;
  else result = a / b;

  return {
    expression: `${a} ${op} ${b}`,
    answer: result,
    display: result,
  };
};

module.exports = { generateQuestion };
