using {sap.capire.bookshop as my} from '../db/schema';

service CatalogService @(path: '/catalog') {

  /** For displaying lists of Books */
  @readonly
  entity ListOfBooks as
    projection on Books
    excluding {
      descr
    };

  /** For display in details pages */
  @readonly
  entity Books       as
    projection on my.Books {
      *,
      author.name as author
    }
    excluding {
      createdBy,
      modifiedBy
    };

  @requires: 'authenticated-user'
  action submitOrder(book : Integer @mandatory,
                     quantity : Integer @mandatory
  )                                  returns {
    stock : Integer
  };

  @requires: 'authenticated-user'
  action updateBook(ID : Integer @mandatory,
                    title : String,
                    descr : String,
                    stock : Integer,
                    price : Decimal,
                    currency_code : String,
                    author : String) returns {
    message : String
  };

  @requires: 'authenticated-user'
  action addBook(title : String @mandatory,
                 descr : String,
                 stock : Integer @mandatory,
                 price : Decimal @mandatory,
                 currency_code : String @mandatory,
                 author : String @mandatory
  )                                  returns {
    ID      : Integer;
    message : String
  };

  event OrderedBook : {
    book     : Integer;
    quantity : Integer;
    buyer    : String
  };
}
