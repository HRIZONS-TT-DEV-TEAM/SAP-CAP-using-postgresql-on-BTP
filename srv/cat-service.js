const cds = require('@sap/cds');

module.exports = class CatalogService extends cds.ApplicationService {
  init() {
    const { Books, Authors } = cds.entities('sap.capire.bookshop');

    // Custom handler for GET (Books)
    this.on('Books', async (req) => {
      const { ID } = req.data; // Check if a specific ID is requested
      if (ID) {
        const book = await SELECT.one.from(Books).where({ ID }).expand('author');
        if (!book) return req.error(404, `Book with ID ${ID} not found.`);
        return book;
      }
      return SELECT.from(Books).expand('author'); // Fetch all books with author info if no ID is provided
    });

    // Custom handler for updateBook action
    this.on('updateBook', async (req) => {
      const { ID, title, descr, stock, price, currency_code, author } = req.data;
      const book = await SELECT.one.from(Books).where({ ID });

      if (!book) return req.error(404, `Book with ID ${ID} not found.`);
      
      let author_ID = book.author_ID;
      if (author) {
        const authorEntity = await SELECT.one.from(Authors).where({ name: author });
        if (!authorEntity) return req.error(404, `Author with name "${author}" not found.`);
        author_ID = authorEntity.ID;
      }
      
      await UPDATE(Books)
        .set({ title, descr, stock, price, currency_code, author_ID })
        .where({ ID });
      
      return { message: `Book with ID ${ID} updated successfully.` };
    });

    // Custom handler for addBook action
    this.on('addBook', async (req) => {
      const { title, descr, stock, price, currency_code, author } = req.data;

      // Validate input data
      if (!title) return req.error(400, 'Title is required');
      if (!stock || stock < 0) return req.error(400, 'Valid stock quantity is required');
      if (!price || price <= 0) return req.error(400, 'Valid price is required');
      if (!currency_code) return req.error(400, 'Currency code is required');
      if (!author) return req.error(400, 'Author name is required');

      // Check if author exists
      const authorEntity = await SELECT.one.from(Authors).where({ name: author });
      if (!authorEntity) return req.error(404, `Author with name "${author}" not found.`);

      // Get the next available ID
      const { ID: maxID } = await SELECT.one.from(Books).columns('max(ID) as ID');
      const newID = (maxID || 0) + 1;

      // Create the new book
      await INSERT.into(Books).entries({
        ID: newID,
        title,
        descr,
        stock,
        price,
        currency_code,
        author_ID: authorEntity.ID
      });

      return {
        ID: newID,
        message: `Book "${title}" added successfully with ID ${newID}`
      };
    });

    // Add some discount for overstocked books
    this.after('each', Books, (book) => {
      if (book.stock > 111) book.title += ` -- 11% discount!`;
    });

    // Reduce stock of ordered books if available stock suffices
    // this.on('submitOrder', async (req) => {
    //   let { book: id, quantity } = req.data;
    //   let book = await SELECT.one.from(Books, id, (b) => b.stock);

    //   // Validate input data
    //   if (!book) return req.error(404, `Book #${id} doesn't exist`);
    //   if (quantity < 1) return req.error(400, `Quantity has to be 1 or more`);
    //   if (!book.stock || quantity > book.stock) return req.error(409, `${quantity} exceeds stock for book #${id}`);

    //   // Reduce stock in the database and return updated stock value
    //   await UPDATE(Books, id).with({ stock: (book.stock -= quantity) });
    //   return book;
    // });

    // // Emit event when an order has been submitted
    // this.after('submitOrder', async (_, req) => {
    //   let { book, quantity } = req.data;
    //   await this.emit('OrderedBook', { book, quantity, buyer: req.user.id });
    // });

    // Delegate requests to the underlying generic service
    return super.init();
  }
};