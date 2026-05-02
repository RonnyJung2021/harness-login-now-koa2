class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} error
   * @param {string} message
   */
  constructor(status, error, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.error = error;
  }
}

module.exports = { HttpError };
