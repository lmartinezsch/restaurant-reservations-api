export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
  }
}

export class NoCapacityError extends DomainError {
  constructor(
    message: string = "No available table fits party size at requested time"
  ) {
    super(message);
  }
}

export class OutsideServiceWindowError extends DomainError {
  constructor(message: string = "Requested time is outside service window") {
    super(message);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
