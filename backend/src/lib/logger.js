const write = (level, message, data = {}) => {
  const entry = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...data });
  process.stdout.write(entry + '\n');
};

export const logger = {
  info: (msg, data) => write('INFO', msg, data),
  warn: (msg, data) => write('WARN', msg, data),
  error: (msg, data) => write('ERROR', msg, data),
};
