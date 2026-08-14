export function genQuestion(streak = 0) {
  let op, x, y;

  if (streak < 3) {
    op = Math.random() > 0.5 ? '+' : '-';
    x = Math.floor(Math.random() * 20) + 1;
    y = Math.floor(Math.random() * 20) + 1;
  } else if (streak < 6) {
    op = Math.random() > 0.5 ? '+' : '-';
    x = Math.floor(Math.random() * 50) + 1;
    y = Math.floor(Math.random() * 50) + 1;
  } else if (streak < 10) {
    const ops = ['+', '-', '*'];
    op = ops[Math.floor(Math.random() * ops.length)];
    x = op === '*' ? Math.floor(Math.random() * 12) + 2 : Math.floor(Math.random() * 50) + 1;
    y = op === '*' ? Math.floor(Math.random() * 12) + 2 : Math.floor(Math.random() * 50) + 1;
  } else {
    const ops = ['+', '-', '*', '/'];
    op = ops[Math.floor(Math.random() * ops.length)];
    if (op === '/') {
      y = Math.floor(Math.random() * 11) + 2;
      x = y * (Math.floor(Math.random() * 11) + 2);
    } else if (op === '*') {
      x = Math.floor(Math.random() * 15) + 2;
      y = Math.floor(Math.random() * 15) + 2;
    } else {
      x = Math.floor(Math.random() * 100) + 1;
      y = Math.floor(Math.random() * 100) + 1;
    }
  }

  const result = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y;
  return { expression: `${x} ${op} ${y}`, answer: result, display: result };
}
