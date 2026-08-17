import 'reflect-metadata';

class PaginationQueryDto {}

class Test {
  findAll(query: PaginationQueryDto & { ativo?: string }) {}
}

const types = Reflect.getMetadata('design:paramtypes', Test.prototype, 'findAll');
console.log(types[0].name);
