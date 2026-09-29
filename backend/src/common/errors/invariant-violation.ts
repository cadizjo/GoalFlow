// Custom error for invariant violations
export class InvariantViolation extends Error {
  constructor(message: string) {       // Define constructor for this subclass
    super(message)                     // Call the parent constructor and pass the message
    this.name = 'InvariantViolation'   // Set the error name
  }
}