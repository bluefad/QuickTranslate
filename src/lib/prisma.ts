import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  // log: [
  //   { level: 'query', emit: 'stdout' },  // 记录所有的查询日志
  //   { level: 'info', emit: 'stdout' },   // 记录信息日志
  //   { level: 'warn', emit: 'stdout' },   // 记录警告日志
  //   { level: 'error', emit: 'stdout' },  // 记录错误日志
  // ],
});

export default prisma;
