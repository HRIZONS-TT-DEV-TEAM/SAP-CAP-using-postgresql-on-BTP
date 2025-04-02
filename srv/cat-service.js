const cds = require('@sap/cds');

module.exports = class CatalogService extends cds.ApplicationService {
  init() {
    const { Books } = cds.entities('sap.capire.bookshop');

    // Custom handler for GET (Books)
    this.on('Books', async (req) => {
      const { ID } = req.data; // Check if a specific ID is requested
      if (ID) {
        const book = await SELECT.one.from(Books).where({ ID });
        if (!book) return req.error(404, `Book with ID ${ID} not found.`);
        return book;
      }
      return SELECT.from(Books); // Fetch all books if no ID is provided
    });

    // Custom handler for PUT (book_update)
    this.on('Book_update', async (req) => {
      const { ID } = req.data; // Extract the key
      const payload = req.data; // Extract the data for update
      const book = await SELECT.one.from(Books).where({ ID });

      if (!book) return req.error(404, `Book with ID ${ID} not found.`);
      await UPDATE(Books).set(payload).where({ ID });
      return { message: `Book with ID ${ID} updated successfully.` };
    });

    // Add some discount for overstocked books
    this.after('each', Books, (book) => {
      if (book.stock > 111) book.title += ` -- 11% discount!`;
    });

    // Reduce stock of ordered books if available stock suffices
    this.on('submitOrder', async (req) => {
      let { book: id, quantity } = req.data;
      let book = await SELECT.one.from(Books, id, (b) => b.stock);

      // Validate input data
      if (!book) return req.error(404, `Book #${id} doesn't exist`);
      if (quantity < 1) return req.error(400, `Quantity has to be 1 or more`);
      if (!book.stock || quantity > book.stock) return req.error(409, `${quantity} exceeds stock for book #${id}`);

      // Reduce stock in the database and return updated stock value
      await UPDATE(Books, id).with({ stock: (book.stock -= quantity) });
      return book;
    });

    // Emit event when an order has been submitted
    this.after('submitOrder', async (_, req) => {
      let { book, quantity } = req.data;
      await this.emit('OrderedBook', { book, quantity, buyer: req.user.id });
    });

    // Delegate requests to the underlying generic service
    return super.init();
  }
};